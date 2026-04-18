/**
 * Shipping Utility for iCarry.in Integration
 */

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

export const getIcarryToken = async () => {
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
                "Accept": "application/json, text/plain, */*"
            },
            body: new URLSearchParams({ username, Key: key }),
        });

        const text = await loginRes.text();
        try {
            const loginData = JSON.parse(text);
            return loginData.api_token || null;
        } catch (parseError) {
            console.error("iCarry.in token error (Not JSON):", text.substring(0, 150));
            return null;
        }
    } catch (err) {
        console.error("iCarry.in token error:", err);
        return null;
    }
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

        if (!shippingData.fullName || !shippingData.phone || !shippingData.pincode || !shippingData.city) {
            return { success: false, message: "Missing shipping details for shipment creation" };
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
        payload.append("consignee[name]", shippingData.fullName);
        payload.append("consignee[mobile]", shippingData.phone);
        payload.append("consignee[address]", `${shippingData.houseNumber || ''}, ${shippingData.area || ''}, ${shippingData.landmark || ''}`.replace(/^, /, ''));
        payload.append("consignee[city]", shippingData.city);
        payload.append("consignee[pincode]", shippingData.pincode);
        payload.append("consignee[state]", stateCode);
        payload.append("consignee[country_code]", "IN");

        payload.append("parcel[type]", orderData.payment_method === 'online' ? 'Prepaid' : 'COD');
        payload.append("parcel[value]", String(orderData.total_amount));
        payload.append("parcel[contents]", shippingData.productTitle || "Vyra Herbals Product");

        payload.append("parcel[weight][weight]", "500");
        payload.append("parcel[weight][unit]", "gm");
        payload.append("parcel[dimensions][length]", "10");
        payload.append("parcel[dimensions][breadth]", "10");
        payload.append("parcel[dimensions][height]", "10");
        payload.append("parcel[dimensions][unit]", "cm");

        // Keep shipment unassigned in iCarry so admin can manually assign a delivery partner later.
        payload.append("auto_assign", "0");
        payload.append("is_auto_assign", "0");
        payload.append("assign_courier", "0");

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
        const deliveryStatusRaw =
            resultData?.delivery_status ||
            resultData?.status ||
            result?.delivery_status ||
            result?.status ||
            'unassigned';

        const isSuccess = result?.success === true || result?.success === 1 || result?.success === '1';

        if (isSuccess && shipmentId) {
            return {
                success: true,
                trackingId: String(awb || shipmentId),
                shipment_id: String(shipmentId),
                awb_code: awb ? String(awb) : '',
                courier_name: courierName ? String(courierName) : '',
                label_url: String(labelUrl),
                delivery_status: String(deliveryStatusRaw).toLowerCase() === 'booked' ? 'Unassigned' : String(deliveryStatusRaw),
                data: result
            };
        }

        return { success: false, message: result.error || "Shipment creation failed" };
    } catch (error) {
        console.error("Error creating shipment:", error);
        return { success: false, message: (error as Error).message };
    }
};
