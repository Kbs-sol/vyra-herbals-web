/**
 * Single source of truth for what counts as a "real" / "successful" order.
 *
 * Why this exists: an abandoned or failed online payment must NEVER look like a
 * placed order — not on the customer's confirmation page, not in the admin
 * dashboard revenue, and not in customer lifetime-spend totals. Every consumer
 * (dashboard, customers, reconcile, cron, the order-placed page) imports these
 * helpers so the definition cannot drift between server and client.
 *
 * Status conventions in the DB:
 *   - 'placed' | 'confirmed' | 'shipped' | 'delivered'  → a genuine paid/COD order
 *   - 'cancelled'                                        → a genuine order, later cancelled
 *   - 'Failed' / 'failed'                                → payment never completed; NOT an order
 */

export const SUCCESSFUL_ORDER_STATUSES = [
  'placed',
  'confirmed',
  'shipped',
  'delivered',
] as const;

const norm = (status?: unknown): string =>
  String(status ?? '').trim().toLowerCase();

/** True only for orders whose payment succeeded (or valid COD) and weren't cancelled. */
export const isSuccessfulOrderStatus = (status?: unknown): boolean =>
  (SUCCESSFUL_ORDER_STATUSES as readonly string[]).includes(norm(status));

/** True for any genuine order — successful OR cancelled. Excludes failed/abandoned payments. */
export const isRealOrderStatus = (status?: unknown): boolean =>
  isSuccessfulOrderStatus(status) || norm(status) === 'cancelled';

/** True for an explicitly failed / abandoned payment that must be hidden from order views. */
export const isFailedOrderStatus = (status?: unknown): boolean => {
  const s = norm(status);
  return s === 'failed' || s === 'cancelled_payment' || s === 'payment_failed';
};
