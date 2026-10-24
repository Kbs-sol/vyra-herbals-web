/**
 * Shipping Utility for iCarry.in Integration
 */

let cachedToken: { token: string; expiresAt: number } | null = null;

export const stateMapping: Record<string, string> = {
    "Andaman and Nicobar Islands": "AN",
    "Andhra Pradesh": "AP",
    "Arunachal Pradesh": "AR",
    "Assam": "AS",
    "Bihar": "BI",
    "Chandigarh": "CH",
    "Dadra and Nagar Haveli": "DA",
    "Daman and Diu": "DM",
    "Delhi": "DE",
    "Goa": "GO",
    "Gujarat": "GU",
    "Haryana": "HA",
    "Himachal Pradesh": "HP",
    "Jammu and Kashmir": "JA",
    "Karnataka": "KA",
    "Kerala": "KE",
    "Lakshadweep Islands": "LI",
    "Madhya Pradesh": "MP",
    "Maharashtra": "MA",
    "Manipur": "MN",
    "Meghalaya": "ME",
    "Mizoram": "MI",
    "Nagaland": "NA",
    "Odisha": "OD",
    "Puducherry": "PO",
    "Punjab": "PU",
    "Rajasthan": "RA",
    "Sikkim": "SI",
    "Tamil Nadu": "TN",
    "Tripura": "TR",
    "Uttar Pradesh": "UP",
    "West Bengal": "WB",
    "Telangana": "TS",
    "Jharkhand": "JH",
    "Uttarakhand": "UK",
    "Chattisgarh": "CG",
    "Ladakh": "LA",
};

export type IcarryTokenResult = { token: string | null; reason?: string };

// Worst-case budget on Vercel is 30s for /api/payment/success. Token (5s + 1s
// backoff + 5s retry = 11s) + shipment (10s) = 21s leaves ~9s headroom for
// cold-start, Supabase reads, and the redirect itself. Don't widen these
// without also bumping vercel.json maxDuration.
const ICARRY_TOKEN_FETCH_TIMEOUT_MS = 5000;

// Advance collected online for a COD order (mirrors the ₹100 charged in
// Checkout). Used to derive the amount the courier still has to collect.
const COD_ADVANCE_DEFAULT = 100;

// COD handling fee added to the order total at checkout (mirrors COD_Charges in
// src/constants.ts). It is our fee, not part of the declared goods value, so it
// is excluded from the iCarry invoice value.
const COD_HANDLING_FEE = 50;
const ICARRY_TOKEN_MAX_RETRIES = 1;

const fetchWithTimeout = async (url: string, init: RequestInit, timeoutMs: number) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        return await fetch(url, { ...init, signal: controller.signal });
    } finally {
        clearTimeout(timer);
    }
};

