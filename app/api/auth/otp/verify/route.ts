import { NextResponse } from 'next/server';
import { MessageCentral } from '@/utils/messageCentral';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// Use service role for admin operations
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const SERVER_SECRET = process.env.OTP_SERVER_SECRET || 'vyra-herbals-fallback-secret-2026';

export async function POST(req: Request) {
    try {
        const { phone, verificationId, code, name } = await req.json();

        if (!phone || !verificationId || !code) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const isValid = await MessageCentral.verifyOtp(verificationId, code);

        if (!isValid) {
            return NextResponse.json({ error: 'Invalid or expired OTP' }, { status: 400 });
        }

        const cleanedPhone = phone.replace(/\D/g, '').slice(-10);
        const internalEmail = `${cleanedPhone}@phone.internal`;

        // Generate deterministic password for this phone number
        const password = crypto
            .createHmac('sha256', SERVER_SECRET)
            .update(cleanedPhone)
            .digest('hex');

        // 1. Check if user exists in Auth
        const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();

        let targetUser = (users as any[])?.find(u => u.email === internalEmail);

        if (!targetUser) {
            // 2. Create new user if not exists
            const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
                email: internalEmail,
                password: password,
                email_confirm: true,
                user_metadata: { name, phone: cleanedPhone }
            });

            if (createError) throw createError;
            targetUser = newUser.user;
        } else {
            // If user exists, update their name if provided and not already set
            if (name && !targetUser.user_metadata?.name) {
                await supabaseAdmin.auth.admin.updateUserById(targetUser.id, {
                    user_metadata: { ...targetUser.user_metadata, name }
                });
            }
        }

        // Return credentials to client for final sign-in
        return NextResponse.json({
            email: internalEmail,
            password: password
        });

    } catch (error: any) {
        console.error('OTP Verify Error:', error);
        return NextResponse.json({ error: error.message || 'Failed to verify OTP' }, { status: 500 });
    }
}
