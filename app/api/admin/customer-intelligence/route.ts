import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/utils/adminAuth';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(request: NextRequest) {
  if (!(await verifyAdminAuth(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const tab = searchParams.get('tab') || 'abandoned';
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const format = searchParams.get('format');
    const start = (page - 1) * limit;
    const end = start + limit - 1;

    const supabase = getSupabaseAdmin();
    let data: any[] = [];
    let count = 0;

    if (tab === 'abandoned') {
      // Query abandoned_carts
      let abandonedQuery = supabase
        .from('abandoned_carts')
        .select('*')
        .eq('status', 'open')
        .lt('last_activity_at', new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString());
      
      const { data: abandonedData, error: abandonedError } = await abandonedQuery;
      if (abandonedError) throw abandonedError;

      // Query anon_carts
      let anonQuery = supabase
        .from('anon_carts')
        .select('*')
        .lt('last_updated', new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString())
        .neq('items', '[]');
      
      const { data: anonData, error: anonError } = await anonQuery;
      if (anonError) throw anonError;

      let merged = [
        ...(abandonedData || []).map(item => ({ ...item, type: 'abandoned', phone: item.phone || 'Unknown' })),
        ...(anonData || []).map(item => ({ ...item, type: 'anon', phone: 'Anonymous' }))
      ];

      if (search) {
        const lowerSearch = search.toLowerCase();
        merged = merged.filter(item => item.phone.toLowerCase().includes(lowerSearch));
      }

      // Descending by date
      merged.sort((a, b) => new Date(b.created_at || b.last_updated).getTime() - new Date(a.created_at || a.last_updated).getTime());

      count = merged.length;
      data = format === 'csv' ? merged : merged.slice(start, end + 1);

    } else if (tab === 'wishlist') {
      // Query wishlist JOIN users JOIN products
      const { data: wishlistData, error } = await supabase
        .from('wishlist')
        .select(`
          id,
          created_at,
          user_id,
          users ( name, phone, created_at ),
          products ( title )
        `);
      
      if (error) throw error;

      // Group by user
      const userMap = new Map<string, any>();
      for (const item of (wishlistData || [])) {
        if (!item.users || !item.products) continue;
        const uid = item.user_id;
        const userObj: any = Array.isArray(item.users) ? item.users[0] : item.users;
        const productObj: any = Array.isArray(item.products) ? item.products[0] : item.products;
        const phone = userObj?.phone || 'Unknown';
        const name = userObj?.name || 'Unknown';
        if (search) {
          const lowerSearch = search.toLowerCase();
          if (!phone.toLowerCase().includes(lowerSearch) && !name.toLowerCase().includes(lowerSearch)) {
            continue;
          }
        }
        if (!userMap.has(uid)) {
          userMap.set(uid, {
            user_id: uid,
            name: name,
            phone: phone,
            signup_date: userObj?.created_at,
            product_names: []
          });
        }
        if (productObj?.title) {
          userMap.get(uid).product_names.push(productObj.title);
        }
      }

      let merged = Array.from(userMap.values());
      merged.sort((a, b) => new Date(b.signup_date).getTime() - new Date(a.signup_date).getTime());
      
      count = merged.length;
      data = format === 'csv' ? merged : merged.slice(start, end + 1);

    } else if (tab === 'delivered') {
      let query = supabase
        .from('orders')
        .select(`
          id, created_at, tracking_id, awb_code,
          users!inner ( name, phone )
        `)
        .in('status', ['delivered', 'Delivered']);
      
      // PostgREST doesn't support complex text search well on joins, so fetch and filter or use filter on joined
      if (search) {
        query = query.or(`users.name.ilike.%${search}%,users.phone.ilike.%${search}%`);
      }
      // Or just fetch all and filter since we might need custom logic
      // Note: Supabase JS syntax for filtering joined tables requires nested syntax, which is tricky.
      // Let's just fetch without search and filter in memory since we are paginating in memory for others anyway to be safe, or just do DB level filtering.
      // Let's do DB level for delivered
      const { data: dData, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      
      let mapped = (dData || []).map((o: any) => ({
        order_id: o.id,
        tracking_id: o.tracking_id,
        awb_code: o.awb_code,
        created_at: o.created_at,
        name: o.users?.name || 'Unknown',
        phone: o.users?.phone || 'Unknown'
      }));

      if (search) {
        const lowerSearch = search.toLowerCase();
        mapped = mapped.filter(item => item.name.toLowerCase().includes(lowerSearch) || item.phone.toLowerCase().includes(lowerSearch));
      }

      count = mapped.length;
      data = format === 'csv' ? mapped : mapped.slice(start, end + 1);

    } else if (tab === 'registered') {
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, name, phone, created_at')
        .eq('role', 1);
      
      if (usersError) throw usersError;
      
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('user_id, total_amount')
        .in('status', ['delivered', 'Delivered', 'paid', 'success', 'shipped']); // successful orders

      if (ordersError) throw ordersError;

      const orderStats = new Map<string, { order_count: number, ltv: number }>();
      for (const order of (ordersData || [])) {
        if (!order.user_id) continue;
        const stat = orderStats.get(order.user_id) || { order_count: 0, ltv: 0 };
        stat.order_count += 1;
        stat.ltv += Number(order.total_amount) || 0;
        orderStats.set(order.user_id, stat);
      }

      let mapped = (usersData || []).map(u => ({
        name: u.name || 'Unknown',
        phone: u.phone || 'Unknown',
        created_at: u.created_at,
        order_count: orderStats.get(u.id)?.order_count || 0,
        ltv: orderStats.get(u.id)?.ltv || 0
      }));

      if (search) {
        const lowerSearch = search.toLowerCase();
        mapped = mapped.filter(item => item.name.toLowerCase().includes(lowerSearch) || item.phone.toLowerCase().includes(lowerSearch));
      }

      mapped.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      count = mapped.length;
      data = format === 'csv' ? mapped : mapped.slice(start, end + 1);

    } else if (tab === 'leads') {
      let query = supabase.from('historical_leads').select('*', { count: 'exact' });
      
      if (search) {
        query = query.or(`full_name.ilike.%${search}%,mobile_number.ilike.%${search}%`);
      }
      
      if (format !== 'csv') {
        query = query.range(start, end);
      }
      query = query.order('imported_at', { ascending: false });

      const { data: leadsData, count: leadsCount, error } = await query;
      if (error) throw error;
      
      data = leadsData || [];
      count = leadsCount || 0;
    }

    if (format === 'csv') {
      if (data.length === 0) {
        return new NextResponse('No data available', { status: 200, headers: { 'Content-Type': 'text/csv' } });
      }
      
      const headers = Object.keys(data[0]);
      const csvRows = [
        headers.join(','),
        ...data.map(row => headers.map(header => {
          let val = row[header];
          if (Array.isArray(val)) val = val.join(';');
          if (typeof val === 'object' && val !== null) val = JSON.stringify(val);
          if (val === null || val === undefined) val = '';
          return `"${String(val).replace(/"/g, '""')}"`;
        }).join(','))
      ];

      return new NextResponse(csvRows.join('\n'), {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="customer_intelligence_${tab}.csv"`
        }
      });
    }

    return NextResponse.json({
      success: true,
      data,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit)
      }
    });

  } catch (error: any) {
    console.error('Error fetching customer intelligence:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch data' }, { status: 500 });
  }
}
