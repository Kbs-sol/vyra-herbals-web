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
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({ username, Key: key }),
        });

        const loginData = await loginRes.json();
        return loginData.api_token || null;
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
        const stateCode = stateMapping[orderData.shipping_data.state] || "AP"; // Fallback to AP if not found

        // 2. Map payload for Standard Shipment (Surface)
        // Using x-www-form-urlencoded as per PDF example structure
        const payload = new URLSearchParams();
        payload.append("pickup_address_id", process.env.ICARRY_PICKUP_ADDRESS_ID || "1"); // Now configurable via environment variables
        payload.append("client_order_id", String(orderData.id)); // Ensure string
        payload.append("consignee[name]", orderData.shipping_data.fullName);
        payload.append("consignee[mobile]", orderData.shipping_data.phone);
        payload.append("consignee[address]", `${orderData.shipping_data.houseNumber}, ${orderData.shipping_data.area}, ${orderData.shipping_data.landmark}`);
        payload.append("consignee[city]", orderData.shipping_data.city);
        payload.append("consignee[pincode]", orderData.shipping_data.pincode);
        payload.append("consignee[state]", stateCode);
        payload.append("consignee[country_code]", "IN");

        payload.append("parcel[type]", orderData.payment_method === 'online' ? 'Prepaid' : 'COD');
        payload.append("parcel[value]", String(orderData.total_amount));
        payload.append("parcel[contents]", orderData.shipping_data.productTitle || "Vyra Herbals Product");

        payload.append("parcel[weight][weight]", "500");
        payload.append("parcel[weight][unit]", "gm");
        payload.append("parcel[dimensions][length]", "10");
        payload.append("parcel[dimensions][breadth]", "10");
        payload.append("parcel[dimensions][height]", "10");
        payload.append("parcel[dimensions][unit]", "cm");

        const apiUrl = `https://www.icarry.in/api_add_shipment_surface&api_token=${apiToken}`;

        const response = await fetch(apiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: payload,
        });

        const result = await response.json();
        console.log("iCarry.in Result:", result);

        if (result.success && result.shipment_id) {
            return {
                success: true,
                trackingId: String(result.awb || result.shipment_id),
                shipment_id: String(result.shipment_id),
                awb_code: String(result.awb),
                courier_name: String(result.courier_name || 'iCarry Partner'),
                label_url: String(result.label_url || ''),
                data: result
            };
        }

        return { success: false, message: result.error || "Shipment creation failed" };
    } catch (error) {
        console.error("Error creating shipment:", error);
        return { success: false, message: (error as Error).message };
    }
};
