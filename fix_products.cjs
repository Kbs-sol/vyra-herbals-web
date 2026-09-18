const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixProducts() {
  console.log("Fetching all products...");
  
  const { data: products, error } = await supabase.from('products').select('*');
  
  if (error) {
    console.error("Error fetching products:", error);
    return;
  }
  
  let updatedCount = 0;
  
  for (const product of products) {
    const updates = {};
    if (product.status === null || product.status === undefined) updates.status = 'active';
    if (product.quantity === null || product.quantity === undefined) updates.quantity = 100;
    if (product.stock_quantity === null || product.stock_quantity === undefined) updates.stock_quantity = 100;
    if (product.brand === null || product.brand === undefined) updates.brand = 'Vyra Herbals';
    if (product.created_at === null || product.created_at === undefined) updates.created_at = new Date().toISOString();
    if (product.updated_at === null || product.updated_at === undefined) updates.updated_at = new Date().toISOString();
    if (product.view_count === null || product.view_count === undefined) updates.view_count = 0;
    
    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await supabase
        .from('products')
        .update(updates)
        .eq('id', product.id);
        
      if (updateError) {
        console.error(`Error updating product ${product.id}:`, updateError);
      } else {
        console.log(`Fixed product ${product.id} (${product.title}) with updates:`, Object.keys(updates));
        updatedCount++;
      }
    }
  }
  
  console.log(`Done! Fixed ${updatedCount} products.`);
}

fixProducts();
