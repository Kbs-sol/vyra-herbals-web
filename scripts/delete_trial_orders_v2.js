/*
 * Vyra Herbals - Trial Orders Removal Script
 * This script identifies and deletes test/trial orders from the production database.
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Extract env variables from .env file manually since dotenv is not available
function getEnv(key) {
    const envPath = path.join(process.cwd(), '.env');
    const envContent = fs.readFileSync(envPath, 'utf8');
    const lines = envContent.split('\n');
    for (const line of lines) {
        if (line.startsWith(`${key}=`)) {
            return line.split('=')[1].trim();
        }
    }
    return null;
}

const supabaseUrl = getEnv('SUPABASE_URL') || getEnv('NEXT_PUBLIC_SUPABASE_URL');
const supabaseKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');

if (!supabaseUrl || !supabaseKey) {
    console.error('CRITICAL ERROR: Supabase credentials missing from .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const TRIAL_PATTERNS = {
    names: ['test', 'talagana rajesh', 'test delivery user'],
    phones: ['9692544587'],
    emails: ['testdelivery@example.com', 'talaganarajesh25@gmail.com', 'talaganarajesh@gmail.com']
};

async function removeTrialOrders() {
    console.log('--- TRIAL ORDERS CLEANUP ---');
    
    // 1. Fetch all orders
    console.log('Fetching all orders from database...');
    const { data: orders, error: fetchError } = await supabase
        .from('orders')
        .select('*');

    if (fetchError) {
        console.error('Error fetching orders:', fetchError.message);
        return;
    }

    const totalBefore = orders.length;
    console.log(`Total orders found: ${totalBefore}`);

    // 2. Identify trial orders
    const trialOrderIds = [];
    const trialDetails = [];

    orders.forEach(order => {
        const shipping = order.shipping_data || {};
        const name = (shipping.name || shipping.fullName || '').toLowerCase();
        const phone = (shipping.phone || shipping.mobile || '').toString();
        const email = (shipping.email || '').toLowerCase();

        const isTrial = 
            TRIAL_PATTERNS.names.some(n => name.includes(n)) ||
            TRIAL_PATTERNS.phones.some(p => phone.includes(p)) ||
            TRIAL_PATTERNS.emails.some(e => email.includes(e));

        if (isTrial) {
            trialOrderIds.push(order.id);
            trialDetails.push({
                id: order.id,
                customer: shipping.name || shipping.fullName,
                phone: shipping.phone || shipping.mobile,
                amount: order.total_amount
            });
        }
    });

    if (trialOrderIds.length === 0) {
        console.log('No trial orders found matching criteria.');
        return;
    }

    console.log(`---------------------------------`);
    console.log(`Identified ${trialOrderIds.length} trial orders:`);
    trialDetails.forEach(d => {
        console.log(`  - Order #${d.id}: Customer="${d.customer}", Phone="${d.phone}", Amount=${d.amount}`);
    });
    console.log(`---------------------------------`);

    // 3. Delete trial orders
    console.log(`Deleting ${trialOrderIds.length} trial orders...`);
    const { error: deleteError } = await supabase
        .from('orders')
        .delete()
        .in('id', trialOrderIds);

    if (deleteError) {
        console.error('Error deleting trial orders:', deleteError.message);
    } else {
        console.log('Successfully deleted trial orders.');
        const { count, error: countError } = await supabase
            .from('orders')
            .select('*', { count: 'exact', head: true });
        
        const totalAfter = count || (totalBefore - trialOrderIds.length);
        console.log(`Total orders remaining: ${totalAfter}`);
        console.log(`CLEANUP COMPLETE: ${totalBefore - totalAfter} orders removed.`);
    }
}

removeTrialOrders();
