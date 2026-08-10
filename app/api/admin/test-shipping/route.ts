import { NextResponse } from "next/server";
import { createShipment, getIcarryToken } from "@/utils/shipping";
import { requireAdmin } from '@/utils/adminAuth';

export async function POST(req: Request) {
  const denied = await requireAdmin(req);
  if (denied) return denied;

    try {
        // First test just getting a token:
        const token = await getIcarryToken();
        if (!token) {
            // Attempt to fetch raw to see the imunify error directly
            const username = process.env.ICARRY_USERNAME;
            const key = process.env.ICARRY_KEY;
            const rawRaw = await fetch("https://www.icarry.in/api_login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                    "Accept": "application/json, text/plain, */*"
                },
                body: new URLSearchParams({ username: username || "", Key: key || "" }),
            });
            const textResponse = await rawRaw.text();

            return NextResponse.json({
                success: false,
                message: "Failed to get token (IP Whitelist block likely).",
                rawResponse: textResponse
            }, { status: 403 });
        }

        // Dummy order
        const dummyOrder = {
            id: `TEST-${Date.now()}`,
            shipping_data: {
                fullName: "Test User",
                phone: "9999999999",
                houseNumber: "123 Test St",
                area: "Test Area",
                landmark: "Test Landmark",
                city: "Mumbai",
                pincode: "400001",
                state: "Maharashtra"
            },
            payment_method: "online",
            total_amount: 100
        };

        const shipmentResult = await createShipment(dummyOrder);

        return NextResponse.json({
            success: shipmentResult.success,
            data: shipmentResult
        });

    } catch (error) {
        console.error("Test shipping error:", error);
        return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
    }
}
