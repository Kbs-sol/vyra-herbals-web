import { createClient, type User as AuthUser } from '@supabase/supabase-js';
import fetch from 'node-fetch'; // Force node-fetch which respects IPv4
import https from 'https';
import dns from 'dns';

/**
 * Shared server-only Supabase admin helpers for the phone-based auth flow.
 *
 * Phone users are stored in Supabase Auth with a deterministic internal email
 * of `${phone}@phone.internal`. The public.users table mirrors auth.users via a
 * DB trigger, so its `email` column (UNIQUE, indexed) is the fast, reliable way
 * to answer "does this phone already have an account?".
 *
 * IMPORTANT: never use `auth.admin.listUsers()` alone to check existence — it is
 * paginated (defaults to 50 users/page), so on a store with more than a page of
 * customers it silently reports existing accounts as missing. Use the helpers
 * here instead.
 */

// Bypass Indian ISP (Jio) DNS sinkholes for Supabase by hardcoding the real Cloudflare edge IP.
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
                cb(null, [{ address: ip, family: 4 }] as any);
            } else {
                cb(null, ip as any, 4);
            }
        } else {
            dns.lookup(hostname, opts, cb);
        }
    }
});

const customFetch = (url: any, options?: any) => {
    return fetch(url, { ...options, agent: bypassAgent } as any);
};

// Service-role client for privileged auth/admin operations. Reused across routes.
export const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
        global: {
            fetch: customFetch as any,
        },
    }
);

/** Normalize any user-entered phone to the last 10 digits. */
export function normalizePhone(phone: string): string {
    return (phone || '').replace(/\D/g, '').slice(-10);
}

/** Deterministic internal email used for a phone-based auth user. */
export function phoneToEmail(phone: string): string {
    return `${normalizePhone(phone)}@phone.internal`;
}

/** True when a cleaned phone number is a valid 10-digit Indian mobile number. */
export function isValidPhone(phone: string): boolean {
    return /^[6-9]\d{9}$/.test(normalizePhone(phone));
}

/**
 * Authoritative "find an auth user by email" that is NOT subject to the
 * listUsers() page cap. Walks every page until the user is found or the list is
 * exhausted. Terminating on an empty page keeps it correct even if the server
 * clamps `perPage` to a smaller value than requested.
 */
export async function findAuthUserByEmailPaginated(email: string): Promise<AuthUser | null> {
    const target = email.toLowerCase();
    // Hard cap as a safety net against an unexpected non-terminating list.
    for (let page = 1; page <= 500; page++) {
        const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
        if (error) throw error;
        const users = (data?.users || []) as AuthUser[];
        if (users.length === 0) break;
        const found = users.find((u) => (u.email || '').toLowerCase() === target);
        if (found) return found;
    }
    return null;
}

/**
 * Fast, robust existence check for a phone-based account.
 * 1) Indexed lookup on public.users.email (covers the overwhelming majority).
 * 2) Fallback to a fully-paginated auth scan, so an auth user that somehow lacks
 *    a public.users row (legacy data / trigger gap) is still detected. This
 *    guarantees we never wrongly tell an existing customer to "create an account".
 */
export async function authUserExists(email: string): Promise<boolean> {
    const normalizedEmail = email.toLowerCase();

    const { data, error } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('email', normalizedEmail)
        .maybeSingle();

    if (error) throw error;
    if (data) return true;

    const authUser = await findAuthUserByEmailPaginated(normalizedEmail);
    return !!authUser;
}

/**
 * Resolve the auth user id + persisted profile for a phone-based account.
 * Uses the indexed public.users lookup first, then falls back to a paginated
 * auth scan. Returns null when no account exists.
 */
export async function findPhoneUser(
    email: string
): Promise<{ id: string; name: string | null; phone: string | null } | null> {
    const normalizedEmail = email.toLowerCase();

    const { data, error } = await supabaseAdmin
        .from('users')
        .select('id, name, phone')
        .eq('email', normalizedEmail)
        .maybeSingle();

    if (error) throw error;
    if (data) return { id: data.id, name: data.name ?? null, phone: data.phone ?? null };

    const authUser = await findAuthUserByEmailPaginated(normalizedEmail);
    if (!authUser) return null;
    return {
        id: authUser.id,
        name: (authUser.user_metadata?.name as string) ?? null,
        phone: (authUser.user_metadata?.phone as string) ?? null,
    };
}
