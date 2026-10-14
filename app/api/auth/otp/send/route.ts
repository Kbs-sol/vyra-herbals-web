import { NextResponse } from 'next/server';
import { MessageCentral } from '@/utils/messageCentral';
import { normalizePhone, isValidPhone } from '@/utils/authAdmin';
import { enforceRateLimit } from '@/utils/rateLimit';


// Force dynamic — API routes touch Supabase / cookies; static analysis at build time would try
// to import the module without runtime env vars and blow up in 'collect page data'.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const runtime = 'nodejs';

/**
 * Send a login OTP.
 *
 * Every call costs real money and rings a real handset, so this is throttled on
 * two axes: per source IP (stops one attacker draining the SMS balance) and per
 * destination phone number (stops a victim being spammed from many IPs).
 */
export async function POST(req: Request) {
    try {
        const { phone } = await req.json().catch(() => ({}));

        if (!phone) {
            return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
        }

        const cleanedPhone = normalizePhone(phone);

        if (!isValidPhone(cleanedPhone)) {
            return NextResponse.json({ error: 'Enter a valid 10-digit mobile number' }, { status: 400 });
        }

        const ipLimited = enforceRateLimit(req, 'otp:send:ip', 8, 15 * 60 * 1000);
        if (ipLimited) return ipLimited;

        const phoneLimited = enforceRateLimit(req, 'otp:send:phone', 4, 15 * 60 * 1000, cleanedPhone);
        if (phoneLimited) return phoneLimited;

        const verificationId = await MessageCentral.sendOtp(cleanedPhone);

        return NextResponse.json({ verificationId });
    } catch (error: any) {
        // Log the detail, return a generic message: provider errors can carry
        // account identifiers and internal endpoints.
        console.error('OTP Send Error:', error);
        return NextResponse.json({ error: 'Failed to send OTP. Please try again.' }, { status: 500 });
    }
}
