import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/utils/supabaseClient';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { getAdminJwtSecret } from '@/utils/serverEnv';


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

const sanitizeUpdatePayload = (body: any) => {
    const errors: string[] = [];
    const update: any = {};

    if (body?.code !== undefined) {
        const code = (body.code || '').toString().trim().toUpperCase();
        if (!code) errors.push('Code cannot be empty');
        else if (code.length > 50) errors.push('Code must be 50 characters or fewer');
        else update.code = code;
    }

    if (body?.discount_type !== undefined) {
        if (body.discount_type !== 'percent' && body.discount_type !== 'flat') {
            errors.push('discount_type must be "percent" or "flat"');
        } else {
            update.discount_type = body.discount_type;
        }
    }

    if (body?.discount_value !== undefined) {
        const v = Number(body.discount_value);
        if (!Number.isFinite(v) || v <= 0) errors.push('discount_value must be a positive number');
        else update.discount_value = v;
    }

    if (body?.description !== undefined) {
        update.description = (body.description || '').toString().slice(0, 500) || null;
    }

    if (body?.min_order_amount !== undefined) {
        const v = body.min_order_amount === '' || body.min_order_amount === null ? 0 : Number(body.min_order_amount);
        if (!Number.isFinite(v) || v < 0) errors.push('min_order_amount must be 0 or greater');
        else update.min_order_amount = v;
    }

    if (body?.max_discount_amount !== undefined) {
        if (body.max_discount_amount === null || body.max_discount_amount === '') {
            update.max_discount_amount = null;
        } else {
            const v = Number(body.max_discount_amount);
            if (!Number.isFinite(v) || v <= 0) errors.push('max_discount_amount must be positive');
            else update.max_discount_amount = v;
        }
    }

    if (body?.usage_limit !== undefined) {
        if (body.usage_limit === null || body.usage_limit === '') {
            update.usage_limit = null;
        } else {
            const v = parseInt(body.usage_limit, 10);
            if (!Number.isInteger(v) || v < 1) errors.push('usage_limit must be a positive integer');
            else update.usage_limit = v;
        }
    }

    if (body?.per_user_limit !== undefined) {
        if (body.per_user_limit === null || body.per_user_limit === '') {
            update.per_user_limit = null;
        } else {
            const v = parseInt(body.per_user_limit, 10);
            if (!Number.isInteger(v) || v < 1) errors.push('per_user_limit must be a positive integer');
            else update.per_user_limit = v;
        }
    }

    if (body?.starts_at !== undefined) {
        update.starts_at = body.starts_at ? new Date(body.starts_at).toISOString() : null;
    }
    if (body?.expires_at !== undefined) {
        update.expires_at = body.expires_at ? new Date(body.expires_at).toISOString() : null;
    }
    if (
        update.starts_at &&
        update.expires_at &&
        new Date(update.starts_at) >= new Date(update.expires_at)
    ) {
        errors.push('expires_at must be after starts_at');
    }

    if (body?.is_active !== undefined) {
        update.is_active = !!body.is_active;
    }

    if (
        update.discount_type === 'percent' &&
        typeof update.discount_value === 'number' &&
        update.discount_value > 100
    ) {
        errors.push('Percent discount cannot exceed 100');
    }

    update.updated_at = new Date().toISOString();
    return { errors, update };
};

// PUT: update a coupon
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const isAdmin = await verifyAdmin();
        if (!isAdmin) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
        }

        const { id } = await params;
        const couponId = parseInt(id, 10);
        if (!Number.isInteger(couponId)) {
            return NextResponse.json({ success: false, error: 'Invalid id' }, { status: 400 });
        }

        const body = await request.json();
        const { errors, update } = sanitizeUpdatePayload(body);
        if (errors.length) {
            return NextResponse.json({ success: false, error: errors.join('; ') }, { status: 400 });
        }

        const supabase = createServerSupabase();
        const { data, error } = await supabase
            .from('coupons')
            .update(update)
            .eq('id', couponId)
            .select()
            .single();

        if (error) {
            if (error.code === '23505' || error.message?.includes('duplicate')) {
                return NextResponse.json(
                    { success: false, error: 'Coupon code already exists' },
                    { status: 409 }
                );
            }
            console.error('Admin coupons update error:', error);
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, data });
    } catch (err) {
        console.error('Admin coupons PUT exception:', err);
        return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
    }
}

// DELETE: remove a coupon
export async function DELETE(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const isAdmin = await verifyAdmin();
        if (!isAdmin) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
        }

        const { id } = await params;
        const couponId = parseInt(id, 10);
        if (!Number.isInteger(couponId)) {
            return NextResponse.json({ success: false, error: 'Invalid id' }, { status: 400 });
        }

        const supabase = createServerSupabase();
        const { error } = await supabase.from('coupons').delete().eq('id', couponId);

        if (error) {
            console.error('Admin coupons delete error:', error);
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('Admin coupons DELETE exception:', err);
        return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
    }
}
