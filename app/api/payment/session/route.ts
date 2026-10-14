import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/utils/supabaseClient';
import { validateCoupon } from '@/utils/coupons';
import { COD_Charges, COD_ADVANCE_PAYMENT } from '@/constants';
import { requireUser } from '@/utils/apiAuth';


// Force dynamic — API routes touch Supabase / cookies; static analysis at build time would try
// to import the module without runtime env vars and blow up in 'collect page data'.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const runtime = 'nodejs';

/**
 * Persist the basket for a pending payment.
 *
 * This is the last server-side checkpoint before the customer is handed to
 * Easebuzz, and it is where the amount is verified.
 *
 * The problem it closes: the browser computed the basket total, posted it to
 * /api/payment/access, and that route signed the Easebuzz request with whatever
 * number it was given. A tampered client could therefore pay ₹1 for an
 * arbitrarily large order, and /api/payment/success — which only checks that
 * the gateway confirmed *a* payment — would happily finalize it. The order row
 * then recorded the client's own totals, so nothing downstream noticed.
 *
 * Here the totals are recomputed from database prices and compared against the
 * amount already signed for this transaction. A mismatch aborts the payment
 * before the customer ever reaches the gateway.
 */

/** Rounding slack, in rupees, between the client's arithmetic and ours. */
const AMOUNT_TOLERANCE = 1;

type AuthoritativeTotals = {
  itemsTotal: number;
  discount: number;
  /** What the gateway should charge now. */
  transactionPrice: number;
  /** What the order is worth in total, including any COD fee. */
  totalAmount: number;
};

/**
 * Recompute the basket from `products`, applying the coupon server-side.
 * Mirrors the arithmetic in Checkout.tsx, but sourced from the database.
 */
async function computeAuthoritativeTotals(
  supabase: any,
  orderData: any,
  userId: string
): Promise<AuthoritativeTotals | { error: string }> {
  const items = Array.isArray(orderData.orderItems) ? orderData.orderItems : [];

  const ids = Array.from(
    new Set(
      items
        .map((item: any) => Number(item?.id))
        .filter((id: number) => Number.isFinite(id) && id > 0)
    )
  );

  if (ids.length === 0) {
    return { error: 'Order items are missing product identifiers.' };
  }

  const { data: products, error } = await supabase
    .from('products')
    .select('id, price')
    .in('id', ids);

  if (error) {
    console.error('[payment/session] price lookup failed:', error.message);
    return { error: 'Could not verify prices. Please try again.' };
  }

  const priceById = new Map<number, number>();
  for (const row of products || []) {
    priceById.set(Number(row.id), Number(row.price) || 0);
  }

  let itemsTotal = 0;
  for (const item of items) {
    const id = Number(item?.id);
    const price = priceById.get(id);
    if (price === undefined) {
      return { error: 'One of the items in your cart is no longer available.' };
    }
    const quantity = Math.floor(Number(item?.quantity) || 0);
    if (quantity <= 0 || quantity > 99) {
      return { error: 'Invalid quantity in your cart.' };
    }
    itemsTotal += price * quantity;
  }

  itemsTotal = Math.round(itemsTotal);
  if (itemsTotal <= 0) {
    return { error: 'Order total must be greater than zero.' };
  }

  // Re-validate the coupon rather than trusting the discount in the payload.
  let discount = 0;
  if (orderData.couponCode) {
    const result = await validateCoupon(
      supabase,
      orderData.couponCode,
      items,
      userId
    );
    // An invalid coupon is not an error here — it simply earns no discount,
    // which is what the totals check below will then expect.
    if (result.ok) discount = Math.min(Number(result.discount) || 0, itemsTotal);
  }

  const payable = Math.max(0, itemsTotal - discount);
  const isCod = orderData.paymentMethod === 'cod';

  return {
    itemsTotal,
    discount,
    transactionPrice: isCod ? COD_ADVANCE_PAYMENT : payable,
    totalAmount: isCod ? payable + COD_Charges : payable,
  };
}

