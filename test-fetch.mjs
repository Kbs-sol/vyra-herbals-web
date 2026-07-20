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
  const params = new URLSearchParams({
    page: '1',
    limit: '10',
    sortBy: 'totalSpent',
    sortOrder: 'desc',
  });

  const res = await fetch(`http://localhost:3000/api/admin/customers?${params}`);
  const data = await res.text();
  console.log('Result:', data.slice(0, 500));
}

test();
