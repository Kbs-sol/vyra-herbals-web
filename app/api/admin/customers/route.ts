import { NextRequest, NextResponse } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { SUCCESSFUL_ORDER_STATUSES } from '@/utils/orderStatus';
import { verifyAdminAuth } from '@/utils/adminAuth';


// Force dynamic — API routes touch Supabase / cookies; static analysis at build time would try
// to import the module without runtime env vars and blow up in 'collect page data'.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Lazy Supabase init.
//
// The previous version constructed the client at module top level:
//
//   const supabase = createClient(URL!, KEY!);
//
// Next.js 15's "Collecting page data" pass imports every route module before
// production env vars are guaranteed to be present. If SUPABASE_SERVICE_ROLE_KEY
// isn't populated at that moment, createClient() throws `Error: supabaseKey is
// required.` and the whole build fails — which is exactly what happened on
// Vercel deployments dpl_BxY5jGmHi… / dpl_3e8fXPoVee… (commit 2dc01e8).
//
// Deferring construction until the first request keeps admin-panel behaviour
// unchanged (fail loudly at request time if the env is really missing) without
// breaking the build.
let _supabase: SupabaseClient | null = null;
function supabase(): SupabaseClient {
  if (_supabase) return _supabase;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      'SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing at /api/admin/customers request time',
    );
  }
  _supabase = createClient(url, key);
  return _supabase;
}

// GET - Fetch all customers with order statistics
export async function GET(request: NextRequest) {
  if (!(await verifyAdminAuth(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const sortBy = searchParams.get('sortBy') || 'totalSpent';
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc';
    const filter = searchParams.get('filter') || 'all';

    // Only count successfully placed orders (exclude pending/failed/cancelled).
    // Uses the shared definition so this can never drift from the dashboard.
    const SUCCESSFUL_STATUSES = SUCCESSFUL_ORDER_STATUSES as unknown as string[];

    // Get unique customers from orders
    let query = supabase()
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
          // Filled in from the `users` table below when this shopper has an
          // account. Order rows carry no registration date of their own, so a
          // guest checkout legitimately stays null.
          registeredAt: null,
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

    // ---- Merge in registered users who logged in but haven't purchased ----
    // These "leads" never appear in the orders table, but the admin still wants
    // their name + mobile. Phone may live on the users row, or be embedded in the
    // OTP internal email (`<phone>@phone.internal`).
    const norm10 = (p: any) => {
      const d = String(p || '').replace(/\D/g, '');
      return d.length > 10 ? d.slice(-10) : d;
    };
    // Email/phone of everyone who already appears via their orders, mapped to the
    // record itself so a matched `users` row can hand over its signup date.
    const purchaserByKey = new Map<string, any>();
    customerMap.forEach((c) => {
      if (c.email) {
        purchaserByKey.set(String(c.email).toLowerCase(), c);
      }
      const ph = norm10(c.phone);
      if (ph) {
        purchaserByKey.set(ph, c);
      }
    });

    const { data: users } = await supabase()
      .from('users')
      .select('id, name, email, phone, created_at, role');

    (users || []).forEach((u: any) => {
      if (u.role === 2) return; // skip admins
      const rawEmail = String(u.email || '').toLowerCase();
      const isInternal = rawEmail.endsWith('@phone.internal');
      let phone = norm10(u.phone);
      if (!phone && isInternal) phone = norm10(rawEmail.split('@')[0]);
      const email = isInternal ? '' : rawEmail;

      // Already counted via their orders (matched by email or phone)? Hand over
      // the registration date before skipping, so "Customer Since" is accurate
      // for purchasers too instead of reading N/A for everyone who has ordered.
      const matched = (email ? purchaserByKey.get(email) : undefined)
        || (phone ? purchaserByKey.get(phone) : undefined);
      if (matched) {
        if (!matched.registeredAt) matched.registeredAt = u.created_at || null;
        return;
      }

      const identifier = `user:${u.id}`;
      if (customerMap.has(identifier)) return;
      customerMap.set(identifier, {
        id: identifier,
        name: u.name || 'Unknown',
        email: email || '',
        phone: phone || '',
        address: '',
        orderCount: 0,
        totalSpent: 0,
        lastOrderDate: null,
        registeredAt: u.created_at || null,
        status: 'lead', // registered but hasn't purchased yet
      });
    });

    let customers = Array.from(customerMap.values());

    // Apply filter for all/purchasers/leads
    if (filter === 'purchasers') {
      customers = customers.filter(c => c.orderCount > 0);
    } else if (filter === 'leads') {
      customers = customers.filter(c => c.orderCount === 0);
    }

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
    // Null/unparseable timestamps must not fall through to 0 — that would make a
    // customer with no registration date look like the *oldest* record on an
    // ascending sort. Returning null lets the comparator sink them to the bottom
    // in both directions instead.
    const toTime = (value: any): number | null => {
      if (!value) return null;
      const time = new Date(value).getTime();
      return Number.isFinite(time) ? time : null;
    };
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
        case 'registeredAt': {
          const aTime = toTime(a.registeredAt);
          const bTime = toTime(b.registeredAt);
          if (aTime === null && bTime === null) return 0;
          if (aTime === null) return 1;
          if (bTime === null) return -1;
          return (aTime - bTime) * dir;
        }
        case 'totalSpent':
        default:
          return (a.totalSpent - b.totalSpent) * dir;
      }
    });

    // Overall totals across all customers (after search filter, before pagination)
    const totalRevenue = customers.reduce((sum, c) => sum + c.totalSpent, 0);
    const totalOrders = customers.reduce((sum, c) => sum + c.orderCount, 0);
    const payingCustomers = customers.filter(c => c.orderCount > 0).length;

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
        avgCustomerValue: payingCustomers > 0 ? totalRevenue / payingCustomers : 0,
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
