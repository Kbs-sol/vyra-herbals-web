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

    // 1. Fetch Orders (Last 30 Days) for Revenue & Trends
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id, total_amount, created_at, payment_method, source, status')
      .gte('created_at', thirtyDaysAgo.toISOString())
      .in('status', ['placed', 'processing', 'shipped', 'delivered', 'pending']); // Only count valid intent orders (pending is whatsapp draft)

    if (ordersError) throw ordersError;

    // Aggregations
    let totalRevenue = 0;
    let webOrders = 0;
    let whatsappOrders = 0;
    let codOrders = 0;
    let onlineOrders = 0;

    // Group by day for chart
    const revenueByDay: Record<string, number> = {};

    orders?.forEach(order => {
      // Exclude failed or purely cancelled from revenue maybe, but let's just count generally
      if (order.status !== 'cancelled' && order.status !== 'failed') {
        const amount = Number(order.total_amount) || 0;
        totalRevenue += amount;
        
        // Day grouping (YYYY-MM-DD)
        const dateStr = order.created_at.split('T')[0];
        if (!revenueByDay[dateStr]) revenueByDay[dateStr] = 0;
        revenueByDay[dateStr] += amount;
      }

      // Platform split
      if (order.source === 'whatsapp') whatsappOrders++;
      else webOrders++;

      // Payment split
      if (order.payment_method === 'cod') codOrders++;
      else onlineOrders++;
    });

    const trendData = Object.keys(revenueByDay).sort().map(date => ({
      date,
      revenue: revenueByDay[date],
    }));

    // 2. Fetch Lead Counts
    // Abandoned Carts
    const { count: abandonedCount } = await supabase
      .from('abandoned_carts')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'open');

    // Anon Carts (Active/Guest Carts)
    const { count: anonCount } = await supabase
      .from('anon_carts')
      .select('*', { count: 'exact', head: true })
      .neq('items', '[]');
      
    // Historical Leads
    const { count: historicalCount } = await supabase
      .from('historical_leads')
      .select('*', { count: 'exact', head: true });

    return NextResponse.json({
      success: true,
      revenue: {
        total: totalRevenue,
        aov: orders && orders.length > 0 ? (totalRevenue / orders.length).toFixed(2) : 0,
        trend: trendData
      },
      splits: {
        web: webOrders,
        whatsapp: whatsappOrders,
        cod: codOrders,
        online: onlineOrders,
      },
      leads: {
        hot: (abandonedCount || 0) + (anonCount || 0), // Guest carts + Abandoned
        warm: 0, 
        cold: historicalCount || 0
      },
      totalOrders30Days: orders?.length || 0
    });
  } catch (err: any) {
    console.error('Analytics API Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
