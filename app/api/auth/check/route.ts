import { NextResponse } from 'next/server';
import { authUserExists, isValidPhone, normalizePhone, phoneToEmail } from '@/utils/authAdmin';

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

        // Robust existence check — indexed lookup on public.users with a fully
        // paginated auth fallback. Never subject to the listUsers() page cap that
        // previously made existing customers look like new users.
        const exists = await authUserExists(phoneToEmail(cleanedPhone));

        return NextResponse.json({ exists });
    } catch (error: any) {
        console.error('Check User Error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to check user existence' },
            { status: 500 }
        );
    }
}
