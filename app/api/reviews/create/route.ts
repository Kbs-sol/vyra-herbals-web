import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/utils/supabaseClient';
import { enforceRateLimit } from '@/utils/rateLimit';

export const runtime = 'nodejs';

/**
 * Public review submission.
 *
 * This endpoint used to accept a `tbl_name` of `users`, `orders`, `cart` or
 * `testimonials` and insert caller-supplied rows with the service-role key.
 * That was a privilege-escalation hole: anyone could POST a `users` row with
 * `role: 2` and mint themselves an admin profile, or fabricate orders.
 *
 * It now writes to `reviews` only, builds the row from a fixed set of fields,
 * and always forces `status = 0` so every submission waits for moderation.
 */

const MAX_NAME_LENGTH = 80;
const MAX_TEXT_LENGTH = 2000;

type SanitizedReview = {
  product_id: number;
  rating: number;
  reviewer_name: string;
  review_text: string;
  status: 0;
};

function sanitizeReview(raw: any): { review?: SanitizedReview; error?: string } {
  if (!raw || typeof raw !== 'object') return { error: 'Review data required' };

  const productId = Number(raw.product_id);
  if (!Number.isInteger(productId) || productId <= 0) {
    return { error: 'A valid product_id is required' };
  }

  const rating = Number(raw.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { error: 'Rating must be a whole number between 1 and 5' };
  }

  const reviewerName = typeof raw.reviewer_name === 'string' ? raw.reviewer_name.trim() : '';
  if (!reviewerName) return { error: 'Your name is required' };
  if (reviewerName.length > MAX_NAME_LENGTH) {
    return { error: `Name must be ${MAX_NAME_LENGTH} characters or fewer` };
  }

  const reviewText = typeof raw.review_text === 'string' ? raw.review_text.trim() : '';
  if (!reviewText) return { error: 'Review text is required' };
  if (reviewText.length > MAX_TEXT_LENGTH) {
    return { error: `Review must be ${MAX_TEXT_LENGTH} characters or fewer` };
  }

  return {
    review: {
      product_id: productId,
      rating,
      reviewer_name: reviewerName,
      review_text: reviewText,
      // Forced server-side: a submitter can never self-approve their review.
      status: 0,
    },
  };
}

export async function POST(req: Request) {
  try {
    // Review spam is cheap to send and expensive to moderate.
    const limited = enforceRateLimit(req, 'reviews:create', 5, 10 * 60 * 1000);
    if (limited) return limited;

    const body = await req.json().catch(() => ({}));
    const { tbl_name, data } = body || {};

    // `tbl_name` is retained for backwards compatibility with the existing
    // client payload, but `reviews` is the only accepted value.
    if (tbl_name && tbl_name !== 'reviews') {
      return NextResponse.json(
        { success: false, error: 'This endpoint only accepts reviews' },
        { status: 403 }
      );
    }

    // One review per request — batch inserts were only ever used by the
    // arbitrary-table path this route no longer supports.
    if (Array.isArray(data)) {
      return NextResponse.json(
        { success: false, error: 'Submit one review at a time' },
        { status: 400 }
      );
    }

    const { review, error: validationError } = sanitizeReview(data);
    if (!review) {
      return NextResponse.json({ success: false, error: validationError }, { status: 400 });
    }

    const supabase = createServerSupabase();

    // Reject reviews for products that do not exist, so the table cannot be
    // filled with rows pointing at nothing.
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id')
      .eq('id', review.product_id)
      .maybeSingle();

    if (productError) {
      console.error('[reviews/create] product lookup failed:', productError.message);
      return NextResponse.json(
        { success: false, error: 'Could not submit review' },
        { status: 500 }
      );
    }
    if (!product) {
      return NextResponse.json({ success: false, error: 'Unknown product' }, { status: 400 });
    }

    const { data: inserted, error } = await supabase
      .from('reviews')
      .insert([review])
      .select('id, product_id, rating, reviewer_name, review_text, status, created_at');

    if (error) {
      console.error('[reviews/create] insert failed:', error.message);
      return NextResponse.json(
        { success: false, error: 'Could not submit review' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: inserted || [] });
  } catch (err) {
    console.error('[reviews/create] handler exception:', err);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
