import type { SupabaseClient } from '@supabase/supabase-js';

export type CouponRow = {
    id: number;
    code: string;
    description: string | null;
    discount_type: 'percent' | 'flat';
    discount_value: number;
    min_order_amount: number | null;
    max_discount_amount: number | null;
    usage_limit: number | null;
    per_user_limit: number | null;
    used_count: number | null;
    starts_at: string | null;
    expires_at: string | null;
    is_active: boolean;
};

export type CouponItem = {
    id?: number | string;
    price: number;
    quantity: number;
};

export type CouponValidationResult =
    | {
        ok: true;
        coupon: CouponRow;
        discount: number;
        itemsTotal: number;
    }
    | {
        ok: false;
        reason: string;
    };

const sumItems = (items: CouponItem[] | undefined | null): number =>
    (items || []).reduce(
        (sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 0),
        0
    );

const computeDiscount = (coupon: CouponRow, itemsTotal: number): number => {
    let discount = 0;
    if (coupon.discount_type === 'percent') {
        discount = Math.round((itemsTotal * Number(coupon.discount_value)) / 100);
        if (coupon.max_discount_amount && discount > Number(coupon.max_discount_amount)) {
            discount = Number(coupon.max_discount_amount);
        }
    } else {
        discount = Math.round(Number(coupon.discount_value));
    }
    // Discount can never exceed the items total
    if (discount > itemsTotal) discount = itemsTotal;
    if (discount < 0) discount = 0;
    return discount;
};

/**
 * Validate a coupon code against a cart and (optionally) a user.
 * - Looks up the coupon case-insensitively
 * - Checks active flag, validity window, min order, total/per-user usage caps
 * - Computes the discount server-side from raw item prices/quantities
 */
export async function validateCoupon(
    supabase: SupabaseClient,
    rawCode: string | null | undefined,
    items: CouponItem[],
    userId?: string | null
): Promise<CouponValidationResult> {
    const code = (rawCode || '').trim();
    if (!code) return { ok: false, reason: 'No coupon code provided' };

    // Case-insensitive lookup
    const { data: coupons, error } = await supabase
        .from('coupons')
        .select('*')
        .ilike('code', code)
        .limit(1);

    if (error) {
        // Table missing (feature not migrated yet) — treat as invalid coupon, not a 500
        if (error.code === '42P01' || error.message?.includes('coupons')) {
            return { ok: false, reason: 'Coupon feature not configured' };
        }
        console.error('Coupon lookup error:', error);
        return { ok: false, reason: 'Coupon lookup failed' };
    }

    const coupon = (coupons && coupons[0]) as CouponRow | undefined;
    if (!coupon) return { ok: false, reason: 'Invalid coupon code' };

    if (!coupon.is_active) return { ok: false, reason: 'Coupon is not active' };

    const now = new Date();
    if (coupon.starts_at && new Date(coupon.starts_at) > now) {
        return { ok: false, reason: 'Coupon is not active yet' };
    }
    if (coupon.expires_at && new Date(coupon.expires_at) < now) {
        return { ok: false, reason: 'Coupon has expired' };
    }

    const itemsTotal = sumItems(items);
    if (itemsTotal <= 0) return { ok: false, reason: 'Cart is empty' };

    if (coupon.min_order_amount && itemsTotal < Number(coupon.min_order_amount)) {
        return {
            ok: false,
            reason: `Minimum order amount of ₹${coupon.min_order_amount} required`,
        };
    }

    // Total usage limit
    if (coupon.usage_limit !== null && coupon.usage_limit !== undefined) {
        const used = Number(coupon.used_count || 0);
        if (used >= Number(coupon.usage_limit)) {
            return { ok: false, reason: 'Coupon usage limit reached' };
        }
    }

    // Per-user usage limit
    if (
        userId &&
        coupon.per_user_limit !== null &&
        coupon.per_user_limit !== undefined
    ) {
        const { count: userUsage, error: usageError } = await supabase
            .from('coupon_usages')
            .select('id', { count: 'exact', head: true })
            .eq('coupon_id', coupon.id)
            .eq('user_id', userId);

        if (usageError) {
            console.error('Coupon usage lookup error:', usageError);
        } else if ((userUsage || 0) >= Number(coupon.per_user_limit)) {
            return { ok: false, reason: 'You have already used this coupon' };
        }
    }

    const discount = computeDiscount(coupon, itemsTotal);
    if (discount <= 0) {
        return { ok: false, reason: 'Coupon does not apply to this cart' };
    }

    return { ok: true, coupon, discount, itemsTotal };
}

/**
 * Record a coupon redemption after an order is successfully placed.
 * Increments used_count atomically (best-effort) and inserts a usage row.
 */
export async function recordCouponUsage(
    supabase: SupabaseClient,
    couponId: number,
    userId: string | null | undefined,
    orderId: number | null | undefined,
    discountAmount: number
): Promise<void> {
    try {
        await supabase.from('coupon_usages').insert([
            {
                coupon_id: couponId,
                user_id: userId || null,
                order_id: orderId || null,
                discount_amount: discountAmount,
            },
        ]);

        // Increment used_count. We re-read and write — race-tolerant for low traffic;
        // for hot coupons, replace with an SQL function (RPC) that does it atomically.
        const { data: row } = await supabase
            .from('coupons')
            .select('used_count')
            .eq('id', couponId)
            .maybeSingle();

        const next = Number(row?.used_count || 0) + 1;
        await supabase
            .from('coupons')
            .update({ used_count: next, updated_at: new Date().toISOString() })
            .eq('id', couponId);
    } catch (e) {
        console.error('recordCouponUsage failed:', e);
    }
}
