import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/utils/supabaseClient';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { getAdminJwtSecret } from '@/utils/serverEnv';



// Force dynamic — API routes touch Supabase / cookies; static analysis at build time would try
// to import the module without runtime env vars and blow up in 'collect page data'.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function verifyAdmin(): Promise<boolean> {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('admin_token')?.value;
        if (!token) return false;
        const { payload } = await jwtVerify(token, getAdminJwtSecret());
        return payload.role === 'admin';
    } catch {
        return false;
    }
}

const TABLE_MISSING = (err: any) =>
    err?.code === '42P01' || (typeof err?.message === 'string' && err.message.includes('coupons'));

const sanitizeCouponPayload = (body: any) => {
    const errors: string[] = [];

    const code = (body?.code || '').toString().trim().toUpperCase();
    if (!code) errors.push('Code is required');
    if (code.length > 50) errors.push('Code must be 50 characters or fewer');

    const discount_type = (body?.discount_type || '').toString();
    if (discount_type !== 'percent' && discount_type !== 'flat') {
        errors.push('discount_type must be "percent" or "flat"');
    }

    const discount_value = Number(body?.discount_value);
    if (!Number.isFinite(discount_value) || discount_value <= 0) {
        errors.push('discount_value must be a positive number');
    } else if (discount_type === 'percent' && discount_value > 100) {
        errors.push('Percent discount cannot exceed 100');
    }

    const min_order_amount =
        body?.min_order_amount === null || body?.min_order_amount === ''
            ? 0
            : Number(body?.min_order_amount);
    if (!Number.isFinite(min_order_amount) || min_order_amount < 0) {
        errors.push('min_order_amount must be 0 or greater');
    }

    let max_discount_amount: number | null = null;
    if (body?.max_discount_amount !== undefined && body?.max_discount_amount !== null && body?.max_discount_amount !== '') {
        max_discount_amount = Number(body.max_discount_amount);
        if (!Number.isFinite(max_discount_amount) || max_discount_amount <= 0) {
            errors.push('max_discount_amount must be a positive number');
        }
    }

    let usage_limit: number | null = null;
    if (body?.usage_limit !== undefined && body?.usage_limit !== null && body?.usage_limit !== '') {
        usage_limit = parseInt(body.usage_limit, 10);
        if (!Number.isInteger(usage_limit) || usage_limit < 1) {
            errors.push('usage_limit must be a positive integer');
        }
    }

    let per_user_limit: number | null = 1;
    if (body?.per_user_limit !== undefined) {
        if (body.per_user_limit === null || body.per_user_limit === '') {
            per_user_limit = null; // unlimited
        } else {
            per_user_limit = parseInt(body.per_user_limit, 10);
            if (!Number.isInteger(per_user_limit) || per_user_limit < 1) {
                errors.push('per_user_limit must be a positive integer (or empty for unlimited)');
            }
        }
    }

    const starts_at = body?.starts_at ? new Date(body.starts_at).toISOString() : null;
    const expires_at = body?.expires_at ? new Date(body.expires_at).toISOString() : null;

    if (starts_at && expires_at && new Date(starts_at) >= new Date(expires_at)) {
        errors.push('expires_at must be after starts_at');
    }

    return {
        errors,
        payload: {
            code,
            description: (body?.description || '').toString().slice(0, 500) || null,
            discount_type,
            discount_value,
            min_order_amount,
            max_discount_amount,
            usage_limit,
            per_user_limit,
            starts_at,
            expires_at,
            is_active: body?.is_active === undefined ? true : !!body.is_active,
        },
    };
};

// GET: list coupons (admin)
export async function GET(request: NextRequest) {
    try {
        const isAdmin = await verifyAdmin();
        if (!isAdmin) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
        }

        const url = new URL(request.url);
        const search = (url.searchParams.get('search') || '').trim();
        const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
        const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '20', 10)));

        const supabase = createServerSupabase();
        let query = supabase
            .from('coupons')
            .select('*', { count: 'exact' })
            .order('created_at', { ascending: false });

        if (search) {
            // search by code or description
            query = query.or(`code.ilike.%${search}%,description.ilike.%${search}%`);
        }

        const from = (page - 1) * limit;
        const to = from + limit - 1;
        query = query.range(from, to);

        const { data, error, count } = await query;
        if (error) {
            if (TABLE_MISSING(error)) {
                return NextResponse.json({
                    success: true,
                    data: [],
                    pagination: { page, limit, total: 0, totalPages: 0 },
                    needsMigration: true,
                });
            }
            console.error('Admin coupons list error:', error);
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            data: data || [],
            pagination: {
                page,
                limit,
                total: count || 0,
                totalPages: Math.ceil((count || 0) / limit),
            },
        });
    } catch (err) {
        console.error('Admin coupons GET exception:', err);
        return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
    }
}

// POST: create a coupon
export async function POST(request: NextRequest) {
    try {
        const isAdmin = await verifyAdmin();
        if (!isAdmin) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
        }

        const body = await request.json();
        const { errors, payload } = sanitizeCouponPayload(body);
        if (errors.length) {
            return NextResponse.json({ success: false, error: errors.join('; ') }, { status: 400 });
        }

        const supabase = createServerSupabase();
        const { data, error } = await supabase
            .from('coupons')
            .insert([payload])
            .select()
            .single();

        if (error) {
            if (error.code === '23505' || error.message?.includes('duplicate')) {
                return NextResponse.json(
                    { success: false, error: 'Coupon code already exists' },
                    { status: 409 }
                );
            }
            if (TABLE_MISSING(error)) {
                return NextResponse.json(
                    { success: false, error: 'Coupons table not found. Run CUSTOM_COUPONS_SETUP.sql first.' },
                    { status: 500 }
                );
            }
            console.error('Admin coupons create error:', error);
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, data });
    } catch (err) {
        console.error('Admin coupons POST exception:', err);
        return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
    }
}
