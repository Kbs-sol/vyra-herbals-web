import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/utils/adminAuth';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  if (!(await verifyAdminAuth(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = getSupabaseAdmin();

    // ── 1. Orders (last 30 days) ─────────────────────────────────────────
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id, total_amount, created_at, payment_method, source, status')
      .gte('created_at', thirtyDaysAgo.toISOString())
      // Include all statuses that represent real purchase intent:
      // 'pending' = WhatsApp COD draft; still a valid lead signal
      .in('status', ['placed', 'processing', 'shipped', 'delivered', 'pending']);

    if (ordersError) throw ordersError;

    // ── 2. Aggregate revenue & splits ────────────────────────────────────
    let totalRevenue = 0;
    let webOrders = 0;
    let whatsappOrders = 0;
    let codOrders = 0;
    let onlineOrders = 0;
    const revenueByDay: Record<string, number> = {};

    for (const order of orders ?? []) {
      if (order.status !== 'cancelled' && order.status !== 'failed') {
        const amount = Number(order.total_amount) || 0;
        totalRevenue += amount;

        const dateStr = (order.created_at as string).split('T')[0];
        revenueByDay[dateStr] = (revenueByDay[dateStr] ?? 0) + amount;
      }

      if (order.source === 'whatsapp') whatsappOrders++;
      else webOrders++;

      if (order.payment_method === 'cod') codOrders++;
      else onlineOrders++;
    }

    const trendData = Object.keys(revenueByDay)
      .sort()
      .map((date) => ({ date, revenue: revenueByDay[date] }));

    const orderCount = orders?.length ?? 0;
    const aov = orderCount > 0 ? (totalRevenue / orderCount).toFixed(2) : '0.00';

    // ── 3. Lead counts ───────────────────────────────────────────────────

    // Hot Leads: abandoned checkouts + active anonymous carts
    const { count: abandonedCount } = await supabase
      .from('abandoned_carts')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'open');

    const { count: anonCount } = await supabase
      .from('anon_carts')
      .select('*', { count: 'exact', head: true })
      .neq('items', '[]');

    // Warm Leads: wishlist items with no completed order
    const { count: wishlistCount } = await supabase
      .from('wishlist')
      .select('*', { count: 'exact', head: true });

    // Cold Leads: historical / imported leads
    const { count: historicalCount } = await supabase
      .from('historical_leads')
      .select('*', { count: 'exact', head: true });

    return NextResponse.json({
      success: true,
      revenue: {
        total: totalRevenue,
        aov,
        trend: trendData,
      },
      splits: {
        web: webOrders,
        whatsapp: whatsappOrders,
        cod: codOrders,
        online: onlineOrders,
      },
      leads: {
        hot: (abandonedCount ?? 0) + (anonCount ?? 0),
        warm: wishlistCount ?? 0,
        cold: historicalCount ?? 0,
      },
      totalOrders30Days: orderCount,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[analytics] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