export async function POST(req: Request) {
  try {
    const supabase = createServerSupabase();

    // Checkout already requires a signed-in customer, so the session payload
    // should never arrive anonymously. Enforcing it here stops anyone from
    // planting an arbitrary basket against a transaction id they do not own.
    const auth = await requireUser(req, supabase);
    if ('response' in auth) return auth.response;
    const userId = auth.user.id;

    const body = await req.json().catch(() => ({}));
    const { txnId, orderData } = body || {};
    if (!txnId) return NextResponse.json({ error: 'txnId required' }, { status: 400 });
    if (!orderData) return NextResponse.json({ error: 'orderData required' }, { status: 400 });

    // Sanity-check the payload so we never persist a half-formed session that
    // /api/payment/success would later have to bail on.
    const items = Array.isArray(orderData.orderItems) ? orderData.orderItems : [];
    if (items.length === 0) {
      return NextResponse.json({ error: 'Order must contain at least one item.' }, { status: 400 });
    }
    const shippingData = orderData.shippingData || {};
    const requiredShippingFields = ['fullName', 'phone', 'pincode', 'city', 'state', 'area'];
    const missing = requiredShippingFields.filter((f) => !shippingData[f]);
    if (missing.length) {
      return NextResponse.json(
        { error: `Shipping address missing: ${missing.join(', ')}` },
        { status: 400 }
      );
    }

    const totals = await computeAuthoritativeTotals(supabase, orderData, userId);
    if ('error' in totals) {
      return NextResponse.json({ error: totals.error }, { status: 400 });
    }

    // The amount Easebuzz will actually collect was signed by /api/payment/access
    // and stored on the transaction row. That is the number an attacker would
    // have tampered with, so it is the number that must match.
    const { data: txnRow, error: txnError } = await supabase
      .from('transactions')
      .select('id, amount')
      .eq('id', String(txnId))
      .maybeSingle();

    if (txnError) {
      console.error('[payment/session] transaction lookup failed:', txnError.message);
      return NextResponse.json({ error: 'Could not verify payment amount.' }, { status: 500 });
    }
    if (!txnRow) {
      return NextResponse.json({ error: 'Unknown transaction.' }, { status: 400 });
    }

    const signedAmount = Number(txnRow.amount) || 0;
    if (Math.abs(signedAmount - totals.transactionPrice) > AMOUNT_TOLERANCE) {
      console.error(
        `[payment/session] amount mismatch for txn ${txnId}: signed=${signedAmount} expected=${totals.transactionPrice} (itemsTotal=${totals.itemsTotal} discount=${totals.discount} method=${orderData.paymentMethod})`
      );
      return NextResponse.json(
        {
          error:
            'The order total changed while you were checking out. Please go back to your cart and try again.',
        },
        { status: 409 }
      );
    }

    // Persist the server's numbers, not the browser's, so the order row created
    // at finalize records what was genuinely owed.
    const verifiedPayload = {
      ...orderData,
      orderItems: items,
      totalAmount: totals.totalAmount,
      transactionPrice: totals.transactionPrice,
      couponDiscount: totals.discount,
      itemsTotal: totals.itemsTotal,
      userId,
    };

    // Keep one active payload per transaction ID so payment success lookup is deterministic.
    const { error: cleanupError } = await supabase
      .from('order_sessions')
      .delete()
      .eq('txn_id', String(txnId));

    if (cleanupError) {
      console.error('Payment session cleanup error:', cleanupError);
    }

    const { data: inserted, error } = await supabase
      .from('order_sessions')
      .insert([{ txn_id: String(txnId), payload: verifiedPayload }])
      .select();

    if (error) {
      console.error('Payment session error:', error);
      return NextResponse.json({ error: 'Could not save your order.' }, { status: 500 });
    }

    return NextResponse.json({ status: 'ok', data: inserted?.[0] });
  } catch (err) {
    console.error('Payment session exception:', err);
    return NextResponse.json({ error: 'Could not save your order.' }, { status: 500 });
  }
}
