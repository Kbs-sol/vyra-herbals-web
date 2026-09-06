import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/utils/supabaseClient';
import { requireUser } from '@/utils/apiAuth';

export const runtime = 'nodejs';

/**
 * Remove a product from the signed-in customer's wishlist. Identity comes from
 * the verified access token, never from the request body.
 */
export async function POST(req: Request) {
    try {
        const supabase = createServerSupabase();

        const auth = await requireUser(req, supabase);
        if ('response' in auth) return auth.response;
        const userId = auth.user.id;

        const body = await req.json().catch(() => ({}));
        const productId = Number(body?.product_id);

        if (!Number.isInteger(productId) || productId <= 0) {
            return NextResponse.json({ error: 'A valid product_id is required' }, { status: 400 });
        }

        const { error } = await supabase
            .from('wishlist')
            .delete()
            .eq('user_id', userId)
            .eq('product_id', productId);

        if (error) {
            console.error('[wishlist/remove] delete failed:', error.message);
            return NextResponse.json({ error: 'Failed to remove from wishlist' }, { status: 500 });
        }

        return NextResponse.json({ status: 'success', message: 'Removed from wishlist' });
    } catch (err) {
        console.error('[wishlist/remove] handler exception:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
