import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function fetchProducts() {
  const { data, error } = await supabase.from('products').select('id, title, category, handle, price, image_url').limit(50);
  if (error) {
    console.error('Error fetching products:', error);
    return;
  }
  console.log(JSON.stringify(data, null, 2));
}

fetchProducts();
  