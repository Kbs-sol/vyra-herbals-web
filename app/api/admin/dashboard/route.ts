import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/utils/supabaseClient';
import { isRealOrderStatus, isSuccessfulOrderStatus } from '@/utils/orderStatus';
import { verifyAdminAuth } from '@/utils/adminAuth';

export async function GET(request: NextRequest) {
  if (!(await verifyAdminAuth(request))) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const supabase = createServerSupabase();
    
    // Get date range from query params
    const searchParams = request.nextUrl.searchParams;
    const days = parseInt(searchParams.get('days') || '30');
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

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
    const successfulOrders = allOrders.filter(o => isSuccessfulOrderStatus(o.status));
    const totalOrders = allOrders.length;
    const ordersPlaced = allOrders.filter(o => o.status === 'placed').length;
    const ordersConfirmed = allOrders.filter(o => o.status === 'confirmed').length;
    const ordersShipped = allOrders.filter(o => o.status === 'shipped').length;
    const ordersDelivered = allOrders.filter(o => o.status === 'delivered').length;
    const ordersCancelled = allOrders.filter(o => o.status === 'cancelled').length;

    // Revenue = money actually earned: successful (paid/COD, non-cancelled) orders.
    const totalRevenue = successfulOrders
      .reduce((acc, o) => acc + (parseFloat(o.total_amount) || 0), 0);

    const deliveredRevenue = allOrders
      .filter(o => o.status === 'delivered')
      .reduce((acc, o) => acc + (parseFloat(o.total_amount) || 0), 0);

    // Calculate recent orders (within date range)
    const recentOrders = allOrders.filter(o => {
      const orderDate = new Date(o.created_at);
      return orderDate >= startDate;
    });

    const recentRevenue = recentOrders
      .filter(o => isSuccessfulOrderStatus(o.status))
      .reduce((acc, o) => acc + (parseFloat(o.total_amount) || 0), 0);

    // Payment method breakdown (real orders only)
    const codOrders = allOrders.filter(o => o.payment_method === 'cod').length;
    const onlineOrders = allOrders.filter(o => o.payment_method === 'online').length;

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

    // Get recent 5 orders
    const latestOrders = allOrders.slice(0, 5).map(o => ({
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
