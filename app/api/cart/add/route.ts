import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/utils/supabaseClient';
import { requireUser } from '@/utils/apiAuth';

export const runtime = 'nodejs';

/**
 * Add an item to the signed-in customer's cart.
 *
 * `user_id` is taken from the verified Supabase access token, never from the
 * request body. Trusting the body here meant any caller could write into
 * another customer's cart just by guessing their user id.
 */
export async function POST(req: Request) {
    try {
        const supabase = createServerSupabase();

        const auth = await requireUser(req, supabase);
        if ('response' in auth) return auth.response;
        const userId = auth.user.id;

        const body = await req.json().catch(() => ({}));
        const productId = Number(body?.product_id);
        const quantity = Number(body?.quantity);

        if (!Number.isInteger(productId) || productId <= 0) {
            return NextResponse.json({ error: 'A valid product_id is required' }, { status: 400 });
        }
        // Cap the quantity so a single request cannot create an absurd line item.
        if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
            return NextResponse.json(
                { error: 'Quantity must be a whole number between 1 and 99' },
                { status: 400 }
            );
        }

        const { data: existingItem, error: fetchError } = await supabase
            .from('cart')
            .select('id, quantity')
            .eq('user_id', userId)
            .eq('product_id', productId)
            .maybeSingle();

        if (fetchError) {
            console.error('[cart/add] lookup failed:', fetchError.message);
            return NextResponse.json({ error: 'Database error' }, { status: 500 });
        }

        if (existingItem) {
            const newQuantity = Math.min(existingItem.quantity + quantity, 99);
            const { error: updateError } = await supabase
                .from('cart')
                .update({ quantity: newQuantity })
                .eq('id', existingItem.id)
                // Re-assert ownership on the write itself, so the update can
                // never touch a row that moved between the read and the write.
                .eq('user_id', userId);

            if (updateError) {
                console.error('[cart/add] update failed:', updateError.message);
                return NextResponse.json({ error: 'Failed to update cart' }, { status: 500 });
            }
        } else {
            const { error: insertError } = await supabase
                .from('cart')
                .insert({ user_id: userId, product_id: productId, quantity });

            if (insertError) {
                console.error('[cart/add] insert failed:', insertError.message);
                return NextResponse.json({ error: 'Failed to add to cart' }, { status: 500 });
            }
        }

        return NextResponse.json({ status: 'success', message: 'Cart updated' });
    } catch (err) {
        console.error('[cart/add] handler exception:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