export const getIcarryTokenDetailed = async (retryCount = 0): Promise<IcarryTokenResult> => {
    // Return cached token if still valid (cache for 23 hours)
    if (cachedToken && cachedToken.expiresAt > Date.now()) {
        return { token: cachedToken.token };
    }

    const username = process.env.ICARRY_USERNAME;
    const key = process.env.ICARRY_KEY;

    if (!username || !key) {
        console.error("iCarry.in credentials missing");
        return { token: null, reason: "iCarry credentials missing on server" };
    }

    try {
        const loginRes = await fetchWithTimeout("https://www.icarry.in/api_login", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept": "application/json, text/plain, */*",
                "Accept-Language": "en-US,en;q=0.9",
                "Referer": "https://www.icarry.in/",
                "Origin": "https://www.icarry.in",
                "Connection": "keep-alive",
            },
            body: new URLSearchParams({ username, Key: key }),
        }, ICARRY_TOKEN_FETCH_TIMEOUT_MS);

        const text = await loginRes.text();

        // Cloudflare / error HTML response. One retry only — going further blows
        // the 30s function budget when chained with the shipment call.
        const looksHtml = text.includes("<!DOCTYPE") || text.includes("<html");
        if (looksHtml || loginRes.status >= 400) {
            if (retryCount < ICARRY_TOKEN_MAX_RETRIES) {
                await new Promise(resolve => setTimeout(resolve, 1000));
                return getIcarryTokenDetailed(retryCount + 1);
            }
            const snippet = text.replace(/\s+/g, " ").trim().substring(0, 160);
            console.error(`iCarry token fetch failed after retries. Status: ${loginRes.status}. Body: ${snippet}`);
            return { token: null, reason: `iCarry login refused (status ${loginRes.status})` };
        }

        try {
            const loginData = JSON.parse(text);
            if (loginData.api_token) {
                cachedToken = {
                    token: loginData.api_token,
                    expiresAt: Date.now() + 23 * 60 * 60 * 1000
                };
                return { token: loginData.api_token };
            }
            const reason = loginData?.error || loginData?.message || "iCarry response missing api_token";
            console.error("iCarry login rejected:", loginData);
            return { token: null, reason: String(reason) };
        } catch (parseError) {
            console.error("iCarry token error (Not JSON):", text.substring(0, 200));
            return { token: null, reason: "iCarry returned a non-JSON response" };
        }
    } catch (err) {
        const isAbort = (err as any)?.name === 'AbortError';
        console.error("iCarry token fetch error:", err);
        return { token: null, reason: isAbort ? "iCarry login timed out" : `iCarry login error: ${(err as Error).message}` };
    }
};

export const getIcarryToken = async (retryCount = 0): Promise<string | null> => {
    const result = await getIcarryTokenDetailed(retryCount);
    return result.token;
};

// iCarry rejects phones with "+91", leading 0, spaces, or non-digit characters.
// Strip everything down to a clean 10-digit mobile.
const normalizePhone = (raw: string): string => {
    const digits = String(raw || "").replace(/\D/g, "");
    if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
    if (digits.length === 11 && digits.startsWith("0")) return digits.slice(1);
    return digits.slice(-10);
};

const normalizePincode = (raw: string): string =>
    String(raw || "").replace(/\D/g, "").slice(0, 6);

const buildAddress = (shippingData: any): string => {
    const parts = [shippingData.houseNumber, shippingData.area, shippingData.landmark]
        .map((p) => String(p || "").trim())
        .filter(Boolean);
    const joined = parts.join(", ");
    // iCarry requires a meaningful address. Fall back to city so the request is accepted.
    return joined || String(shippingData.city || "").trim();
};

const ICARRY_SHIPMENT_TIMEOUT_MS = 10000;
const ICARRY_ESTIMATE_TIMEOUT_MS = 6000;

// Whole-of-createShipment time budget. Callers cap us at 24s (orderShipment)
// / 25s (finalizeOrderFromSession) inside a 30s Vercel function, so we keep our
// own work under 21s and always hold SAVE_ONLY_RESERVE_MS back for the final
// save-only attempt. An order that lands on iCarry Unassigned is recoverable by
// admin in one click; an order that never reaches iCarry at all is invisible.
const CREATE_SHIPMENT_BUDGET_MS = 21000;
const SAVE_ONLY_RESERVE_MS = 7000;

// How many auto-assign couriers to try before falling back to save-only. iCarry's
// estimate API can list a courier that its booking API then rejects (e.g.
// "Pincode not serviceable."), so one rejection must not sink the whole booking.
// We walk the ranked list cheapest-first and keep going to the next available
// courier; the real limiter is the time budget below, not this cap. Two was too
// low — on pincodes where the two cheapest both refuse, the order fell through to
// Unassigned even though a third serviceable courier was sitting in the estimate.
const MAX_COURIER_ATTEMPTS = Math.max(
    1,
    parseInt(process.env.ICARRY_MAX_COURIER_ATTEMPTS || "5", 10) || 5
);

// Booking errors that are about the ACCOUNT, not the courier — wallet balance,
// unbilled shipments, weight-discrepancy holds. Retrying the next courier just
// burns the time budget, so we stop and save-only immediately (and shout in the
// logs, because this is the one failure mode only a human can clear).
const isAccountLevelError = (message: string): boolean =>
    /balance|unbilled|top ?up|topup|recharge|wallet|insufficient|discrepancy|kyc|suspend/i.test(message);

// Sender pincode for iCarry's rate/serviceability lookup. This is the registered
// pickup address (Mandamarri, Telangana - 504231). Override via env if the
// pickup location ever changes — it must match the pincode of the pickup
// address referenced by ICARRY_PICKUP_ADDRESS_ID.
const ICARRY_ORIGIN_PINCODE = (process.env.ICARRY_ORIGIN_PINCODE || "504231").replace(/\D/g, "").slice(0, 6);

// Preferred couriers in priority order, used when cheapest-selection can't rank a
// courier (no readable rate) or is switched off. Amazon Shipping is included
// because some pincodes — e.g. 572106 Tumkur — are serviced by Amazon and nobody
// else; without it those orders get no auto-assignment at all. If none of these
// are serviceable (or the estimate call fails) the order is saved Unassigned for
// manual assignment from iCarry's dashboard, exactly as before.
const ICARRY_COURIER_PRIORITY = (process.env.ICARRY_COURIER_PRIORITY || "Xpressbees,Delhivery,Amazon Shipping")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

// Master switch for auto-assignment. Set ICARRY_BOOK_ON_CREATE=false to instantly
// revert to the previous "save Unassigned, assign courier manually" behaviour
// without a code deploy. Any other value (including unset) keeps auto-assign on.
const isAutoAssignEnabled = (): boolean => process.env.ICARRY_BOOK_ON_CREATE !== "false";

// When on (the default), we auto-assign the CHEAPEST serviceable courier from
// iCarry's estimate instead of walking the fixed priority list. Set
// ICARRY_SELECT_CHEAPEST=false to fall back to priority-order selection.
const isCheapestEnabled = (): boolean => process.env.ICARRY_SELECT_CHEAPEST !== "false";

type CourierEstimate = {
    courier_id?: string | number;
    courier_name?: string;
    courier_group_name?: string;
    // iCarry returns the rate under one of several undocumented keys; keep the
    // shape open so getCourierRate() can probe them.
    [key: string]: any;
};

// What iCarry actually returns per courier (observed on api_get_estimate):
//   { courier_id, courier_name, courier_group_name,
//     freight_cost: "39.10", cod_cost: "0.00", rto_cost: "39.10", courier_cost: "39.10" }
// `courier_cost` is the all-in figure when present; otherwise the payable cost is
// freight + COD handling (rto_cost only applies to a return, so it is NOT added).
// The remaining names are defensive — iCarry has changed these keys before, and a
// rate we can't read silently disables cheapest-courier selection.
const COURIER_RATE_FIELDS = [
    "courier_cost", "rate", "total_charges", "total_charge", "total_amount", "total",
    "chargeable_amount", "net_charges", "net_charge", "final_charge", "final_charges",
    "grand_total", "price", "amount", "charges", "charge", "cost", "estimated_cost",
];

// Components summed only when no all-in total is available.
const COURIER_FREIGHT_FIELDS = ["freight_cost", "freight_charge", "freight_charges"];
const COURIER_COD_FIELDS = ["cod_cost", "cod_charge", "cod_charges"];

const toAmount = (raw: any): number | null => {
    if (raw === undefined || raw === null || raw === "") return null;
    const num = typeof raw === "number" ? raw : parseFloat(String(raw).replace(/[^\d.]/g, ""));
    return Number.isFinite(num) ? num : null;
};

const pickAmount = (c: CourierEstimate, keys: string[]): number | null => {
    for (const key of keys) {
        const num = toAmount(c?.[key]);
        if (num !== null && num > 0) return num;
    }
    return null;
};

const getCourierRate = (c: CourierEstimate): number | null => {
    const total = pickAmount(c, COURIER_RATE_FIELDS);
    if (total !== null) return total;

    const freight = pickAmount(c, COURIER_FREIGHT_FIELDS);
    if (freight === null) return null;
    // COD handling is a real cost on COD parcels; treat a missing/zero value as 0.
    return freight + (pickAmount(c, COURIER_COD_FIELDS) ?? 0);
};

// Same browser-like headers iCarry's WAF expects on the other endpoints.
const ICARRY_REQUEST_HEADERS = {
    "Content-Type": "application/x-www-form-urlencoded",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
};

/**
 * Read-only: ask iCarry which couriers can service this parcel and at what cost.
 * Returns [] on any failure (timeout, WAF block, non-JSON) so the caller can
 * fall back to saving the order Unassigned. The weight/dimensions passed here
 * MUST match the booking payload — iCarry's returned courier_id is tied to the
 * weight slab, and booking with a mismatched weight can reject the courier.
 */
const getCourierEstimate = async (
    apiToken: string,
    args: {
        destinationPincode: string;
        weightGm: number;
        lengthCm: number;
        breadthCm: number;
        heightCm: number;
        shipmentType: "P" | "C"; // P = Prepaid, C = COD
        value: number;
    },
    timeoutMs: number = ICARRY_ESTIMATE_TIMEOUT_MS
): Promise<CourierEstimate[]> => {
    try {
        const body = new URLSearchParams({
            length: String(args.lengthCm),
            breadth: String(args.breadthCm),
            height: String(args.heightCm),
            weight: String(args.weightGm),
            destination_pincode: args.destinationPincode,
            origin_pincode: ICARRY_ORIGIN_PINCODE,
            destination_country_code: "IN",
            origin_country_code: "IN",
            shipment_mode: "S", // Surface (matches api_add_shipment_surface)
            shipment_type: args.shipmentType,
            shipment_value: String(args.value),
        });

        const res = await fetchWithTimeout(
            `https://www.icarry.in/api_get_estimate?api_token=${apiToken}`,
            { method: "POST", headers: ICARRY_REQUEST_HEADERS, body },
            timeoutMs
        );
        const text = await res.text();
        if (text.includes("<!DOCTYPE") || text.includes("<html")) {
            console.warn("iCarry estimate returned HTML (WAF block); will save order Unassigned");
            return [];
        }
        const json = JSON.parse(text);
        const list = json?.estimate || json?.data?.estimate || [];
        return Array.isArray(list) ? list : [];
    } catch (e) {
        const isAbort = (e as any)?.name === "AbortError";
        console.warn(`iCarry estimate lookup failed (${isAbort ? "timeout" : (e as Error).message}); will save order Unassigned`);
        return [];
    }
};

type CourierCandidate = { courierId: string; group: string; rate: number | null };

/**
 * Rank the serviceable couriers we're willing to auto-assign, best first.
 *
 * Cheapest-priced couriers lead (unless ICARRY_SELECT_CHEAPEST=false), then the
 * fixed priority list (Xpressbees → Delhivery) picks up anything the rate probe
 * couldn't price. Duplicates are dropped by courier_id, and couriers without a
 * usable courier_id are excluded — iCarry needs that id to book.
 *
 * A *list* rather than a single pick, because iCarry's estimate API happily
 * returns couriers that its booking API then refuses for the same pincode. The
 * caller walks this list so a refusal costs one retry, not the whole shipment.
 */
const rankCourierCandidates = (estimate: CourierEstimate[]): CourierCandidate[] => {
    const usable = estimate.filter(
        (c) => c.courier_id !== undefined && c.courier_id !== null && String(c.courier_id) !== ""
    );

    const seen = new Set<string>();
    const ranked: CourierCandidate[] = [];
    const push = (c: CourierEstimate, rate: number | null) => {
        const id = String(c.courier_id);
        if (seen.has(id)) return;
        seen.add(id);
        ranked.push({ courierId: id, group: c.courier_group_name || c.courier_name || "", rate });
    };

    if (isCheapestEnabled()) {
        usable
            .map((c) => ({ c, rate: getCourierRate(c) }))
            .filter((x): x is { c: CourierEstimate; rate: number } => x.rate !== null)
            .sort((a, b) => a.rate - b.rate)
            .forEach((x) => push(x.c, x.rate));
    }

    // Priority order fills the tail: couriers the estimate left unpriced, and —
    // when ICARRY_SELECT_CHEAPEST=false — the whole list in preference order.
    // Matches on group name and full name, so "Xpressbees Surface 0.5Kg" counts.
    for (const pref of ICARRY_COURIER_PRIORITY) {
        const needle = pref.toLowerCase();
        for (const c of usable) {
            if (`${c.courier_group_name || ""} ${c.courier_name || ""}`.toLowerCase().includes(needle)) {
                push(c, getCourierRate(c));
            }
        }
    }

    return ranked;
};

type ShipmentAttempt =
    | { ok: true; shipmentId: string; awb: string; courierName: string; labelUrl: string; raw: any }
    | { ok: false; message: string; timedOut: boolean };

/**
 * One POST to iCarry's booking endpoint. `payload` decides the mode: a
 * `courier_id` books and returns an AWB, `save_only=1` parks the order in
 * iCarry's dashboard for manual assignment.
 */
const attemptShipment = async (
    apiToken: string,
    payload: URLSearchParams,
    timeoutMs: number
): Promise<ShipmentAttempt> => {
    const apiUrl = `https://www.icarry.in/api_add_shipment_surface?api_token=${apiToken}`;

    console.log("iCarry.in Request:", { url: apiUrl, payload: Object.fromEntries(payload.entries()) });

    let response: Response;
    try {
        response = await fetchWithTimeout(
            apiUrl,
            { method: "POST", headers: ICARRY_REQUEST_HEADERS, body: payload },
            timeoutMs
        );
    } catch (e) {
        const isAbort = (e as any)?.name === "AbortError";
        return {
            ok: false,
            timedOut: isAbort,
            message: isAbort
                ? "iCarry shipment call timed out"
                : `iCarry shipment call failed: ${(e as Error).message}`,
        };
    }

    const textResponse = await response.text();
    let result: any;
    try {
        result = JSON.parse(textResponse);
    } catch {
        console.error("iCarry.in Result Error (Not JSON):", textResponse.substring(0, 150));
        return { ok: false, timedOut: false, message: "Invalid API response from shipping provider" };
    }

    console.log("iCarry.in Result:", result);

    const resultData = result?.data || result;
    const shipmentId = resultData?.shipment_id || result?.shipment_id;
    const awb = resultData?.awb || result?.awb;
    const courierName = resultData?.courier_name || result?.courier_name || null;
    const labelUrl = resultData?.label_url || result?.label_url || "";

    // iCarry returns `success` as a human-readable string (e.g. "Success: You have added a new
    // shipment with id 352. | ...") on the shipment endpoints, and `error` as an empty string.
    // Treat the call as successful when an error message is absent and a shipment_id is returned.
    const errorMessage = typeof result?.error === "string" ? result.error.trim() : (result?.error || "");
    const successField = result?.success;
    const successString =
        typeof successField === "string" && successField.trim().toLowerCase().startsWith("success");
    const isSuccess =
        !errorMessage &&
        (successField === true ||
            successField === 1 ||
            successField === "1" ||
            successString ||
            Boolean(shipmentId));

    if (isSuccess && shipmentId) {
        // iCarry sometimes nests the courier full name under `courier_name_full`.
        const courierFull = resultData?.courier_name_full || result?.courier_name_full || null;
        return {
            ok: true,
            shipmentId: String(shipmentId),
            awb: awb ? String(awb) : "",
            courierName: String(courierFull || courierName || ""),
            labelUrl: String(labelUrl),
            raw: result,
        };
    }

    return { ok: false, timedOut: false, message: String(errorMessage || "Shipment creation failed") };
};

export type CreateShipmentResult =
    | {
        success: true;
        trackingId: string;
        shipment_id: string;
        awb_code: string;
        courier_name: string;
        label_url: string;
        delivery_status: string;
        data: any;
        // Set only when the order had to be saved Unassigned: why auto-assign
        // could not book a courier. Success from iCarry's point of view, but
        // something a human still needs to see.
        assign_error?: string;
    }
    | { success: false; message: string };

export const createShipment = async (orderData: any): Promise<CreateShipmentResult> => {
    const deadline = Date.now() + CREATE_SHIPMENT_BUDGET_MS;
    const remaining = () => deadline - Date.now();

    try {
        const tokenResult = await getIcarryTokenDetailed();
        const apiToken = tokenResult.token;
        if (!apiToken) {
            return { success: false, message: tokenResult.reason || "Shipping authentication failed" };
        }

        const shippingData = typeof orderData.shipping_data === 'string'
            ? JSON.parse(orderData.shipping_data)
            : (orderData.shipping_data || {});

        const phone = normalizePhone(shippingData.phone);
        const pincode = normalizePincode(shippingData.pincode);
        const fullName = String(shippingData.fullName || "").trim();
        const city = String(shippingData.city || "").trim();
        const address = buildAddress(shippingData);

        const missing: string[] = [];
        if (!fullName) missing.push("name");
        if (phone.length !== 10) missing.push("phone");
        if (!/^[6-9]/.test(phone)) missing.push("phone (must start with 6-9)");
        if (pincode.length !== 6) missing.push("pincode");
        if (!city) missing.push("city");
        if (!address) missing.push("address");
        if (missing.length > 0) {
            return {
                success: false,
                message: `Missing or invalid shipping details: ${missing.join(", ")}`
            };
        }

        const inputState = (shippingData.state || "").trim().toLowerCase();
        let stateCode = "AP"; // Default fallback

        for (const [stateName, code] of Object.entries(stateMapping)) {
            if (stateName.toLowerCase() === inputState) {
                stateCode = code;
                break;
            }
        }

        // iCarry requires a positive decimal for parcel value; floor at 1 so it never hits zero.
        const declaredValue = Math.max(1, Number(orderData.total_amount) || 0);
        const isPrepaid = orderData.payment_method === 'online';

        // For COD, `parcel[value]` is what the courier collects from the
        // consignee (iCarry API v16: "In case of COD type this is the amount to
        // be collected from consignee") — it is NOT just a declared value. The
        // customer has already paid a ₹100 advance online at checkout, so the
        // courier must collect total_amount − 100.
        //   e.g. items ₹249 + ₹50 COD charge = ₹299 total, ₹100 advance paid
        //        → collect ₹199 (= items total − ₹50).
        // `transaction_price` holds the advance actually charged; fall back to
        // the ₹100 default if the row predates that field or looks wrong.
        const codAdvance = (() => {
            const paid = Number(orderData.transaction_price);
            if (Number.isFinite(paid) && paid > 0 && paid < declaredValue) return paid;
            return COD_ADVANCE_DEFAULT;
        })();
        const parcelValue = isPrepaid
            ? declaredValue
            : Math.max(1, declaredValue - codAdvance);

        // Invoice value is the DECLARED GOODS value, not the collectable amount.
        // The ₹50 COD handling fee is our charge, not part of the parcel's worth,
        // so it comes off the invoice — while `parcel[value]` (collectable) still
        // includes it because the courier does collect it.
        //   e.g. goods ₹729 + ₹50 COD = ₹779 total, ₹100 advance paid
        //        → invoice ₹729, collect ₹679.
        // Prepaid parcels have no COD fee, so invoice == total.
        const invoiceValue = isPrepaid
            ? declaredValue
            : Math.max(1, declaredValue - COD_HANDLING_FEE);

        if (!isPrepaid) {
            console.log(
                `[Shipping] COD order ${orderData.id}: total ₹${declaredValue} − advance ₹${codAdvance} → collect ₹${parcelValue}, invoice ₹${invoiceValue}`
            );
        }

        // Rank the couriers we're willing to auto-assign. We ask iCarry which
        // couriers can actually service THIS parcel, then walk the list at
        // booking time. The weight/dimensions here mirror the booking payload
        // below so the returned courier_id stays valid at booking time.
        let candidates: CourierCandidate[] = [];
        if (isAutoAssignEnabled()) {
            // Leave room for at least one booking attempt plus the save-only
            // fallback; if the estimate can't fit, skip it and save Unassigned.
            const estimateBudget = Math.min(
                ICARRY_ESTIMATE_TIMEOUT_MS,
                remaining() - SAVE_ONLY_RESERVE_MS - 2500
            );
            if (estimateBudget >= 1200) {
                const estimate = await getCourierEstimate(apiToken, {
                    destinationPincode: pincode,
                    weightGm: 499,
                    lengthCm: 18,
                    breadthCm: 13,
                    heightCm: 8,
                    shipmentType: isPrepaid ? "P" : "C",
                    value: parcelValue,
                }, estimateBudget);
                candidates = rankCourierCandidates(estimate);
            } else {
                console.warn(`[Shipping] No time left for courier estimate on order ${orderData.id}; saving Unassigned`);
            }

            if (candidates.length) {
                console.log(
                    `[Shipping] Courier candidates for order ${orderData.id}: ` +
                    candidates.map((c) => `${c.group}${c.rate !== null ? ` @ ₹${c.rate}` : ""} (#${c.courierId})`).join(" → ")
                );
            } else {
                console.warn(`[Shipping] No serviceable courier for order ${orderData.id} (pincode ${pincode}); saving Unassigned`);
            }
        }

        // 2. Map payload for Standard Shipment (Surface)
        const payload = new URLSearchParams();
        payload.append("pickup_address_id", process.env.ICARRY_PICKUP_ADDRESS_ID || "1");
        payload.append("client_order_id", String(orderData.id));
        payload.append("consignee[name]", fullName);
        payload.append("consignee[mobile]", phone);
        payload.append("consignee[address]", address);
        payload.append("consignee[city]", city);
        payload.append("consignee[pincode]", pincode);
        payload.append("consignee[state]", stateCode);
        payload.append("consignee[country_code]", "IN");

        payload.append("parcel[type]", isPrepaid ? 'Prepaid' : 'COD');
        payload.append("parcel[value]", String(parcelValue));
        // Without this, iCarry mirrors the collectable amount into the invoice
        // field and the label under-declares the goods (₹679 instead of ₹729).
        payload.append("parcel[invoice_value]", String(invoiceValue));
        payload.append("parcel[contents]", shippingData.productTitle || "Vyra Herbals Product");

        // Default parcel dimensions for a single 100ml hair-oil bottle (the
        // current SKU). Update here if the catalog grows past one box size —
        // iCarry rates and the volumetric-weight calculation depend on these.
        payload.append("parcel[weight][weight]", "499");
        payload.append("parcel[weight][unit]", "gm");
        payload.append("parcel[dimensions][length]", "18");
        payload.append("parcel[dimensions][breadth]", "13");
        payload.append("parcel[dimensions][height]", "8");
        payload.append("parcel[dimensions][unit]", "cm");

        // Courier assignment (iCarry API doc v14, "Book SINGLE Shipment"):
        //   - With a `courier_id` and NO `save_only`, iCarry books the shipment on
        //     that courier and returns an AWB immediately.
        //   - With `save_only` (any value), the order is saved but no courier is
        //     assigned — it waits in iCarry's dashboard for manual assignment.
        //
        // We try each ranked candidate in turn, then ALWAYS fall back to
        // save-only. iCarry's estimate can list a courier its booking API then
        // rejects for the same pincode ("Pincode not serviceable."), and before
        // this fallback existed such an order never reached iCarry at all — it
        // sat in our admin as "Sync Failed" with nothing on the courier side.
        const withParam = (key: string, value: string) => {
            const p = new URLSearchParams(payload);
            p.append(key, value);
            return p;
        };

        const succeed = (
            attempt: Extract<ShipmentAttempt, { ok: true }>,
            fallbackCourier: string
        ): CreateShipmentResult => ({
            success: true,
            trackingId: String(attempt.awb || attempt.shipmentId),
            shipment_id: attempt.shipmentId,
            awb_code: attempt.awb,
            courier_name: attempt.courierName || fallbackCourier,
            label_url: attempt.labelUrl,
            // "Booked" once a courier is auto-assigned (AWB issued, awaiting pickup);
            // "Unassigned" when we saved the order for manual assignment. Live courier
            // status then flows in via the tracking API; admin can still advance it
            // manually from the orders dashboard.
            delivery_status: fallbackCourier ? 'Booked' : 'Unassigned',
            data: attempt.raw,
        });

        let lastError = '';
        let lastTimedOut = false;
        const refusals: string[] = [];

        const attemptable = candidates.slice(0, MAX_COURIER_ATTEMPTS);
        if (candidates.length > attemptable.length) {
            console.warn(
                `[Shipping] Order ${orderData.id}: ${candidates.length} serviceable couriers, only trying the cheapest ${attemptable.length} (ICARRY_MAX_COURIER_ATTEMPTS)`
            );
        }

        for (const candidate of attemptable) {
            // Never spend the save-only reserve on a courier attempt.
            const budget = Math.min(ICARRY_SHIPMENT_TIMEOUT_MS, remaining() - SAVE_ONLY_RESERVE_MS);
            if (budget < 2000) {
                console.warn(`[Shipping] Out of time for further courier attempts on order ${orderData.id}; saving Unassigned`);
                break;
            }

            const rate = candidate.rate !== null ? ` @ ₹${candidate.rate}` : '';
            console.log(`[Shipping] Booking ${candidate.group}${rate} (courier_id ${candidate.courierId}) for order ${orderData.id}`);

            const attempt = await attemptShipment(apiToken, withParam("courier_id", candidate.courierId), budget);
            if (attempt.ok) {
                return succeed(attempt, candidate.group);
            }

            lastError = attempt.message;
            lastTimedOut = attempt.timedOut;
            refusals.push(`${candidate.group || candidate.courierId}: ${attempt.message}`);
            console.warn(`[Shipping] ${candidate.group} (courier_id ${candidate.courierId}) refused order ${orderData.id}: ${attempt.message}`);

            // A timeout means we don't know whether iCarry created the shipment.
            // Stop here rather than risk booking the same parcel twice — the
            // admin "retry sync" path picks it up once the truth is visible.
            if (attempt.timedOut) break;

            // Nothing courier-specific about a wallet/billing hold — every
            // remaining courier will refuse for the same reason.
            if (isAccountLevelError(attempt.message)) {
                console.error(
                    `[Shipping] ACCOUNT-LEVEL iCarry failure on order ${orderData.id} — auto-assign is blocked until this is cleared: ${attempt.message}`
                );
                break;
            }
        }

        if (lastTimedOut) {
            return { success: false, message: lastError };
        }

        // Save-only fallback: get the order onto iCarry no matter what, so admin
        // can assign a courier by hand instead of the order silently vanishing.
        const saveOnlyBudget = Math.min(ICARRY_SHIPMENT_TIMEOUT_MS, Math.max(3000, remaining()));
        const saved = await attemptShipment(apiToken, withParam("save_only", "1"), saveOnlyBudget);
        if (saved.ok) {
            // Unassigned is the safety net, never the intended outcome — say why
            // loudly enough that it can be diagnosed from the function logs.
            console.error(
                `[Shipping] AUTO-ASSIGN FAILED for order ${orderData.id} (pincode ${pincode}); saved Unassigned. ` +
                (refusals.length
                    ? `Courier refusals: ${refusals.join(" | ")}`
                    : candidates.length
                        ? "No courier attempt fit the time budget."
                        : "iCarry returned no serviceable courier for this parcel.")
            );
            const result = succeed(saved, '');
            if (result.success) {
                result.assign_error = refusals.length
                    ? refusals.join(" | ")
                    : candidates.length
                        ? "no time for courier booking attempt"
                        : "no serviceable courier in iCarry estimate";
            }
            return result;
        }

        return {
            success: false,
            message: lastError
                ? `${lastError} (save-only fallback also failed: ${saved.message})`
                : saved.message,
        };
    } catch (error) {
        console.error("Error creating shipment:", error);
        return { success: false, message: (error as Error).message };
    }
};
