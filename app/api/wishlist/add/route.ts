import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/utils/supabaseClient';
import { requireUser } from '@/utils/apiAuth';


// Force dynamic — API routes touch Supabase / cookies; static analysis at build time would try
// to import the module without runtime env vars and blow up in 'collect page data'.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const runtime = 'nodejs';

/**
 * Add a product to the signed-in customer's wishlist. Identity comes from the
 * verified access token, so nobody can write into another customer's wishlist.
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

        const { data: existingItem, error: fetchError } = await supabase
            .from('wishlist')
            .select('id')
            .eq('user_id', userId)
            .eq('product_id', productId)
            .maybeSingle();

        if (fetchError) {
            console.error('[wishlist/add] lookup failed:', fetchError.message);
            return NextResponse.json({ error: 'Database error' }, { status: 500 });
        }

        if (existingItem) {
            return NextResponse.json({ status: 'success', message: 'Already in wishlist' });
        }

        const { error: insertError } = await supabase
            .from('wishlist')
            .insert({ user_id: userId, product_id: productId });

        if (insertError) {
            console.error('[wishlist/add] insert failed:', insertError.message);
            return NextResponse.json({ error: 'Failed to add to wishlist' }, { status: 500 });
        }

        return NextResponse.json({ status: 'success', message: 'Added to wishlist' });
    } catch (err) {
        console.error('[wishlist/add] handler exception:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
