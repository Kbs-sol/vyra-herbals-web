import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import * as jose from 'jose';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key-here');

async function verifyAuth(request: NextRequest) {
  const token = request.cookies.get('admin_token')?.value;
  if (!token) return false;

  try {
    await jose.jwtVerify(token, JWT_SECRET);
    return true;
  } catch {
    return false;
  }
}

// GET - Fetch all customers with order statistics
export async function GET(request: NextRequest) {
  if (!await verifyAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const sortBy = searchParams.get('sortBy') || 'totalSpent';
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc';

    // Only count successfully placed orders (exclude pending/failed/cancelled)
    const SUCCESSFUL_STATUSES = ['placed', 'confirmed', 'shipped', 'delivered'];

    // Get unique customers from orders
    let query = supabase
      .from('orders')
      .select('shipping_data, total_amount, created_at, status')
      .in('status', SUCCESSFUL_STATUSES);

    const { data: orders, error } = await query;

    if (error) throw error;

    // Process orders to extract unique customers
    const customerMap = new Map<string, any>();

    orders?.forEach((order: any) => {
      const shipping = order.shipping_data || {};
      const identifier = shipping.email || shipping.phone || shipping.mobile || 'unknown';

      if (identifier === 'unknown') return;

      if (!customerMap.has(identifier)) {
        customerMap.set(identifier, {
          id: identifier,
          name: shipping.name || shipping.fullName || 'Unknown',
          email: shipping.email || '',
          phone: shipping.phone || shipping.mobile || '',
          address: [shipping.address, shipping.city, shipping.state, shipping.pincode].filter(Boolean).join(', '),
          orderCount: 0,
          totalSpent: 0,
          lastOrderDate: null,
          status: 'active'
        });
      }

      const customer = customerMap.get(identifier);
      customer.orderCount += 1;
      customer.totalSpent += order.total_amount || 0;

      const orderDate = new Date(order.created_at);
      if (!customer.lastOrderDate || orderDate > new Date(customer.lastOrderDate)) {
        customer.lastOrderDate = order.created_at;
      }
    });

    let customers = Array.from(customerMap.values());

    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase();
      customers = customers.filter(c =>
        c.name.toLowerCase().includes(searchLower) ||
        c.email.toLowerCase().includes(searchLower) ||
        c.phone.includes(search)
      );
    }

    // Sort
    const dir = sortOrder === 'asc' ? 1 : -1;
    customers.sort((a, b) => {
      switch (sortBy) {
        case 'orderCount':
          return (a.orderCount - b.orderCount) * dir;
        case 'lastOrderDate': {
          const aTime = a.lastOrderDate ? new Date(a.lastOrderDate).getTime() : 0;
          const bTime = b.lastOrderDate ? new Date(b.lastOrderDate).getTime() : 0;
          return (aTime - bTime) * dir;
        }
        case 'name':
          return a.name.localeCompare(b.name) * dir;
        case 'totalSpent':
        default:
          return (a.totalSpent - b.totalSpent) * dir;
      }
    });

    // Overall totals across all customers (after search filter, before pagination)
    const totalRevenue = customers.reduce((sum, c) => sum + c.totalSpent, 0);
    const totalOrders = customers.reduce((sum, c) => sum + c.orderCount, 0);

    // Paginate
    const total = customers.length;
    const start = (page - 1) * limit;
    const paginatedCustomers = customers.slice(start, start + limit);

    return NextResponse.json({
      success: true,
      data: paginatedCustomers,
      totals: {
        totalRevenue,
        totalOrders,
        totalCustomers: total,
        avgCustomerValue: total > 0 ? totalRevenue / total : 0,
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      }
    });
  } catch (error: any) {
    console.error('Error fetching customers:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch customers' },
      { status: 500 }
    );
  }
}
