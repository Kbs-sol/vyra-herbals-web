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

// Sender pincode for iCarry's rate/serviceability lookup. This is the registered
// pickup address (Mandamarri, Telangana - 504231). Override via env if the
// pickup location ever changes — it must match the pincode of the pickup
// address referenced by ICARRY_PICKUP_ADDRESS_ID.
const ICARRY_ORIGIN_PINCODE = (process.env.ICARRY_ORIGIN_PINCODE || "504231").replace(/\D/g, "").slice(0, 6);

// Preferred couriers in priority order. On every booking we pull the live list
// of serviceable couriers from iCarry's estimate API and assign the first one
// that matches this list — Xpressbees first, then Delhivery. If none of these
// are serviceable (or the estimate call fails) the order is saved Unassigned for
// manual assignment from iCarry's dashboard, exactly as before.
const ICARRY_COURIER_PRIORITY = (process.env.ICARRY_COURIER_PRIORITY || "Xpressbees,Delhivery")
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

// iCarry's estimate response has no single documented price key, so we probe the
// common ones (in order) and take the first positive number. Handles both plain
// numbers and strings like "₹73.50".
const COURIER_RATE_FIELDS = [
    "rate", "total_charges", "total_charge", "total_amount", "total",
    "freight_charge", "freight_charges", "chargeable_amount", "net_charges",
    "net_charge", "final_charge", "final_charges", "grand_total",
    "price", "amount", "charges", "charge", "cost", "estimated_cost",
];

const getCourierRate = (c: CourierEstimate): number | null => {
    for (const key of COURIER_RATE_FIELDS) {
        const raw = c?.[key];
        if (raw === undefined || raw === null || raw === "") continue;
        const num = typeof raw === "number" ? raw : parseFloat(String(raw).replace(/[^\d.]/g, ""));
        if (Number.isFinite(num) && num > 0) return num;
    }
    return null;
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
    }
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
            ICARRY_ESTIMATE_TIMEOUT_MS
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

/**
 * Pick the highest-priority serviceable courier (Xpressbees → Delhivery).
 * Matches against both the courier group name and the full courier name, so
 * e.g. "Xpressbees Surface 0.5Kg" is recognised as Xpressbees. Returns null when
 * none of the preferred couriers appear in the estimate.
 */
const resolvePreferredCourier = (
    estimate: CourierEstimate[]
): { courierId: string; group: string } | null => {
    for (const pref of ICARRY_COURIER_PRIORITY) {
        const needle = pref.toLowerCase();
        const match = estimate.find((c) =>
            `${c.courier_group_name || ""} ${c.courier_name || ""}`.toLowerCase().includes(needle)
        );
        if (match?.courier_id !== undefined && match.courier_id !== null && String(match.courier_id) !== "") {
            return { courierId: String(match.courier_id), group: match.courier_group_name || pref };
        }
    }
    return null;
};

/**
 * Pick the CHEAPEST serviceable courier from the estimate. Only couriers whose
 * rate we can read AND that have a valid courier_id are considered; ties are
 * broken by iCarry's own ordering. Returns null when no priced courier is
 * available (e.g. the estimate omits rates), so the caller can fall back to the
 * priority list.
 */
const resolveCheapestCourier = (
    estimate: CourierEstimate[]
): { courierId: string; group: string; rate: number } | null => {
    const priced = estimate
        .map((c) => ({ c, rate: getCourierRate(c) }))
        .filter(
            (x): x is { c: CourierEstimate; rate: number } =>
                x.rate !== null &&
                x.c.courier_id !== undefined &&
                x.c.courier_id !== null &&
                String(x.c.courier_id) !== ""
        );
    if (!priced.length) return null;
    priced.sort((a, b) => a.rate - b.rate);
    const best = priced[0];
    return {
        courierId: String(best.c.courier_id),
        group: best.c.courier_group_name || best.c.courier_name || "",
        rate: best.rate,
    };
};

