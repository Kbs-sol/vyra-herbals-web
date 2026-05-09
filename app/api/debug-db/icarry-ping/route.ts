import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/utils/supabaseClient';
import { syncOrderShipment } from '@/utils/orderShipment';

// Temporary diagnostic. Hit GET /api/debug-db/icarry-ping?key=vyra-debug-2026
// from the deployed Vercel URL to see why iCarry sync isn't working in
// production. Delete this route once the cause is identified.
//
// Add ?mode=full to also exercise our syncOrderShipment utility against a
// throwaway order row, which mirrors what /api/payment/success does. The
// throwaway order is deleted before we return.

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const DEBUG_KEY = 'vyra-debug-2026';
const TIMEOUT_MS = 8000;

const fetchWithTimeout = async (url: string, init: RequestInit) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
        return await fetch(url, { ...init, signal: controller.signal });
    } finally {
        clearTimeout(timer);
    }
};

export async function GET(req: Request) {
    const url = new URL(req.url);
    if (url.searchParams.get('key') !== DEBUG_KEY) {
        return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    // ?check=<order_id> reads the row's delivery_status & shipment_id so we know
    // whether /api/payment/success even attempted iCarry sync for that order.
    const checkOrderId = url.searchParams.get('check');
    if (checkOrderId) {
        const supabase = createServerSupabase();
        const { data, error } = await supabase
            .from('orders')
            .select('id, order_id, status, delivery_status, shipment_id, awb_code, tracking_id, courier_name, txn_id, created_at, shipping_data')
            .eq('id', checkOrderId)
            .maybeSingle();
        if (error) return NextResponse.json({ ok: false, error: error.message });
        if (!data) return NextResponse.json({ ok: false, error: 'Order not found' });
        // Truncate shipping_data so the response stays readable.
        const sd = typeof data.shipping_data === 'string' ? data.shipping_data : JSON.stringify(data.shipping_data);
        return NextResponse.json({
            ok: true,
            id: data.id,
            order_id: data.order_id,
            status: data.status,
            delivery_status: data.delivery_status,
            shipment_id: data.shipment_id,
            awb_code: data.awb_code,
            tracking_id: data.tracking_id,
            courier_name: data.courier_name,
            txn_id: data.txn_id,
            created_at: data.created_at,
            shipping_data_snippet: sd ? sd.substring(0, 300) : null,
        });
    }

    const username = process.env.ICARRY_USERNAME;
    const key = process.env.ICARRY_KEY;
    const pickupId = process.env.ICARRY_PICKUP_ADDRESS_ID;

    const envCheck = {
        ICARRY_USERNAME_set: Boolean(username),
        ICARRY_USERNAME_length: username?.length || 0,
        ICARRY_KEY_set: Boolean(key),
        ICARRY_KEY_length: key?.length || 0,
        ICARRY_PICKUP_ADDRESS_ID_set: Boolean(pickupId),
        ICARRY_PICKUP_ADDRESS_ID_value: pickupId || null,
        VERCEL_REGION: process.env.VERCEL_REGION || null,
        VERCEL_URL: process.env.VERCEL_URL || null,
    };

    if (!username || !key) {
        return NextResponse.json({
            stage: 'env',
            ok: false,
            reason: 'iCarry credentials missing from environment — set ICARRY_USERNAME and ICARRY_KEY on Vercel',
            envCheck,
        });
    }

    // Step 1: try iCarry login
    const tStart = Date.now();
    let loginRes: Response;
    let loginBody = '';
    try {
        loginRes = await fetchWithTimeout('https://www.icarry.in/api_login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent':
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                Accept: 'application/json, text/plain, */*',
            },
            body: new URLSearchParams({ username, Key: key }),
        });
        loginBody = await loginRes.text();
    } catch (err) {
        return NextResponse.json({
            stage: 'login',
            ok: false,
            elapsedMs: Date.now() - tStart,
            error: (err as Error).message,
            isAbort: (err as any)?.name === 'AbortError',
            envCheck,
        });
    }

    const loginElapsed = Date.now() - tStart;
    const looksHtml = loginBody.includes('<!DOCTYPE') || loginBody.includes('<html');
    const cfHeaders = {
        'cf-ray': loginRes.headers.get('cf-ray'),
        'cf-cache-status': loginRes.headers.get('cf-cache-status'),
        server: loginRes.headers.get('server'),
    };

    if (looksHtml || loginRes.status >= 400) {
        return NextResponse.json({
            stage: 'login',
            ok: false,
            httpStatus: loginRes.status,
            elapsedMs: loginElapsed,
            looksHtml,
            cfHeaders,
            bodySnippet: loginBody.replace(/\s+/g, ' ').trim().substring(0, 400),
            envCheck,
        });
    }

    let loginData: any;
    try {
        loginData = JSON.parse(loginBody);
    } catch {
        return NextResponse.json({
            stage: 'login',
            ok: false,
            httpStatus: loginRes.status,
            elapsedMs: loginElapsed,
            error: 'login returned non-JSON',
            bodySnippet: loginBody.substring(0, 400),
            envCheck,
        });
    }

    if (!loginData.api_token) {
        return NextResponse.json({
            stage: 'login',
            ok: false,
            elapsedMs: loginElapsed,
            response: loginData,
            envCheck,
        });
    }

    // Login worked. Now stress-test the actual /api/payment/success path: try a
    // save_only=1 shipment with a known-good payload so we know whether the
    // failure is in createShipment, not just the login round-trip.
    const apiToken = loginData.api_token as string;
    const shipmentStart = Date.now();
    const payload = new URLSearchParams();
    payload.append('pickup_address_id', pickupId || '27914');
    payload.append('client_order_id', `DEBUG-PING-${Date.now()}`);
    payload.append('consignee[name]', 'DebugPing');
    payload.append('consignee[mobile]', '9876543210');
    payload.append('consignee[address]', 'Debug addr');
    payload.append('consignee[city]', 'Bhubaneswar');
    payload.append('consignee[pincode]', '751001');
    payload.append('consignee[state]', 'OD');
    payload.append('consignee[country_code]', 'IN');
    payload.append('parcel[type]', 'Prepaid');
    payload.append('parcel[value]', '1');
    payload.append('parcel[contents]', 'Debug ping payload');
    payload.append('parcel[weight][weight]', '500');
    payload.append('parcel[weight][unit]', 'gm');
    payload.append('parcel[dimensions][length]', '10');
    payload.append('parcel[dimensions][breadth]', '10');
    payload.append('parcel[dimensions][height]', '10');
    payload.append('parcel[dimensions][unit]', 'cm');
    payload.append('save_only', '1');

    let shipmentRes: Response;
    let shipmentBody = '';
    try {
        shipmentRes = await fetchWithTimeout(
            `https://www.icarry.in/api_add_shipment_surface?api_token=${apiToken}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'User-Agent':
                        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    Accept: 'application/json, text/plain, */*',
                },
                body: payload,
            },
        );
        shipmentBody = await shipmentRes.text();
    } catch (err) {
        return NextResponse.json({
            stage: 'shipment',
            ok: false,
            loginElapsedMs: loginElapsed,
            shipmentElapsedMs: Date.now() - shipmentStart,
            error: (err as Error).message,
            isAbort: (err as any)?.name === 'AbortError',
            envCheck,
        });
    }

    const shipmentElapsed = Date.now() - shipmentStart;
    let parsedBody: any = null;
    try {
        parsedBody = JSON.parse(shipmentBody);
    } catch {
        // not JSON
    }

    const rawShipmentResult = {
        stage: 'shipment',
        ok: shipmentRes.ok && Boolean(parsedBody?.shipment_id || parsedBody?.success),
        loginElapsedMs: loginElapsed,
        shipmentElapsedMs: shipmentElapsed,
        shipmentHttpStatus: shipmentRes.status,
        shipmentResponse: parsedBody ?? shipmentBody.substring(0, 400),
        cfHeaders: {
            'cf-ray': shipmentRes.headers.get('cf-ray'),
            server: shipmentRes.headers.get('server'),
        },
        envCheck,
    };

    // ?mode=full also exercises our actual syncOrderShipment utility (the same
    // one /api/payment/success calls). It inserts a throwaway order row, runs
    // sync, then deletes the row regardless of outcome. Use a server-side ID
    // far away from real timestamps so it can't collide.
    const mode = url.searchParams.get('mode');
    if (mode !== 'full') {
        return NextResponse.json(rawShipmentResult);
    }

    const supabase = createServerSupabase();
    const fakeOrderId = -1 * Date.now(); // negative ID = obviously synthetic
    const fakeOrder = {
        id: fakeOrderId,
        order_id: `DEBUG-PING-ORD-${Date.now()}`,
        items: [{ id: 'debug', title: 'Debug ping', price: 1, quantity: 1 }],
        total_amount: 1,
        transaction_price: 1,
        shipping_data: {
            fullName: 'DebugPingFull',
            phone: '9876543210',
            email: 'debug@vyraherbals.com',
            houseNumber: '32-75',
            area: 'Debug area',
            landmark: 'Debug landmark',
            pincode: '751001',
            city: 'Bhubaneswar',
            state: 'Odisha',
            country: 'India',
            productTitle: '1XDebug',
        },
        payment_method: 'online',
        status: 'placed',
        delivery_status: 'Pending Sync',
        user_id: null,
        created_at: new Date().toISOString(),
        order_date: new Date().toISOString(),
    };

    const utilityStart = Date.now();
    let insertError: any = null;
    let syncResult: any = null;
    let utilityException: any = null;
    try {
        const { error } = await supabase.from('orders').insert([fakeOrder]).select().single();
        insertError = error?.message || null;
        if (!error) {
            syncResult = await syncOrderShipment(supabase, fakeOrder);
        }
    } catch (e) {
        utilityException = (e as Error).message;
    } finally {
        await supabase.from('orders').delete().eq('id', fakeOrderId);
    }

    return NextResponse.json({
        ...rawShipmentResult,
        utility: {
            elapsedMs: Date.now() - utilityStart,
            insertError,
            syncResult,
            utilityException,
        },
    });
}
