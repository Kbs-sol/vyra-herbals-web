import { NextResponse } from 'next/server';
import { createServerSupabase } from '../../../../src/utils/supabaseClient';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { user_id, product_id } = body;

        if (!user_id || !product_id) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const supabase = createServerSupabase();

        // Check if item already exists in wishlist
        const { data: existingItem, error: fetchError } = await supabase
            .from('wishlist')
            .select('id')
            .eq('user_id', user_id)
            .eq('product_id', product_id)
            .single();

        if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is "Row not found"
            console.error('Error fetching wishlist item:', fetchError);
            return NextResponse.json({ error: 'Database error' }, { status: 500 });
        }

        if (existingItem) {
            // Already in wishlist
            return NextResponse.json({ status: 'success', message: 'Already in wishlist' });
        }

        // Insert new item
        const { error: insertError } = await supabase
            .from('wishlist')
            .insert({ user_id, product_id });

        if (insertError) {
            console.error('Error inserting wishlist item:', insertError);
            return NextResponse.json({ error: 'Failed to add to wishlist' }, { status: 500 });
        }

        return NextResponse.json({ status: 'success', message: 'Added to wishlist' });
    } catch (err) {
        console.error('Handler exception', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
