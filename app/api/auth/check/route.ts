import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
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

export async function POST(req: Request) {
    try {
        const { phone } = await req.json();

        if (!phone) {
            return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
        }

        const cleanedPhone = phone.replace(/\D/g, '').slice(-10);

        if (cleanedPhone.length !== 10) {
            return NextResponse.json({ error: 'Invalid phone number' }, { status: 400 });
        }

        const internalEmail = `${cleanedPhone}@phone.internal`;

        // Check if user exists in Auth
        const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();

        if (error) {
            throw error;
        }

        const targetUser = (users as any[])?.find(u => u.email === internalEmail);

        return NextResponse.json({
            exists: !!targetUser
        });

    } catch (error: any) {
        console.error('Check User Error:', error);
        return NextResponse.json({ error: error.message || 'Failed to check user existence' }, { status: 500 });
    }
}
