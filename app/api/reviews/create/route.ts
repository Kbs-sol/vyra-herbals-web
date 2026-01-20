import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/utils/supabaseClient';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { tbl_name, data } = body || {};
    if (!tbl_name || !data) return NextResponse.json({ success: false, error: 'tbl_name and data required' }, { status: 400 });

    const allowed = ['reviews', 'cart', 'orders', 'users', 'testimonials'];
    if (!allowed.includes(tbl_name)) return NextResponse.json({ success: false, error: 'table not allowed' }, { status: 400 });

    const supabase = createServerSupabase();
    // Ensure reviews created from public endpoint default to pending (status = 0)
    let insertData = Array.isArray(data) ? data : [data];
    if (tbl_name === 'reviews') {
      insertData = insertData.map((d: any) => ({ ...d, status: d.status ?? 0 }));
    }

    const { data: inserted, error } = await supabase.from(tbl_name).insert(insertData).select('*');
    if (error) {
      console.error('Insert error:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    // If inserting reviews and the returned rows lack an id for some reason, try to fetch them by matching unique-ish fields
    if (tbl_name === 'reviews') {
      const fixed: any[] = [];
      for (const row of (inserted || [])) {
        if (row && (row.id === undefined || row.id === null)) {
          // try to find the row by product_id + reviewer_name + review_text + created_at (if available)
          const matchQuery: any = {};
          if (row.product_id != null) matchQuery.product_id = row.product_id;
          if (row.reviewer_name != null) matchQuery.reviewer_name = row.reviewer_name;
          if (row.review_text != null) matchQuery.review_text = row.review_text;

          // attempt best-effort lookup
          if (Object.keys(matchQuery).length > 0) {
            const { data: found } = await supabase
              .from('reviews')
              .select('*')
              .match(matchQuery)
              .order('created_at', { ascending: false })
              .limit(1);
            if (found && found.length > 0) {
              // Log a fallback resolution so we can debug missing-id cases
              console.warn('Create route: inserted review returned without id, resolved with fallback query', matchQuery, { resolvedId: found[0].id });
              fixed.push(found[0]);
              continue;
            }
          }
        }
        fixed.push(row);
      }

      return NextResponse.json({ success: true, data: fixed });
    }

    return NextResponse.json({ success: true, data: inserted });
  } catch (err) {
    console.error('Insert exception:', err);
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}
