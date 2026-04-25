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

export const getIcarryToken = async (retryCount = 0): Promise<string | null> => {
    // Return cached token if still valid (cache for 23 hours)
    if (cachedToken && cachedToken.expiresAt > Date.now()) {
        console.log("Using cached iCarry token");
        return cachedToken.token;
    }

    const username = process.env.ICARRY_USERNAME;
    const key = process.env.ICARRY_KEY;

    if (!username || !key) {
        console.error("iCarry.in credentials missing");
        return null;
    }

    try {
        const loginRes = await fetch("https://www.icarry.in/api_login", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept": "application/json, text/plain, */*",
                "Accept-Language": "en-US,en;q=0.9",
                "Accept-Encoding": "gzip, deflate, br",
                "Referer": "https://www.icarry.in/",
                "Origin": "https://www.icarry.in",
                "Connection": "keep-alive",
                "Upgrade-Insecure-Requests": "1",
                "Sec-Fetch-Dest": "document",
                "Sec-Fetch-Mode": "navigate",
                "Sec-Fetch-Site": "same-origin",
                "Cache-Control": "max-age=0"
            },
            body: new URLSearchParams({ username, Key: key }),
        });

        const text = await loginRes.text();

        // Check for Cloudflare/error HTML response
        if (text.includes("<!DOCTYPE") || text.includes("<html") || loginRes.status >= 400) {
            console.error(`iCarry.in returned error (status: ${loginRes.status}), retrying...`);
            if (retryCount < 3) {
                const delay = 3000 * Math.pow(2, retryCount);
                console.log(`Retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                return getIcarryToken(retryCount + 1);
            }
            console.error("Failed to get iCarry token after 3 retries");
            return null;
        }

        try {
            const loginData = JSON.parse(text);
            if (loginData.api_token) {
                // Cache the token for 23 hours
                cachedToken = {
                    token: loginData.api_token,
                    expiresAt: Date.now() + 23 * 60 * 60 * 1000
                };
                console.log("iCarry token obtained and cached successfully");
                return loginData.api_token;
            }
            console.error("iCarry response missing api_token:", loginData);
            return null;
        } catch (parseError) {
            console.error("iCarry token error (Not JSON):", text.substring(0, 200));
            return null;
        }
    } catch (err) {
        console.error("iCarry token fetch error:", err);
        return null;
    }
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

export const createShipment = async (orderData: any) => {
    try {
        const apiToken = await getIcarryToken();
        if (!apiToken) {
            return { success: false, message: "Shipping authentication failed" };
        }

        const shippingData = typeof orderData.shipping_data === 'string'
            ? JSON.parse(orderData.shipping_data)
            : (orderData.shipping_data || {});

        const phone = normalizePhone(shippingData.phone);
        const pincode = normalizePincode(shippingData.pincode);
        const fullName = String(shippingData.fullName || "").trim();
        const city = String(shippingData.city || "").trim();
        const address = buildAddress(shippingData);

        if (!fullName || phone.length !== 10 || pincode.length !== 6 || !city || !address) {
            return {
                success: false,
                message: `Missing or invalid shipping details (name/phone/pincode/city/address)`
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

        // iCarry requires a positive decimal for parcel value; floor at 1 so save_only never hits zero.
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

        // Keep shipment unassigned in iCarry so admin can manually assign a courier later.
        // Per iCarry API v14: any value in `save_only` saves the order without booking a courier.
        payload.append("save_only", "1");

        const apiUrl = `https://www.icarry.in/api_add_shipment_surface?api_token=${apiToken}`;

        console.log("iCarry.in Request:", {
            url: apiUrl,
            payload: Object.fromEntries(payload.entries())
        });

        const response = await fetch(apiUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept": "application/json, text/plain, */*"
            },
            body: payload,
        });

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

        if (isSuccess && shipmentId) {
            return {
                success: true,
                trackingId: String(awb || shipmentId),
                shipment_id: String(shipmentId),
                awb_code: awb ? String(awb) : '',
                // save_only keeps the shipment unassigned — no courier or AWB will be returned until
                // admin manually books it from the iCarry dashboard.
                courier_name: courierName ? String(courierName) : '',
                label_url: String(labelUrl),
                delivery_status: 'Unassigned',
                data: result
            };
        }

        return { success: false, message: errorMessage || "Shipment creation failed" };
    } catch (error) {
        console.error("Error creating shipment:", error);
        return { success: false, message: (error as Error).message };
    }
};
