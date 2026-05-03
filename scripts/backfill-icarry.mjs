/**
 * One-shot backfill script: retry iCarry shipment creation for any order whose
 * shipment_id is null. Safe to re-run — orders that already have a shipment_id
 * are skipped. Uses the service-role key, so do NOT ship to the client.
 *
 * Usage:  node scripts/backfill-icarry.mjs
 */
import pkg from "@next/env";
const { loadEnvConfig } = pkg;
loadEnvConfig(process.cwd());

import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
}
const supabase = createClient(url, key);

const stateMapping = {
    "Andhra Pradesh": "AP", "Arunachal Pradesh": "AR", "Assam": "AS",
    "Bihar": "BI", "Chandigarh": "CH", "Chattisgarh": "CG", "Delhi": "DE",
    "Goa": "GO", "Gujarat": "GU", "Haryana": "HA", "Himachal Pradesh": "HP",
    "Jammu and Kashmir": "JA", "Jharkhand": "JH", "Karnataka": "KA",
    "Kerala": "KE", "Ladakh": "LA", "Madhya Pradesh": "MP", "Maharashtra": "MA",
    "Manipur": "MN", "Meghalaya": "ME", "Mizoram": "MI", "Nagaland": "NA",
    "Odisha": "OD", "Puducherry": "PO", "Punjab": "PU", "Rajasthan": "RA",
    "Sikkim": "SI", "Tamil Nadu": "TN", "Telangana": "TS", "Tripura": "TR",
    "Uttar Pradesh": "UP", "Uttarakhand": "UK", "West Bengal": "WB",
};

const normalizePhone = (raw) => {
    const digits = String(raw || "").replace(/\D/g, "");
    if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
    if (digits.length === 11 && digits.startsWith("0")) return digits.slice(1);
    return digits.slice(-10);
};

let cachedToken = null;
async function getToken() {
    if (cachedToken && cachedToken.expiresAt > Date.now()) return cachedToken.token;
    const username = process.env.ICARRY_USERNAME;
    const apikey = process.env.ICARRY_KEY;
    const res = await fetch("https://www.icarry.in/api_login", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ username, Key: apikey }),
    });
    const j = await res.json();
    if (!j.api_token) throw new Error("iCarry login failed");
    cachedToken = { token: j.api_token, expiresAt: Date.now() + 23 * 3600 * 1000 };
    return cachedToken.token;
}

async function shipOne(order) {
    const shipping = typeof order.shipping_data === "string"
        ? JSON.parse(order.shipping_data)
        : (order.shipping_data || {});

    const phone = normalizePhone(shipping.phone);
    const pincode = String(shipping.pincode || "").replace(/\D/g, "").slice(0, 6);
    const fullName = String(shipping.fullName || "").trim();
    const city = String(shipping.city || "").trim();
    const addrParts = [shipping.houseNumber, shipping.area, shipping.landmark].filter(Boolean).map(s => String(s).trim()).filter(Boolean);
    const address = addrParts.join(", ") || city;

    if (!fullName || phone.length !== 10 || !/^[6-9]/.test(phone) || pincode.length !== 6 || !city || !address) {
        return { ok: false, reason: "invalid shipping data" };
    }

    const stateCode = stateMapping[shipping.state?.trim()] || "AP";
    const token = await getToken();

    const payload = new URLSearchParams();
    payload.append("pickup_address_id", process.env.ICARRY_PICKUP_ADDRESS_ID || "1");
    payload.append("client_order_id", String(order.id));
    payload.append("consignee[name]", fullName);
    payload.append("consignee[mobile]", phone);
    payload.append("consignee[address]", address);
    payload.append("consignee[city]", city);
    payload.append("consignee[pincode]", pincode);
    payload.append("consignee[state]", stateCode);
    payload.append("consignee[country_code]", "IN");
    payload.append("parcel[type]", order.payment_method === "online" ? "Prepaid" : "COD");
    payload.append("parcel[value]", String(Math.max(1, Number(order.total_amount) || 0)));
    payload.append("parcel[contents]", shipping.productTitle || "Vyra Herbals Product");
    payload.append("parcel[weight][weight]", "500");
    payload.append("parcel[weight][unit]", "gm");
    payload.append("parcel[dimensions][length]", "10");
    payload.append("parcel[dimensions][breadth]", "10");
    payload.append("parcel[dimensions][height]", "10");
    payload.append("parcel[dimensions][unit]", "cm");
    // Save the order without booking a courier (iCarry API doc v14 p14). Admin
    // assigns the courier manually from iCarry's dashboard.
    payload.append("save_only", "1");

    const res = await fetch(`https://www.icarry.in/api_add_shipment_surface?api_token=${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: payload,
    });
    const text = await res.text();
    let result;
    try { result = JSON.parse(text); }
    catch { return { ok: false, reason: `non-JSON response: ${text.slice(0, 120)}` }; }

    const errMsg = typeof result.error === "string" ? result.error.trim() : (result.error || "");
    const shipId = result.shipment_id || result.data?.shipment_id;
    const awb = result.awb || result.data?.awb;
    const courier = result.courier_name_full || result.data?.courier_name_full
        || result.courier_name || result.data?.courier_name || null;
    const labelUrl = result.label_url || result.data?.label_url || "";

    if (!errMsg && shipId) {
        return {
            ok: true,
            shipment_id: String(shipId),
            tracking_id: String(awb || shipId),
            awb_code: awb ? String(awb) : "",
            courier_name: courier ? String(courier) : "",
            label_url: String(labelUrl),
            // Always start at "Unassigned"; admin advances the status manually.
            delivery_status: "Unassigned",
        };
    }
    return { ok: false, reason: errMsg || "missing shipment_id" };
}

async function main() {
    // Only push orders that never reached iCarry. Orders with a shipment_id but
    // no awb_code are now expected — they're saved-but-not-booked entries waiting
    // for manual courier assignment in iCarry's UI.
    const { data: missing, error: e1 } = await supabase
        .from("orders")
        .select("*")
        .is("shipment_id", null)
        .neq("status", "Failed")
        .order("created_at", { ascending: false });
    if (e1) { console.error(e1); process.exit(1); }

    const orders = missing || [];
    console.log(`Missing iCarry shipment: ${orders.length}`);

    for (const order of orders) {
        const tag = order.shipment_id ? `re-book (was ${order.shipment_id})` : "first-time";
        process.stdout.write(`Order ${order.id} ${tag} (${order.payment_method}, ₹${order.total_amount}) ... `);
        try {
            const r = await shipOne(order);
            if (r.ok) {
                const { error: upErr } = await supabase.from("orders").update({
                    tracking_id: r.tracking_id,
                    shipment_id: r.shipment_id,
                    awb_code: r.awb_code,
                    courier_name: r.courier_name,
                    label_url: r.label_url,
                    delivery_status: r.delivery_status,
                }).eq("id", order.id);
                if (upErr) console.log(`DB update failed: ${upErr.message}`);
                else console.log(`OK shipment_id=${r.shipment_id} awb=${r.awb_code || '(none)'}`);
            } else {
                await supabase.from("orders").update({
                    delivery_status: `Sync Failed: ${r.reason}`.slice(0, 255),
                }).eq("id", order.id);
                console.log(`FAILED: ${r.reason}`);
            }
        } catch (e) {
            console.log(`EXCEPTION: ${e.message}`);
        }
        await new Promise((r) => setTimeout(r, 500));
    }
}
main().catch(e => { console.error(e); process.exit(1); });