export const createShipment = async (orderData: any) => {
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

        if (!isPrepaid) {
            console.log(
                `[Shipping] COD order ${orderData.id}: total ₹${declaredValue} − advance ₹${codAdvance} → collect ₹${parcelValue}`
            );
        }

        // Resolve which courier to auto-assign (Xpressbees → Delhivery). We ask
        // iCarry which couriers can actually service THIS parcel, then pick the
        // first preferred one. The weight/dimensions here mirror the booking
        // payload below so the returned courier_id stays valid at booking time.
        let chosenCourierId: string | null = null;
        let chosenCourierGroup: string | null = null;
        if (isAutoAssignEnabled()) {
            const estimate = await getCourierEstimate(apiToken, {
                destinationPincode: pincode,
                weightGm: 499,
                lengthCm: 18,
                breadthCm: 13,
                heightCm: 8,
                shipmentType: isPrepaid ? "P" : "C",
                value: parcelValue,
            });
            // Prefer the cheapest serviceable courier. If iCarry's estimate has
            // no readable rate, fall back to the priority order (Xpressbees →
            // Delhivery) so behaviour degrades gracefully instead of failing.
            let picked: { courierId: string; group: string; rate: number | null } | null = null;
            if (isCheapestEnabled()) {
                picked = resolveCheapestCourier(estimate);
            }
            if (!picked) {
                const pref = resolvePreferredCourier(estimate);
                if (pref) picked = { courierId: pref.courierId, group: pref.group, rate: null };
            }

            if (picked) {
                chosenCourierId = picked.courierId;
                chosenCourierGroup = picked.group;
                const note = picked.rate !== null ? `@ ₹${picked.rate} (cheapest)` : "(priority order)";
                console.log(`[Shipping] Auto-assigning ${picked.group} ${note} (courier_id ${picked.courierId}) for order ${orderData.id}`);
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
        // We auto-assign Xpressbees (falling back to Delhivery) when one of them is
        // serviceable; otherwise we save Unassigned so nothing in the flow breaks.
        if (chosenCourierId) {
            payload.append("courier_id", chosenCourierId);
        } else {
            payload.append("save_only", "1");
        }

        const apiUrl = `https://www.icarry.in/api_add_shipment_surface?api_token=${apiToken}`;

        console.log("iCarry.in Request:", {
            url: apiUrl,
            payload: Object.fromEntries(payload.entries())
        });

        let response: Response;
        try {
            response = await fetchWithTimeout(apiUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                    "Accept": "application/json, text/plain, */*"
                },
                body: payload,
            }, ICARRY_SHIPMENT_TIMEOUT_MS);
        } catch (e) {
            const isAbort = (e as any)?.name === 'AbortError';
            return {
                success: false,
                message: isAbort
                    ? "iCarry shipment call timed out"
                    : `iCarry shipment call failed: ${(e as Error).message}`
            };
        }

        const textResponse = await response.text();
        let result;
        try {
            result = JSON.parse(textResponse);
        } catch (e) {
            console.error("iCarry.in Result Error (Not JSON):", textResponse.substring(0, 150));
            return { success: false, message: "Invalid API response from shipping provider" };
        }

        console.log("iCarry.in Result:", result);

        const resultData = result?.data || result;
        const shipmentId = resultData?.shipment_id || result?.shipment_id;
        const awb = resultData?.awb || result?.awb;
        const courierName = resultData?.courier_name || result?.courier_name || null;
        const labelUrl = resultData?.label_url || result?.label_url || '';

        // iCarry returns `success` as a human-readable string (e.g. "Success: You have added a new
        // shipment with id 352. | ...") on the shipment endpoints, and `error` as an empty string.
        // Treat the call as successful when an error message is absent and a shipment_id is returned.
        const errorMessage = typeof result?.error === 'string' ? result.error.trim() : (result?.error || '');
        const successField = result?.success;
        const successString = typeof successField === 'string' && successField.trim().toLowerCase().startsWith('success');
        const isSuccess = !errorMessage && (
            successField === true ||
            successField === 1 ||
            successField === '1' ||
            successString ||
            Boolean(shipmentId)
        );

        // iCarry sometimes nests the courier full name under `courier_name_full`.
        const courierFull =
            resultData?.courier_name_full ||
            result?.courier_name_full ||
            null;

        if (isSuccess && shipmentId) {
            return {
                success: true,
                trackingId: String(awb || shipmentId),
                shipment_id: String(shipmentId),
                awb_code: awb ? String(awb) : '',
                courier_name: String(courierFull || courierName || chosenCourierGroup || ''),
                label_url: String(labelUrl),
                // "Booked" once a courier is auto-assigned (AWB issued, awaiting pickup);
                // "Unassigned" when we saved the order for manual assignment. Live courier
                // status then flows in via the tracking API; admin can still advance it
                // manually from the orders dashboard.
                delivery_status: chosenCourierId ? 'Booked' : 'Unassigned',
                data: result,
            };
        }

        return { success: false, message: errorMessage || "Shipment creation failed" };
    } catch (error) {
        console.error("Error creating shipment:", error);
        return { success: false, message: (error as Error).message };
    }
};
