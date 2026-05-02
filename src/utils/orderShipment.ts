import { createShipment } from "./shipping";

type SyncResult =
    | { success: true; trackingId: string; shipmentId: string; alreadySynced?: boolean }
    | { success: false; message: string };

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

    if (order.shipment_id) {
        return {
            success: true,
            trackingId: order.tracking_id || order.awb_code || String(order.shipment_id),
            shipmentId: String(order.shipment_id),
            alreadySynced: true,
        };
    }

    try {
        const shipmentResult = await createShipment({
            id: order.id,
            shipping_data: order.shipping_data,
            payment_method: order.payment_method,
            total_amount: order.total_amount,
        });

        console.log(`[OrderShipment] iCarry result for order ${order.id}:`, shipmentResult);

        if (shipmentResult.success) {
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
