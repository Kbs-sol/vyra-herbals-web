import { NextResponse } from 'next/server';

// Temporary diagnostic. Hit GET /api/debug-db/icarry-ping?key=vyra-debug-2026
// from the deployed Vercel URL to see why iCarry sync isn't working in
// production. Delete this route once the cause is identified.

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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

    // Login worked. Don't actually create a shipment — just confirm the token is usable.
    return NextResponse.json({
        stage: 'login',
        ok: true,
        elapsedMs: loginElapsed,
        tokenPrefix: String(loginData.api_token).substring(0, 8) + '...',
        cfHeaders,
        envCheck,
    });
}
