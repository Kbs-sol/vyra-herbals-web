const { createClient } = require('@supabase/supabase-js');

// Hardcoded for debugging
const supabaseUrl = 'https://obbohecegyagnqufelpx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9iYm9oZWNlZ3lhZ25xdWZlbHB4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2MzA2MTEsImV4cCI6MjA4MjIwNjYxMX0.Z3K7aS2fFwiiKCXOtoOwud9a7_vFxpyP3LCdng8UEsE';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fetchOrders() {
    console.log("---------------- FETCHING 10 ORDERS ----------------");
    const { data, error } = await supabase
        .from('orders')
        .select('id, created_at, items')
        .order('created_at', { ascending: false })
        .limit(10);

    if (error) {
        console.error('Error:', error);
    } else {
        data.forEach((o, i) => {
            console.log(`--- Order ${i + 1} ---`);
            console.log('ID:', o.id);
            console.log('Created:', o.created_at);
            console.log('Items:', JSON.stringify(o.items));
        });
    }
}

fetchOrders();
