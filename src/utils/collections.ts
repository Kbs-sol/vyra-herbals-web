/**
 * Shopper-facing collections. These are the 5 quick categories shown under the
 * search bar. A collection may span several DB `category` slugs (e.g. Kits =
 * kits + combo-s), so category pages resolve through here.
 */

export type Collection = {
  slug: string;
  label: string;
  title: string;
  description: string;
  dbCategories: string[]; // category values as stored in products.category (slug form)
  image: string;
};

export const COLLECTIONS: Collection[] = [
  {
    slug: 'hair-oil',
    label: 'Hair Oil',
    title: 'Herbal Hair Oil',
    description: '100% natural, chemical-free herbal hair oils, handmade in India.',
    dbCategories: ['hair-oil'],
    image: '/category-images/Hair Oil.webp',
  },
  {
    slug: 'shampoo',
    label: 'Shampoo',
    title: 'Sulfate-Free Herbal Shampoo',
    description: 'Gentle plant-based shampoo that cleanses without stripping natural oils.',
    dbCategories: ['shampoo'],
    image: '/category-images/Shampo.webp',
  },
  {
    slug: 'kits',
    label: 'Kits',
    title: 'Herbal Hair Care Kits & Combos',
    description: 'Complete routines in one box: oil, shampoo and tools, bundled for better value.',
    dbCategories: ['kits', 'combo-s'],
    image:
      'https://xjhbqpbfoqrplxnwquhs.supabase.co/storage/v1/object/public/products/complete-hair-care-kit.jpg',
  },
  {
    slug: 'tools',
    label: 'Tools',
    title: 'Scalp & Hair Tools',
    description: 'Neem combs and scalp massagers that make every oiling session work harder.',
    dbCategories: ['neem-combs', 'scalp-massager'],
    image: '/assets/images/cat/coomb.webp',
  },
  {
    slug: 'mask',
    label: 'Mask',
    title: 'Herbal Hair Masks & Botanicals',
    description: 'Botanical hair mask powders and plant-based rinse ingredients.',
    dbCategories: ['herbal-hair-mask-powder', 'rosemary-leaves'],
    image: '/category-images/Hair Mask.webp',
  },
];

export const QUICK_CATEGORIES = COLLECTIONS.map(({ slug, label, image }) => ({ slug, label, image }));

export const getCollection = (slug: string) => COLLECTIONS.find((c) => c.slug === slug);

/** DB category slugs to query for a URL slug (collection -> several; otherwise itself). */
export const categoriesForSlug = (slug: string): string[] => {
  const c = getCollection(slug);
  return c ? c.dbCategories : [slug];
};

/** Slug -> value stored in products.category (existing behaviour: dashes -> spaces handled by callers). */
export const dbCategoryLabel = (slug: string) => slug.replace(/-/g, ' ');
