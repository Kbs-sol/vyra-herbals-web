import { NextResponse } from 'next/server';
import { MessageCentral } from '@/utils/messageCentral';
import { normalizePhone, isValidPhone } from '@/utils/authAdmin';

export async function POST(req: Request) {
    try {
        const { phone } = await req.json();

        if (!phone) {
            return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
        }

        const cleanedPhone = normalizePhone(phone);

        if (!isValidPhone(cleanedPhone)) {
            return NextResponse.json({ error: 'Enter a valid 10-digit mobile number' }, { status: 400 });
        }

        const verificationId = await MessageCentral.sendOtp(cleanedPhone);

        return NextResponse.json({ verificationId });
    } catch (error: any) {
        console.error('OTP Send Error:', error);
        return NextResponse.json({ error: error.message || 'Failed to send OTP' }, { status: 500 });
    }
}
