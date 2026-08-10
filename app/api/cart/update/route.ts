import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/utils/supabaseClient';
import { requireUser } from '@/utils/apiAuth';

export const runtime = 'nodejs';

/**
 * Set the quantity of an item in the signed-in customer's cart. The owning user
 * id comes from the verified access token, never from the request body.
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
        // 0 is allowed and means "remove", matching the previous behaviour.
        if (!Number.isInteger(quantity) || quantity < 0 || quantity > 99) {
            return NextResponse.json(
                { error: 'Quantity must be a whole number between 0 and 99' },
                { status: 400 }
            );
        }

        if (quantity === 0) {
            const { error: deleteError } = await supabase
                .from('cart')
                .delete()
                .eq('user_id', userId)
                .eq('product_id', productId);

            if (deleteError) {
                console.error('[cart/update] delete failed:', deleteError.message);
                return NextResponse.json({ error: 'Failed to update item' }, { status: 500 });
            }

            return NextResponse.json({ status: 'success', message: 'Item removed' });
        }

        const { error } = await supabase
            .from('cart')
            .update({ quantity })
            .eq('user_id', userId)
            .eq('product_id', productId);

        if (error) {
            console.error('[cart/update] update failed:', error.message);
            return NextResponse.json({ error: 'Failed to update item' }, { status: 500 });
        }

        return NextResponse.json({ status: 'success', message: 'Item updated' });
    } catch (err) {
        console.error('[cart/update] handler exception:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
