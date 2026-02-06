import { NextResponse } from 'next/server';
import { createServerSupabase } from '../../../src/utils/supabaseClient';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const user_id = searchParams.get('user_id');

        if (!user_id) {
            return NextResponse.json({ error: 'Missing user_id parameter' }, { status: 400 });
        }

        const supabase = createServerSupabase();

        const { data, error } = await supabase
            .from('wishlist')
            .select('product_id, created_at, products(*)')
            .eq('user_id', user_id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching wishlist:', error);
            return NextResponse.json({ error: 'Failed to fetch wishlist' }, { status: 500 });
        }

        // Transform data to return product details
        const wishlistItems = data?.map((item: any) => ({
            ...item.products,
            added_at: item.created_at
        })) || [];

        return NextResponse.json({
            status: 'success',
            data: wishlistItems,
            count: wishlistItems.length
        });
    } catch (err) {
        console.error('Handler exception', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
