import { createServerSupabase } from '@/utils/supabaseClient';
import { getLiveProducts } from '@/utils/catalogue';
import { mapCategoryToCollection, stableNumericId, type SrCollection } from '@/utils/shiprocketCheckout';

/**
 * Collections for Shiprocket, sourced from the `categories` table and falling
 * back to the distinct `products.category` values if that table is empty or
 * unreachable (same resilience pattern as src/utils/catalogue.ts).
 */
export async function loadCollections(origin: string): Promise<Array<SrCollection & { _key: string }>> {
  try {
    const supabase = createServerSupabase();
    const { data, error } = await supabase.from('categories').select('*').order('id', { ascending: true });
    if (!error && data && data.length) {
      return data.map((c: any) => ({ ...mapCategoryToCollection(c, origin), _key: String(c.slug || c.name || '').toLowerCase() }));
    }
  } catch (e) {
    console.error('[shiprocket/collections] categories lookup failed:', (e as Error).message);
  }
  const { products } = await getLiveProducts(500);
  const seen = new Map<string, SrCollection & { _key: string }>();
  for (const p of products) {
    const key = String(p.category || '').trim();
    if (!key || seen.has(key.toLowerCase())) continue;
    seen.set(key.toLowerCase(), {
      ...mapCategoryToCollection({ slug: key, name: key, id: stableNumericId(key) }, origin),
      _key: key.toLowerCase(),
    });
  }
  return [...seen.values()];
}
