import { createShipment } from "./shipping";
import { notifyShipmentCreated } from "@/services/communications/integration/orderNotifications";

type SyncResult =
    | { success: true; trackingId: string; shipmentId: string; alreadySynced?: boolean }
    | { success: false; message: string };

// Hard ceiling on the entire iCarry sync call. Internal fetches in shipping.ts
// have their own AbortControllers (5s token, 10s shipment, +1s retry backoff),
// so 24s is "everything went wrong but we still gave up cleanly" — well under
// Vercel's 30s function budget.
const SYNC_HARD_TIMEOUT_MS = 24000;

const withTimeout = <T,>(promise: Promise<T>, ms: number, label: string): Promise<T> => {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            reject(new Error(`${label} exceeded ${ms}ms ceiling`));
        }, ms);
        promise.then(
            (value) => { clearTimeout(timer); resolve(value); },
            (err) => { clearTimeout(timer); reject(err); }
        );
    });
};

/**
 * Create or retry an iCarry shipment for an order and persist the result.
 *
 * Always leaves a row whose delivery_status reflects the latest attempt:
 *   - "Unassigned" (or whatever iCarry returned) on success
 *   - "Sync Failed: <reason>" on failure
 *   - "Pending Sync" if the call could not even be attempted
 */
export const syncOrderShipment = async (supabase: any, order: any): Promise<SyncResult> => {
    if (!order || !order.id) {
        return { success: false, message: "Missing order" };
    }

    // Skip if iCarry already has this order. We send save_only=1, so a freshly
    // created shipment has no AWB yet — that's normal until admin picks a courier
    // in iCarry's UI. Re-syncing on missing AWB would create duplicate iCarry rows.
    if (order.shipment_id) {
        return {
            success: true,
            trackingId: order.tracking_id || order.awb_code || String(order.shipment_id),
            shipmentId: String(order.shipment_id),
            alreadySynced: true,
        };
    }

    // Race guard: the caller's `order` snapshot may be stale. The success handler
    // hits this path right after INSERT, but the profile-page retry can fire on
    // the same order milliseconds later if the success handler timed out. Check
    // the live row to avoid double-booking on iCarry's end.
    try {
        const { data: latest } = await supabase
            .from('orders')
            .select('shipment_id, tracking_id, awb_code')
            .eq('id', order.id)
            .maybeSingle();
        if (latest?.shipment_id) {
            return {
                success: true,
                trackingId: latest.tracking_id || latest.awb_code || String(latest.shipment_id),
                shipmentId: String(latest.shipment_id),
                alreadySynced: true,
            };
        }
    } catch {
        // If the DB read fails, fall through and let createShipment handle it —
        // worst case we get one duplicate, far better than failing the sync entirely.
    }

    try {
        const shipmentResult = await withTimeout(
            createShipment({
                id: order.id,
                shipping_data: order.shipping_data,
                payment_method: order.payment_method,
                total_amount: order.total_amount,
                // Advance already paid online — createShipment subtracts it to
                // get the COD amount the courier must collect.
                transaction_price: order.transaction_price,
            }),
            SYNC_HARD_TIMEOUT_MS,
            `iCarry sync for order ${order.id}`
        );

        console.log(`[OrderShipment] iCarry result for order ${order.id}:`, shipmentResult);

        if (shipmentResult.success) {
            if (shipmentResult.assign_error) {
                // iCarry has the order, but no courier is on it. Only a human can
                // clear this (iCarry dashboard), so make it findable in the logs.
                console.error(
                    `[OrderShipment] Order ${order.id} is UNASSIGNED on iCarry — auto-assign failed: ${shipmentResult.assign_error}`
                );
            }
            const trackingId = shipmentResult.trackingId || '';
            const { error: updateError } = await supabase.from('orders').update({
                tracking_id: trackingId,
                shipment_id: shipmentResult.shipment_id || null,
                awb_code: shipmentResult.awb_code || null,
                courier_name: shipmentResult.courier_name || null,
                label_url: shipmentResult.label_url || null,
                delivery_status: shipmentResult.delivery_status || 'Unassigned',
            }).eq('id', order.id);

            if (updateError) {
                console.error(`[OrderShipment] DB update failed for order ${order.id}:`, updateError);
                return { success: false, message: `DB update failed: ${updateError.message}` };
            }

            // Tell the customer their parcel is on its way. Only actually
            // sends when iCarry issued a real AWB — the usual save_only case
            // has no courier yet, so this is a no-op there and adds no latency
            // to the checkout request. Never throws.
            //
            // A raw automationEngine.emit({type:'SHIPMENT_CREATED'}) used to run
            // here as well. It fired on EVERY successful save, including the
            // save_only case with no courier assigned — so the customer got a
            // "shipped via  , tracking <internal shipment id>" message with
            // blank fields, and the event was raised twice per shipment.
            await notifyShipmentCreated(order, {
                trackingId,
                awb_code: shipmentResult.awb_code,
                courier_name: shipmentResult.courier_name,
            });

            return {
                success: true,
                trackingId,
                shipmentId: String(shipmentResult.shipment_id || ''),
            };
        }

        const reason = (shipmentResult.message || 'unknown error');
        await supabase.from('orders').update({
            delivery_status: `Sync Failed: ${reason}`.slice(0, 255)
        }).eq('id', order.id);
        return { success: false, message: reason };
    } catch (err) {
        const reason = (err as Error).message || 'exception';
        console.error(`[OrderShipment] Exception for order ${order.id}:`, err);
        await supabase.from('orders').update({
            delivery_status: `Sync Failed: ${reason}`.slice(0, 255)
        }).eq('id', order.id);
        return { success: false, message: reason };
    }
};
