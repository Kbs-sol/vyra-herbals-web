import { API_PATH } from '../constants';

/**
 * Resolve the CURRENT handle (URL slug) for a product from its id.
 *
 * Order line-items keep a snapshot of the product (title, image, handle, ...)
 * captured at purchase time. If an admin later edits the product's handle, the
 * snapshot's handle goes stale and links built from it 404. This helper asks
 * the server for the live handle using the stable product id.
 *
 * It never throws: if the id is missing, the lookup fails, or the network is
 * down, it returns `fallbackHandle` so callers can still navigate (to the
 * possibly-stale handle) rather than break entirely.
 */
export async function resolveCurrentHandle(
  productId: string | number | null | undefined,
  fallbackHandle?: string | null
): Promise<string | null> {
  const fallback = fallbackHandle || null;

  if (productId === null || productId === undefined || productId === '') {
    return fallback;
  }

  try {
    const res = await fetch(
      `${API_PATH}/products/resolve-handle?id=${encodeURIComponent(String(productId))}`,
      // No auth/cookies needed here — omit credentials so a large cookie jar
      // can't push this over the server header limit (HTTP 431).
      { credentials: 'omit' }
    );
    if (!res.ok) return fallback;

    const data = await res.json().catch(() => null);
    if (data?.status === 'success' && data.handle) {
      return data.handle as string;
    }
    return fallback;
  } catch (err) {
    console.warn('resolveCurrentHandle failed, using fallback handle:', err);
    return fallback;
  }
}
