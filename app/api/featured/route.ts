import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/utils/supabaseClient';

export async function GET() {
    const supabase = createServerSupabase();

    try {
        // Fetch current selection
        // Order by position to ensure consistent order
        const { data, error } = await supabase
            .from('featured_selection')
            .select('position, product_id')
            .order('position', { ascending: true });

        if (error) {
            console.error('Error fetching featured selection:', error);
            // Fallback: Return empty array or handle error
            // If table doesn't exist, this will error.
            // We can return a specific error code or empty array.
            if (error.code === '42P01') { // undefined_table
                return NextResponse.json({ success: false, error: 'Table not found', code: 'TABLE_NOT_FOUND' }, { status: 404 });
            }
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, data: data || [] });
    } catch (error) {
        console.error('Server error fetching featured:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    const supabase = createServerSupabase();

    try {
        const body = await req.json();
        const { items } = body; // Expecting { items: [{ position: 1, product_id: 12 }, ...] }

        if (!items || !Array.isArray(items)) {
            return NextResponse.json({ success: false, error: 'Invalid body' }, { status: 400 });
        }

        // Upsert items (update or insert)
        // We update each item individually or in batch using upsert
        console.log('Updating featured items:', items);

        const { data, error } = await supabase
            .from('featured_selection')
            .upsert(items, { onConflict: 'position' })
            .select();

        if (error) {
            console.error('Error updating featured selection:', error);
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error('Server error updating featured:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}
