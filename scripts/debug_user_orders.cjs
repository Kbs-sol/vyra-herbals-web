const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://obbohecegyagnqufelpx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9iYm9oZWNlZ3lhZ25xdWZlbHB4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2MzA2MTEsImV4cCI6MjA4MjIwNjYxMX0.Z3K7aS2fFwiiKCXOtoOwud9a7_vFxpyP3LCdng8UEsE';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fetchAnyOrder() {
    console.log("---------------- FETCHING LATEST 20 ORDERS ----------------");

    const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

    if (error) {
        console.error('Error fetching orders:', error);
        return;
    }

    console.log(`Fetched ${data.length} orders.`);

    // Filter for our target user in JS since column might be missing or inside JSON
    const targetEmail = 'talaganarajesh@gmail.com';

    data.forEach((o, i) => {
        let isMatch = false;
        // Check if email is in shipping_address JSON string
        if (typeof o.shipping_address === 'string' && o.shipping_address.includes(targetEmail)) {
            isMatch = true;
        }
        // Check if user_id is potentially linked (we don't know the ID, but listing all might help)

        if (isMatch || i < 5) { // Show first 5 anyway + matches
            console.log(`\n--- Order ${i + 1} (Match: ${isMatch}) ---`);
            console.log('ID:', o.id);
            console.log('User_ID:', o.user_id);
            console.log('Created_At:', o.created_at);
            console.log('Shipping:', o.shipping_address ? (o.shipping_address.substring(0, 100) + '...') : 'NULL');
            console.log('Items:', o.items ? `Array(${o.items.length})` : 'NULL');
        }
    });
}

fetchAnyOrder();
