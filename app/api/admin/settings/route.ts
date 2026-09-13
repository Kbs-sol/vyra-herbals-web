import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/utils/supabaseClient';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { getAdminJwtSecret } from '@/utils/serverEnv';



// Force dynamic — API routes touch Supabase / cookies; static analysis at build time would try
// to import the module without runtime env vars and blow up in 'collect page data'.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Verify admin JWT token from cookies
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

// GET: Fetch all settings or a specific setting by key
export async function GET(request: NextRequest) {
    try {
        const url = new URL(request.url);
        const key = url.searchParams.get('key');

        const supabase = createServerSupabase();

        if (key) {
            const { data, error } = await supabase
                .from('site_settings')
                .select('*')
                .eq('key', key)
                .maybeSingle();

            if (error) {
                // If table doesn't exist, return defaults
                if (error.code === '42P01' || error.message?.includes('site_settings')) {
                    console.warn('site_settings table not found, returning defaults');
                    if (key === 'welcome_coupon') {
                        return NextResponse.json({ success: true, data: { key: 'welcome_coupon', value: { enabled: true, discount_percent: 10 } } });
                    }
                    return NextResponse.json({ success: true, data: null });
                }
                console.error('Settings fetch error:', error);
                return NextResponse.json({ success: false, error: error.message }, { status: 500 });
            }

            return NextResponse.json({ success: true, data });
        }

        // Fetch all settings
        const { data, error } = await supabase
            .from('site_settings')
            .select('*');

        if (error) {
            // If table doesn't exist, return empty defaults
            if (error.code === '42P01' || error.message?.includes('site_settings')) {
                console.warn('site_settings table not found, returning empty settings');
                return NextResponse.json({ success: true, data: {} });
            }
            console.error('Settings fetch error:', error);
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        // Convert to a key-value map for convenience
        const settingsMap: Record<string, any> = {};
        (data || []).forEach((row: any) => {
            settingsMap[row.key] = row.value;
        });

        return NextResponse.json({ success: true, data: settingsMap });
    } catch (err) {
        console.error('Settings GET exception:', err);
        return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
    }
}

// PUT: Update a setting (admin-only)
export async function PUT(request: NextRequest) {
    try {
        // Verify admin authentication
        const isAdmin = await verifyAdmin();
        if (!isAdmin) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized - Admin access required' },
                { status: 403 }
            );
        }

        const body = await request.json();
        const { key, value } = body;

        if (!key || value === undefined) {
            return NextResponse.json(
                { success: false, error: 'key and value are required' },
                { status: 400 }
            );
        }

        // Validate welcome_coupon settings specifically
        if (key === 'welcome_coupon') {
            if (typeof value.enabled !== 'boolean') {
                return NextResponse.json(
                    { success: false, error: 'enabled must be a boolean' },
                    { status: 400 }
                );
            }
            const percent = Number(value.discount_percent);
            if (isNaN(percent) || percent < 1 || percent > 100) {
                return NextResponse.json(
                    { success: false, error: 'discount_percent must be between 1 and 100' },
                    { status: 400 }
                );
            }
            // Sanitize
            value.discount_percent = percent;
        }

        const supabase = createServerSupabase();

        const { data, error } = await supabase
            .from('site_settings')
            .upsert({
                key,
                value,
                updated_at: new Date().toISOString()
            }, { onConflict: 'key' })
            .select()
            .single();

        if (error) {
            console.error('Settings update error:', error);
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, data });
    } catch (err) {
        console.error('Settings PUT exception:', err);
        return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
    }
}
