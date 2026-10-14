import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/utils/supabaseClient';
import { validateCoupon } from '@/utils/coupons';


// Force dynamic — API routes touch Supabase / cookies; static analysis at build time would try
// to import the module without runtime env vars and blow up in 'collect page data'.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const runtime = 'nodejs';

/**
 * POST /api/coupon/validate
 * Body: { code: string, items: [{ id?, price, quantity }] }
 *
 * If the caller passes an Authorization Bearer token, we also enforce per-user
 * usage limits. Without a token, only the generic checks run (the payment
 * APIs always re-validate with userId before placing the order).
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json().catch(() => ({}));
        const code = body?.code;
        const items = Array.isArray(body?.items) ? body.items : [];

        if (!code || typeof code !== 'string') {
            return NextResponse.json({ ok: false, reason: 'Coupon code required' }, { status: 400 });
        }

        const supabase = createServerSupabase();

        // Optional auth — if a token is present, resolve user for per-user limit check
        let userId: string | null = null;
        const authHeader = req.headers.get('Authorization');
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            const { data: { user } } = await supabase.auth.getUser(token);
            if (user) userId = user.id;
        }

        const result = await validateCoupon(supabase, code, items, userId);

        if (!result.ok) {
            return NextResponse.json({ ok: false, reason: result.reason });
        }

        return NextResponse.json({
            ok: true,
            discount: result.discount,
            itemsTotal: result.itemsTotal,
            coupon: {
                code: result.coupon.code,
                description: result.coupon.description,
                discount_type: result.coupon.discount_type,
                discount_value: result.coupon.discount_value,
            },
        });
    } catch (err) {
        console.error('Coupon validate exception:', err);
        return NextResponse.json(
            { ok: false, reason: 'Server error validating coupon' },
            { status: 500 }
        );
    }
}
