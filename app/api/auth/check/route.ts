import { NextResponse } from 'next/server';
import { authUserExists, isValidPhone, normalizePhone, phoneToEmail } from '@/utils/authAdmin';
import { enforceRateLimit } from '@/utils/rateLimit';


// Force dynamic — API routes touch Supabase / cookies; static analysis at build time would try
// to import the module without runtime env vars and blow up in 'collect page data'.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const runtime = 'nodejs';

/**
 * Tells the login form whether a phone number already has an account, so it can
 * show "enter your password" instead of "create an account".
 *
 * This is unavoidably an existence oracle, so it is throttled: without a cap,
 * anyone could walk the Indian mobile number range and extract the complete
 * customer list.
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

        const limited = enforceRateLimit(req, 'auth:check', 20, 15 * 60 * 1000);
        if (limited) return limited;

        // Robust existence check — indexed lookup on public.users with a fully
        // paginated auth fallback. Never subject to the listUsers() page cap that
        // previously made existing customers look like new users.
        const exists = await authUserExists(phoneToEmail(cleanedPhone));

        return NextResponse.json({ exists });
    } catch (error: any) {
        console.error('Check User Error:', error);
        return NextResponse.json({ error: 'Could not check that number.' }, { status: 500 });
    }
}
