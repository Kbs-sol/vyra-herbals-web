import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/utils/supabaseClient';
import { isRealOrderStatus, isSuccessfulOrderStatus } from '@/utils/orderStatus';
import { verifyAdminAuth } from '@/utils/adminAuth';


// Force dynamic — API routes touch Supabase / cookies; static analysis at build time would try
// to import the module without runtime env vars and blow up in 'collect page data'.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  if (!(await verifyAdminAuth(request))) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const supabase = createServerSupabase();
    
    // Date range from query params. `startDate`/`endDate` (YYYY-MM-DD) scope the
    // headline metrics to a selected month/range (dashboard month picker). When
    // absent, figures are all-time. `days` still drives the trailing "recent" window.
    const searchParams = request.nextUrl.searchParams;
    const days = parseInt(searchParams.get('days') || '30');
    const startParam = searchParams.get('startDate');
    const endParam = searchParams.get('endDate');

    const recentStart = new Date();
    recentStart.setDate(recentStart.getDate() - days);

    const rangeStart = startParam ? new Date(`${startParam}T00:00:00`) : null;
    const rangeEnd = endParam ? new Date(`${endParam}T23:59:59.999`) : null;
    const hasRange = !!(rangeStart || rangeEnd);

    // Fetch all orders
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (ordersError) throw ordersError;

    // Fetch products count
    const { count: productsCount } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true });

    // Fetch reviews count
    const { count: reviewsCount } = await supabase
      .from('reviews')
      .select('*', { count: 'exact', head: true });

    // Fetch pending reviews count
    const { count: pendingReviewsCount } = await supabase
      .from('reviews')
      .select('*', { count: 'exact', head: true })
      .eq('status', 0);

    // Fetch testimonials count
    const { count: testimonialsCount } = await supabase
      .from('testimonials')
      .select('*', { count: 'exact', head: true });

    // Only genuine orders count toward dashboard metrics. Abandoned/failed
    // online payments are NOT orders — counting their amount used to inflate
    // "Total Revenue" well above what was actually earned (the number that
    // looked like dummy data). `realOrders` excludes those; `successful` is the
    // subset that earned money (excludes cancelled too).
    const allOrders = (orders || []).filter(o => isRealOrderStatus(o.status));

    // Scope headline metrics to the selected month/range when one is supplied
    // (dashboard month picker); otherwise use all-time figures.
    const inRange = (o: any) => {
      const d = new Date(o.created_at);
      if (rangeStart && d < rangeStart) return false;
      if (rangeEnd && d > rangeEnd) return false;
      return true;
    };
    const scopedOrders = hasRange ? allOrders.filter(inRange) : allOrders;
    const successfulOrders = scopedOrders.filter(o => isSuccessfulOrderStatus(o.status));

    const totalOrders = scopedOrders.length;
    const ordersPlaced = scopedOrders.filter(o => o.status === 'placed').length;
    const ordersConfirmed = scopedOrders.filter(o => o.status === 'confirmed').length;
    const ordersShipped = scopedOrders.filter(o => o.status === 'shipped').length;
    const ordersDelivered = scopedOrders.filter(o => o.status === 'delivered').length;
    const ordersCancelled = scopedOrders.filter(o => o.status === 'cancelled').length;

    // Money actually earned from successful (paid/COD, non-cancelled) orders.
    const totalRevenue = successfulOrders
      .reduce((acc, o) => acc + (parseFloat(o.total_amount) || 0), 0);

    // "Total Revenue" the client displays: revenue from orders actually DELIVERED
    // (the requested definition — no dummy/inflated figures).
    const deliveredRevenue = scopedOrders
      .filter(o => o.status === 'delivered')
      .reduce((acc, o) => acc + (parseFloat(o.total_amount) || 0), 0);

    // Trailing `days` window (all-time source) used as a subtitle when no
    // explicit range is selected.
    const recentRevenue = allOrders
      .filter(o => new Date(o.created_at) >= recentStart && isSuccessfulOrderStatus(o.status))
      .reduce((acc, o) => acc + (parseFloat(o.total_amount) || 0), 0);

    // Payment method breakdown (scoped)
    const codOrders = scopedOrders.filter(o => o.payment_method === 'cod').length;
    const onlineOrders = scopedOrders.filter(o => o.payment_method === 'online').length;

    // Daily orders for chart (last 7 days) — real orders, revenue from successful ones
    const dailyOrders: Array<{ date: string; label: string; orders: number; revenue: number }> = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const dayOrders = allOrders.filter(o =>
        o.created_at && o.created_at.split('T')[0] === dateStr
      );
      dailyOrders.push({
        date: dateStr,
        label: date.toLocaleDateString('en-US', { weekday: 'short' }),
        orders: dayOrders.length,
        revenue: dayOrders
          .filter(o => isSuccessfulOrderStatus(o.status))
          .reduce((acc, o) => acc + (parseFloat(o.total_amount) || 0), 0)
      });
    }

    // Get recent 5 orders (scoped)
    const latestOrders = scopedOrders.slice(0, 5).map(o => ({
      id: o.id,
      total_amount: o.total_amount,
      status: o.status,
      payment_method: o.payment_method,
      created_at: o.created_at,
      customer: o.shipping_data?.name || o.shipping_data?.fullName || 'N/A'
    }));

    return NextResponse.json({
      success: true,
      data: {
        overview: {
          totalOrders,
          totalProducts: productsCount || 0,
          totalReviews: reviewsCount || 0,
          pendingReviews: pendingReviewsCount || 0,
          totalTestimonials: testimonialsCount || 0,
          totalRevenue,
          deliveredRevenue,
          recentRevenue,
        },
        range: {
          startDate: startParam,
          endDate: endParam,
          active: hasRange,
        },
        orderStats: {
          placed: ordersPlaced,
          confirmed: ordersConfirmed,
          shipped: ordersShipped,
          delivered: ordersDelivered,
          cancelled: ordersCancelled,
        },
        paymentStats: {
          cod: codOrders,
          online: onlineOrders,
        },
        dailyOrders,
        latestOrders,
      }
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}
