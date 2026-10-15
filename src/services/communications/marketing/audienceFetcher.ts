import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export async function getAudiencePhones(segment: string) {
  const supabase = getSupabaseAdmin();
  const allPhones: { phone: string, source: string, user_id?: string, opt_out?: boolean, last_sent?: string }[] = [];

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  if (segment === 'all_customers') {
    const { data } = await supabase.from('users').select('phone, id, marketing_opt_out, last_marketing_sent_at').eq('role', 1).not('phone', 'is', null);
    if (data) {
      for (const row of data) {
        allPhones.push({ phone: row.phone, source: 'users', user_id: row.id, opt_out: row.marketing_opt_out, last_sent: row.last_marketing_sent_at });
      }
    }
  } else if (segment === 'historical_leads') {
    const { data } = await supabase.from('historical_leads').select('mobile_number, marketing_opt_out, last_marketing_sent_at').eq('marketing_eligible', true);
    if (data) {
      for (const row of data) {
        allPhones.push({ phone: row.mobile_number, source: 'historical_leads', opt_out: row.marketing_opt_out, last_sent: row.last_marketing_sent_at });
      }
    }
  } else if (segment === 'vip_repeat') {
    const { data: histData } = await supabase.from('historical_leads').select('mobile_number, marketing_opt_out, last_marketing_sent_at').eq('segment', 'vip_repeat');
    if (histData) {
      for (const row of histData) {
        allPhones.push({ phone: row.mobile_number, source: 'historical_leads', opt_out: row.marketing_opt_out, last_sent: row.last_marketing_sent_at });
      }
    }
    // Users with >= 2 orders
    // Because supabase client doesn't easily support HAVING count >= 2, we can fetch orders grouped by user or fetch users and count.
    // Let's fetch all orders and group in memory if needed, or query users.
    const { data: userOrders } = await supabase.from('orders').select('user_id');
    if (userOrders) {
      const orderCounts: Record<string, number> = {};
      for (const o of userOrders) {
        if (o.user_id) orderCounts[o.user_id] = (orderCounts[o.user_id] || 0) + 1;
      }
      const repeatUserIds = Object.keys(orderCounts).filter(id => orderCounts[id] >= 2);
      if (repeatUserIds.length > 0) {
        // chunk queries if many users? Supabase 'in' supports up to ~1000 usually. We'll assume <1000 for now or chunk.
        for (let i = 0; i < repeatUserIds.length; i += 500) {
          const chunk = repeatUserIds.slice(i, i + 500);
          const { data: users } = await supabase.from('users').select('phone, id, marketing_opt_out, last_marketing_sent_at').in('id', chunk).not('phone', 'is', null);
          if (users) {
            for (const row of users) {
              allPhones.push({ phone: row.phone, source: 'users', user_id: row.id, opt_out: row.marketing_opt_out, last_sent: row.last_marketing_sent_at });
            }
          }
        }
      }
    }
  } else if (segment === 'win_back') {
    const { data } = await supabase.from('historical_leads').select('mobile_number, marketing_opt_out, last_marketing_sent_at').eq('segment', 'win_back');
    if (data) {
      for (const row of data) {
        allPhones.push({ phone: row.mobile_number, source: 'historical_leads', opt_out: row.marketing_opt_out, last_sent: row.last_marketing_sent_at });
      }
    }
  } else if (segment === 'delivered_last_30') {
    const { data: ordersData } = await supabase.from('orders').select('user_id').eq('status', 'delivered').gte('created_at', thirtyDaysAgo);
    if (ordersData) {
      const userIds = Array.from(new Set(ordersData.map(o => o.user_id).filter(Boolean)));
      for (let i = 0; i < userIds.length; i += 500) {
        const chunk = userIds.slice(i, i + 500);
        const { data: users } = await supabase.from('users').select('phone, id, marketing_opt_out, last_marketing_sent_at').in('id', chunk).not('phone', 'is', null);
        if (users) {
          for (const row of users) {
            allPhones.push({ phone: row.phone, source: 'users', user_id: row.id, opt_out: row.marketing_opt_out, last_sent: row.last_marketing_sent_at });
          }
        }
      }
    }
  }

  // Deduplicate by phone
  const uniquePhones = new Map<string, typeof allPhones[0]>();
  for (const item of allPhones) {
    if (item.phone) {
      uniquePhones.set(item.phone, item);
    }
  }

  return Array.from(uniquePhones.values());
}
