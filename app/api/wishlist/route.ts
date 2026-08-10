import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/utils/supabaseClient';
import { requireUser } from '@/utils/apiAuth';

export const runtime = 'nodejs';

/**
 * Read the signed-in customer's wishlist.
 *
 * The user id used to come from a `?user_id=` query parameter, which made every
 * customer's wishlist readable by anyone who could guess a uuid. It now comes
 * from the verified access token.
 */
export async function GET(req: Request) {
    try {
        const supabase = createServerSupabase();

        const auth = await requireUser(req, supabase);
        if ('response' in auth) return auth.response;
        const userId = auth.user.id;

        const { data, error } = await supabase
            .from('wishlist')
            .select('product_id, created_at, products(*)')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('[wishlist] fetch failed:', error.message);
            return NextResponse.json({ error: 'Failed to fetch wishlist' }, { status: 500 });
        }

        const wishlistItems = data?.map((item: any) => ({
            ...item.products,
            added_at: item.created_at,
        })) || [];

        return NextResponse.json({
            status: 'success',
            data: wishlistItems,
            count: wishlistItems.length,
        });
    } catch (err) {
        console.error('[wishlist] handler exception:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
