import { NextResponse } from 'next/server';
import { createServerSupabase } from '../../../../src/utils/supabaseClient';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { user_id, product_id, quantity } = body;

        // Quantity can be 0 (though frontend usually handles removal separately), but keeping check loose for now
        if (!user_id || !product_id || quantity === undefined) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const supabase = createServerSupabase();

        const { error } = await supabase
            .from('cart')
            .update({ quantity: quantity })
            .eq('user_id', user_id)
            .eq('product_id', product_id);

        if (error) {
            console.error('Error updating cart item:', error);
            return NextResponse.json({ error: 'Failed to update item' }, { status: 500 });
        }

        return NextResponse.json({ status: 'success', message: 'Item updated' });
    } catch (err) {
        console.error('Handler exception', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
