import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/utils/supabaseClient';


// Force dynamic — API routes touch Supabase / cookies; static analysis at build time would try
// to import the module without runtime env vars and blow up in 'collect page data'.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET: Check if the current user is eligible for the welcome coupon
export async function GET(request: NextRequest) {
    try {
        const supabase = createServerSupabase();

        // 1. Get user from auth token
        const authHeader = request.headers.get('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({
                eligible: false,
                reason: 'Not authenticated'
            });
        }

        const token = authHeader.substring(7);
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            return NextResponse.json({
                eligible: false,
                reason: 'Invalid token'
            });
        }

        // 2. Check if welcome coupon is enabled
        const { data: settingsRow, error: settingsError } = await supabase
            .from('site_settings')
            .select('value')
            .eq('key', 'welcome_coupon')
            .maybeSingle();

        if (settingsError) {
            if (settingsError.code === '42P01' || settingsError.message?.includes('site_settings')) {
                console.warn('site_settings table not found - welcome coupon feature needs DB migration');
                return NextResponse.json({ eligible: false, reason: 'Feature not configured' });
            }
            console.error('Welcome coupon settings error:', settingsError);
            return NextResponse.json({ eligible: false, reason: 'Settings error' });
        }

        const couponConfig = settingsRow?.value;
        if (!couponConfig || !couponConfig.enabled) {
            return NextResponse.json({
                eligible: false,
                reason: 'Welcome coupon is disabled'
            });
        }

        // 3. Check if user has any previous orders
        const { count, error: ordersError } = await supabase
            .from('orders')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id);

        if (ordersError) {
            console.error('Orders count error:', ordersError);
            return NextResponse.json({ eligible: false, reason: 'Orders check error' });
        }

        if ((count || 0) > 0) {
            return NextResponse.json({
                eligible: false,
                reason: 'User already has orders'
            });
        }

        // 4. User is eligible!
        return NextResponse.json({
            eligible: true,
            discount_percent: couponConfig.discount_percent || 10
        });
    } catch (err) {
        console.error('Welcome coupon check exception:', err);
        return NextResponse.json({
            eligible: false,
            reason: 'Server error'
        }, { status: 500 });
    }
}
