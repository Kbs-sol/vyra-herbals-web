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

        const { error } = await supabase
            .from('wishlist')
            .delete()
            .eq('user_id', user_id)
            .eq('product_id', product_id);

        if (error) {
            console.error('Error removing wishlist item:', error);
            return NextResponse.json({ error: 'Failed to remove from wishlist' }, { status: 500 });
        }

        return NextResponse.json({ status: 'success', message: 'Removed from wishlist' });
    } catch (err) {
        console.error('Handler exception', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
