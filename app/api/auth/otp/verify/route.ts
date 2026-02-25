import { NextResponse } from 'next/server';
import { MessageCentral } from '@/utils/messageCentral';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import fetch from 'node-fetch'; // Force node-fetch which respects IPv4
import https from 'https';
import dns from 'dns';

// Bypass Indian ISP (Jio) DNS sinkholes for Supabase by hardcoding the real Cloudflare edge IP
const bypassAgent = new https.Agent({
    lookup: (hostname, options, callback) => {
        let cb = callback;
        let opts: any = options;
        if (typeof options === 'function') {
            cb = options;
            opts = {};
        }
        if (hostname.includes('supabase.co')) {
            const ip = '172.64.149.246';
            if (opts && opts.all) {
                cb(null, [{ address: ip, family: 4 }]);
            } else {
                cb(null, ip, 4);
            }
        } else {
            dns.lookup(hostname, opts, cb);
        }
    }
});

const customFetch = (url: RequestInfo | URL, options?: RequestInit) => {
    return fetch(url as any, { ...options, agent: bypassAgent } as any);
};

// Use service role for admin operations
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        },
        global: {
            fetch: customFetch as any
        }
    }
);

const SERVER_SECRET = process.env.OTP_SERVER_SECRET || 'vyra-herbals-fallback-secret-2026';

export async function POST(req: Request) {
    try {
        const { phone, verificationId, code, name, password } = await req.json();

        if (!phone || !verificationId || !code) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        if (!password || password.length < 6) {
            return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
        }

        const isValid = await MessageCentral.verifyOtp(verificationId, code);

        if (!isValid) {
            return NextResponse.json({ error: 'Invalid or expired OTP' }, { status: 400 });
        }

        const cleanedPhone = phone.replace(/\D/g, '').slice(-10);
        const internalEmail = `${cleanedPhone}@phone.internal`;

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
            // If user exists, update their password (forgot password flow)
            // also update their name if provided and not already set
            const updates: any = { password: password };
            if (name && !targetUser.user_metadata?.name) {
                updates.user_metadata = { ...targetUser.user_metadata, name };
            }

            const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(targetUser.id, updates);
            if (updateError) throw updateError;
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
