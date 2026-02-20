import { NextResponse } from 'next/server';
import { MessageCentral } from '@/utils/messageCentral';

export async function POST(req: Request) {
    try {
        const { phone } = await req.json();

        if (!phone) {
            return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
        }

        // Clean phone number (remove non-digits, handle +91 if present)
        const cleanedPhone = phone.replace(/\D/g, '').slice(-10);

        if (cleanedPhone.length !== 10) {
            return NextResponse.json({ error: 'Invalid phone number' }, { status: 400 });
        }

        const verificationId = await MessageCentral.sendOtp(cleanedPhone);

        return NextResponse.json({ verificationId });
    } catch (error: any) {
        console.error('OTP Send Error:', error);
        return NextResponse.json({ error: error.message || 'Failed to send OTP' }, { status: 500 });
    }
}
