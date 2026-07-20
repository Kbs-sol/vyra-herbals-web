import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf-8');
const envMap = {};
env.split('\n').forEach(line => {
  const [key, ...val] = line.split('=');
  if (key && val) {
    envMap[key.trim()] = val.join('=').trim().replace(/^"|"$/g, '').replace(/^'|'$/g, '');
  }
});

const supabaseUrl = envMap['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseKey = envMap['SUPABASE_SERVICE_ROLE_KEY'] || envMap['NEXT_PUBLIC_SUPABASE_ANON_KEY'];
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const SUCCESSFUL_STATUSES = ['placed', 'confirmed', 'shipped', 'delivered'];
  let query = supabase.from('orders').select('shipping_data, total_amount, created_at, status').in('status', SUCCESSFUL_STATUSES);
  const { data: orders, error } = await query;
  console.log('orders count:', orders?.length);

  const customerMap = new Map();
  orders?.forEach((order) => {
    const shipping = order.shipping_data || {};
    const identifier = shipping.email || shipping.phone || shipping.mobile || 'unknown';
    if (identifier === 'unknown') return;

    if (!customerMap.has(identifier)) {
      customerMap.set(identifier, {
        id: identifier,
        name: shipping.name || shipping.fullName || 'Unknown',
        email: shipping.email || '',
        phone: shipping.phone || shipping.mobile || '',
        orderCount: 0,
        totalSpent: 0
      });
    }

    const customer = customerMap.get(identifier);
    customer.orderCount += 1;
    customer.totalSpent += order.total_amount || 0;
  });

  const norm10 = (p) => {
    const d = String(p || '').replace(/\D/g, '');
    return d.length > 10 ? d.slice(-10) : d;
  };
  const purchaserKeys = new Set();
  customerMap.forEach((c) => {
    if (c.email) purchaserKeys.add(String(c.email).toLowerCase());
    const ph = norm10(c.phone);
    if (ph) purchaserKeys.add(ph);
  });

  console.log('purchaserKeys count:', purchaserKeys.size);

  const { data: users } = await supabase.from('users').select('id, name, email, phone, created_at, role');
  console.log('users count:', users?.length);

  let addedLeads = 0;
  (users || []).forEach((u) => {
    if (u.role === 2) return;
    const rawEmail = String(u.email || '').toLowerCase();
    const isInternal = rawEmail.endsWith('@phone.internal');
    let phone = norm10(u.phone);
    if (!phone && isInternal) phone = norm10(rawEmail.split('@')[0]);
    const email = isInternal ? '' : rawEmail;

    if ((email && purchaserKeys.has(email)) || (phone && purchaserKeys.has(phone))) {
      return;
    }

    const identifier = `user:${u.id}`;
    if (customerMap.has(identifier)) return;
    customerMap.set(identifier, {
      id: identifier,
      name: u.name || 'Unknown',
      orderCount: 0,
      totalSpent: 0,
    });
    addedLeads++;
  });

  console.log('added leads:', addedLeads);
  console.log('total customers:', customerMap.size);
}
test();
