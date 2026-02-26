"use server";

import { createShipment } from "@/utils/shipping";

export async function testDeliveryAction() {
    // Mock Order Data that createShipment expects
    const orderData = {
        id: `TEST_${Date.now()}`,
        total_amount: 500,
        payment_method: 'online', // or 'COD'
        shipping_data: {
            fullName: "Test Delivery User",
            phone: "9692544587",
            email: "testdelivery@example.com",
            houseNumber: "123, Test Building",
            area: "Test Street, Test Area",
            landmark: "Near Test Landmark",
            pincode: "110001",
            city: "New Delhi",
            state: "Delhi",
            country: "India",
            productTitle: "Test Product - Delivery Testing"
        }
    };

    try {
        const result = await createShipment(orderData);
        return result;
    } catch (e: any) {
        return { success: false, message: e.message };
    }
}
