/**
 * Variant families: products are separate DB rows per size/pack. A "family"
 * groups the rows that are the same product in different sizes so the storefront
 * can show ONE card / ONE product page with a size selector.
 *
 * Optional DB columns (variant_group, variant_label, variant_order) override
 * this static map when present, so the founder can manage families from the DB
 * later without a code change.
 */

export type VariantFamily = {
  key: string;
  name: string;
  ids: number[];
  defaultId: number;
};

export const FAMILIES: VariantFamily[] = [
  { key: 'hair-oil', name: 'Herbal Hair Oil', ids: [1, 2, 3, 11, 12], defaultId: 2 },
  { key: 'shampoo', name: 'Sulfate-Free Herbal Shampoo', ids: [4, 5, 13], defaultId: 4 },
  { key: 'hair-mask', name: 'Herbal Hair Mask Powder', ids: [9], defaultId: 9 },
  { key: 'neem-comb', name: 'Neem Comb', ids: [6, 7, 14], defaultId: 7 },
  { key: 'scalp-massager', name: 'Scalp Massager', ids: [8], defaultId: 8 },
  { key: 'rosemary', name: 'Rosemary Leaves', ids: [10], defaultId: 10 },
  { key: 'combo-oil-shampoo', name: 'Oil + Shampoo Combo', ids: [15, 16, 17, 18, 19, 20], defaultId: 16 },
  { key: 'combo-shampoo-massager', name: 'Shampoo + Massager Combo', ids: [21], defaultId: 21 },
  { key: 'kit-hair-care', name: 'Hair Care Kit', ids: [22, 23], defaultId: 23 },
  { key: 'kit-scalp-care', name: 'Scalp Care Kit', ids: [24, 25], defaultId: 25 },
  { key: 'kit-hair-growth', name: 'Hair Growth Kit', ids: [26, 27], defaultId: 27 },
  { key: 'kit-all-in-one', name: 'All-in-One Kit', ids: [28], defaultId: 28 },
  { key: 'kit-healthy-hair', name: 'Healthy Hair Kit', ids: [38], defaultId: 38 },
];

/** Shopper-facing size / pack label per product id (shown on chips). */
export const VARIANT_LABELS: Record<number, string> = {
  1: '100 ml', 2: '200 ml', 3: '500 ml', 11: 'Pack of 3 (100 ml)', 12: 'Pack of 2 (200 ml)',
  4: '200 ml', 5: '500 ml', 13: 'Pack of 2 (200 ml)',
  9: 'Single pack', 10: 'Single pack', 8: 'Single piece',
  6: 'Half comb', 7: 'Full comb', 14: 'Pack of 2',
  15: 'Oil 100 ml + Shampoo 200 ml', 16: 'Oil 200 ml + Shampoo 200 ml', 17: 'Oil 500 ml + Shampoo 200 ml',
  18: 'Oil 100 ml + Shampoo 500 ml', 19: 'Oil 200 ml + Shampoo 500 ml', 20: 'Oil 500 ml + Shampoo 500 ml',
  21: 'Combo set',
  22: 'Mini', 23: 'Complete', 24: 'Mini', 25: 'Complete', 26: 'Mini', 27: 'Complete', 28: 'Complete set', 38: 'Complete set',
};

export const getFamilyByKey = (key: string) => FAMILIES.find((f) => f.key === key);

export const getFamilyForProductId = (id: number | string | null | undefined) => {
  const n = Number(id);
  if (!Number.isFinite(n)) return undefined;
  return FAMILIES.find((f) => f.ids.includes(n));
};

/** Ids of every product (incl. itself) in the same family. */
export const siblingIdsFor = (id: number | string | null | undefined): number[] => {
  const fam = getFamilyForProductId(id);
  const n = Number(id);
  return fam ? fam.ids : Number.isFinite(n) ? [n] : [];
};

export type FamilyGroup<T = any> = {
  key: string;
  name: string;
  variants: T[]; // sorted by size/price
  defaultVariant: T;
};

const numeric = (v: any) => {
  const n = Number(String(v ?? '').replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) ? n : 0;
};

/** Best-effort size sort: parse "100 ml" / "250ml" / "Pack of 2", fall back to price. */
export const variantSortValue = (p: any): number => {
  if (p?.variant_order != null && Number.isFinite(Number(p.variant_order))) return Number(p.variant_order);
  const label = String(p?.variant_label || p?.size || p?.title || '');
  const m = label.match(/(\d+(?:\.\d+)?)\s*(ml|g|gm|l|kg)/i);
  if (m) {
    const unit = m[2].toLowerCase();
    const v = Number(m[1]);
    return unit === 'l' || unit === 'kg' ? v * 1000 : v;
  }
  return numeric(p?.price ?? p?.selling_price);
};

/** Short chip label for a variant ("100 ml", "250 ml", ...). */
export const variantLabel = (p: any): string => {
  if (p?.variant_label) return String(p.variant_label);
  if (VARIANT_LABELS[Number(p?.id)]) return VARIANT_LABELS[Number(p.id)];
  const text = `${p?.size || ''} ${p?.title || ''}`;
  const m = text.match(/(\d+(?:\.\d+)?)\s*(ml|gm|g|l|kg)\b/i);
  if (m) return `${m[1]} ${m[2].toLowerCase() === 'gm' ? 'g' : m[2].toLowerCase()}`;
  const pack = text.match(/pack of\s*(\d+)/i);
  if (pack) return `Pack of ${pack[1]}`;
  return p?.title ? String(p.title).slice(0, 18) : 'Standard';
};

/**
 * Group arbitrary product rows into families. Rows that belong to no known
 * family become single-variant groups so nothing disappears from listings.
 */
export function groupProductsIntoFamilies<T extends { id?: any }>(products: T[]): FamilyGroup<T>[] {
  const groups = new Map<string, FamilyGroup<T>>();
  const order: string[] = [];

  for (const p of products || []) {
    const dbGroup = (p as any)?.variant_group as string | undefined;
    const fam = getFamilyForProductId((p as any)?.id);
    const key = dbGroup || fam?.key || `solo-${(p as any)?.id}`;
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        name: fam?.name || String((p as any)?.title || ''),
        variants: [],
        defaultVariant: p,
      });
      order.push(key);
    }
    groups.get(key)!.variants.push(p);
  }

  return order.map((k) => {
    const g = groups.get(k)!;
    g.variants.sort((a, b) => variantSortValue(a) - variantSortValue(b));
    const fam = FAMILIES.find((f) => f.key === k);
    const def = fam ? g.variants.find((v) => Number((v as any).id) === fam.defaultId) : undefined;
    g.defaultVariant = def || g.variants[Math.floor((g.variants.length - 1) / 2)] || g.variants[0];
    return g;
  });
}
