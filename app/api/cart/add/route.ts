import { NextResponse } from 'next/server';
import { createServerSupabase } from '../../../../src/utils/supabaseClient';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { user_id, product_id, quantity } = body;

        if (!user_id || !product_id || !quantity) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const supabase = createServerSupabase();

        // Check if item already exists in cart
        const { data: existingItem, error: fetchError } = await supabase
            .from('cart')
            .select('id, quantity')
            .eq('user_id', user_id)
            .eq('product_id', product_id)
            .single();

        if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is "Row not found"
            console.error('Error fetching cart item:', fetchError);
            return NextResponse.json({ error: 'Database error' }, { status: 500 });
        }

        if (existingItem) {
            // Update quantity
            const newQuantity = existingItem.quantity + quantity;
            const { error: updateError } = await supabase
                .from('cart')
                .update({ quantity: newQuantity })
                .eq('id', existingItem.id);

            if (updateError) {
                console.error('Error updating cart item:', updateError);
                return NextResponse.json({ error: 'Failed to update cart' }, { status: 500 });
            }
        } else {
            // Insert new item
            const { error: insertError } = await supabase
                .from('cart')
                .insert({ user_id, product_id, quantity });

            if (insertError) {
                console.error('Error inserting cart item:', insertError);
                return NextResponse.json({ error: 'Failed to add to cart' }, { status: 500 });
            }
        }

        return NextResponse.json({ status: 'success', message: 'Cart updated' });
    } catch (err) {
        console.error('Handler exception', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
