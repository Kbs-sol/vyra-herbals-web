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

const ICARRY_TOKEN_FETCH_TIMEOUT_MS = 7000;

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

        // Cloudflare / error HTML response. Retry with shorter backoff so we stay
        // inside the serverless function budget.
        const looksHtml = text.includes("<!DOCTYPE") || text.includes("<html");
        if (looksHtml || loginRes.status >= 400) {
            if (retryCount < 2) {
                const delay = 1000 * Math.pow(2, retryCount); // 1s, 2s
                await new Promise(resolve => setTimeout(resolve, delay));
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

const ICARRY_SHIPMENT_TIMEOUT_MS = 12000;

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

        // iCarry requires a positive decimal for parcel value; floor at 1 so it never hits zero.
        const parcelValue = Math.max(1, Number(orderData.total_amount) || 0);
        payload.append("parcel[type]", orderData.payment_method === 'online' ? 'Prepaid' : 'COD');
        payload.append("parcel[value]", String(parcelValue));
        payload.append("parcel[contents]", shippingData.productTitle || "Vyra Herbals Product");

        payload.append("parcel[weight][weight]", "500");
        payload.append("parcel[weight][unit]", "gm");
        payload.append("parcel[dimensions][length]", "10");
        payload.append("parcel[dimensions][breadth]", "10");
        payload.append("parcel[dimensions][height]", "10");
        payload.append("parcel[dimensions][unit]", "cm");

        // Save the order without booking a courier. Per iCarry API doc v14 p14,
        // any value in `save_only` means "save the order, do not assign a courier" —
        // the order then sits in iCarry's dashboard waiting for the admin to pick
        // a courier manually. The `auto_assign` / `assign_courier` flags we used
        // before are not in iCarry's docs and the surface endpoint ignored them,
        // so every order was getting booked on Delhivery automatically.
        payload.append("save_only", "1");

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
            console.error(`iCarry.in Result Error (Not JSON, status ${response.status}):`, textResponse.substring(0, 400));
            return { success: false, message: `Invalid API response from shipping provider (status ${response.status})` };
        }

        console.log(`iCarry.in Result (status ${response.status}, keys=${Object.keys(result || {}).join(',')}):`, result);

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
                courier_name: String(courierFull || courierName || ''),
                label_url: String(labelUrl),
                // Always start at "Unassigned". Admin advances the status (Pending Pickup,
                // Shipped, Delivered, etc.) manually from the orders dashboard.
                delivery_status: 'Unassigned',
                data: result,
            };
        }

        // Surface what iCarry actually sent so failures don't show up as a bare
        // "Shipment creation failed" — that hid a save_only response where the id
        // was returned under a different key.
        const detail = errorMessage
            || (typeof successField === 'string' && successField.trim())
            || `unexpected response (keys=${Object.keys(result || {}).join(',')})`;
        console.error(`iCarry.in shipment not recognized as success. Detail: ${detail}`);
        return { success: false, message: `Shipment creation failed: ${detail}` };
    } catch (error) {
        console.error("Error creating shipment:", error);
        return { success: false, message: (error as Error).message };
    }
};
