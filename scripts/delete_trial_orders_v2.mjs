/*
 * Vyra Herbals - Final Trial Orders Deletion Script
 * This script deletes trial orders by filtering on shipping_data fields.
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

function getEnv(key) {
    const envPath = path.join(process.cwd(), '.env');
    if (!fs.existsSync(envPath)) return null;
    const envContent = fs.readFileSync(envPath, 'utf8');
    const lines = envContent.split('\n');
    for (const line of lines) {
        if (line.trim().startsWith(`${key}=`)) {
            return line.split('=')[1].trim();
        }
    }
    return null;
}

const supabaseUrl = getEnv('SUPABASE_URL') || getEnv('NEXT_PUBLIC_SUPABASE_URL');
const supabaseKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');
const supabase = createClient(supabaseUrl, supabaseKey);

async function finalCleanup() {
    console.log('--- FINAL TRIAL ORDERS CLEANUP ---');
    
    // 1. Identify rows to delete by fetching them first (to be safe and log them)
    const { data: orders, error: fetchError } = await supabase
        .from('orders')
        .select('*');

    if (fetchError) {
        console.error('Error fetching orders:', fetchError.message);
        return;
    }

    const trialOrders = orders.filter(o => {
        const s = o.shipping_data || {};
        const name = (s.name || s.fullName || '').toLowerCase();
        const phone = (s.phone || s.mobile || '').toString();
        const email = (s.email || '').toLowerCase();

        return (
            phone === '9692544587' ||
            name.includes('test') ||
            name.includes('talagana rajesh') ||
            email.includes('talaganarajesh') ||
            email.includes('testdelivery')
        );
    });

    console.log(`Identified ${trialOrders.length} trial orders for deletion.`);

    if (trialOrders.length === 0) {
        console.log('No trial orders found.');
        return;
    }

    // Since many IDs are null, we can't use .in('id', ids).
    // Instead, we will collect any non-null IDs and also delete by shipping_data phone pattern.
    
    const validIds = trialOrders.map(o => o.id).filter(id => id !== null);
    
    if (validIds.length > 0) {
        console.log(`Deleting ${validIds.length} orders by ID...`);
        const { error: idError } = await supabase
            .from('orders')
            .delete()
            .in('id', validIds);
        if (idError) console.error('Error deleting by ID:', idError.message);
    }

    // Now delete the remaining ones (where ID is null) using filters
    console.log('Deleting remaining trial orders where ID is null using shipping_data phone filter...');
    const { error: filterError } = await supabase
        .from('orders')
        .delete()
        .is('id', null) // Only rows where ID is null
        .eq('shipping_data->>phone', '9692544587');
    
    if (filterError) console.error('Error deleting by filter:', filterError.message);

    // Final check for anything else
    console.log('Deleting rows where name contains "test" (case-insensitive) and ID is null...');
    const { error: nameError } = await supabase
      .from('orders')
      .delete()
      .is('id', null)
      .or('shipping_data->>name.ilike.%test%,shipping_data->>fullName.ilike.%test%,shipping_data->>name.ilike.%talagana rajesh%,shipping_data->>fullName.ilike.%talagana rajesh%');

    if (nameError) console.error('Error deleting by name filter:', nameError.message);

    // 2. Summary
    const { count, error: countError } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true });
    
    console.log(`--- CLEANUP SUMMARY ---`);
    console.log(`Orders remaining in database: ${count}`);
    console.log(`Cleanup complete!`);
}

finalCleanup();
