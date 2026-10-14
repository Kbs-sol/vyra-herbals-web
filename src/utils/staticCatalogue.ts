/**
 * STATIC product catalogue — last-resort fallback for /sitemap.xml,
 * /feed.xml and /llms.txt when Supabase is unreachable OR returns zero
 * rows (e.g. the status-column bug that silently hid all 29 products).
 *
 * Snapshotted from /api/products/with-reviews on 2026-09-18 (29 products).
 * Regenerate by running the companion script in scripts/snapshot-catalogue.mjs
 * or just redoing the POST and re-emitting this file.
 *
 * DO NOT edit by hand — edits here will be overwritten on next regen.
 */

export interface StaticProduct {
  id: number;
  handle: string;
  title: string;
  category: string | null;
  price: number | null;
  regular_price: number | null;
  image_url: string | null;
  status: unknown;
  brand: string | null;
  sku: string | null;
  description: string;
}

export const STATIC_PRODUCTS: StaticProduct[] = [
  {
    "id": 15,
    "handle": "VYRA-100-OIL-200-SHAMPOO-COMBO",
    "title": "Hair Oil 100ml + Shampoo 200ml Combo",
    "category": "combo-s",
    "price": 529,
    "regular_price": 948,
    "image_url": "https://obbohecegyagnqufelpx.supabase.co/storage/v1/object/public/images/oil-100ml-shampoo-200ml-combo/1769795539392-gnur19u.jpg",
    "status": null,
    "brand": null,
    "sku": "VYRA OIL 100 SHAMPOO 200 COMBO",
    "description": "Complete hair care combo featuring our 100ml Herbal Hair Oil and 200ml Herbal Shampoo. The perfect starter kit for healthy hair. Oil before wash, shampoo after - experience the complete Vyra hair care routine. Great value combo price!"
  },
  {
    "id": 16,
    "handle": "VYRA-200-OIL-200-SHAMPOO-COMBO",
    "title": "Hair Oil 200ml + Shampoo 200ml Combo",
    "category": "combo-s",
    "price": 679,
    "regular_price": 1248,
    "image_url": "https://obbohecegyagnqufelpx.supabase.co/storage/v1/object/public/images/oil-200ml-shampoo-200ml-combo/1769795512654-zpnq76a.jpg",
    "status": null,
    "brand": null,
    "sku": "VYRA-OIL-200-SHAMPOO-200-COMBO",
    "description": "Complete hair care combo featuring our 200ml Herbal Hair Oil and 200ml Herbal Shampoo. Balanced combo for regular hair care routine. Oil before wash, shampoo after - experience the complete Vyra hair care routine. Excellent value!"
  },
  {
    "id": 17,
    "handle": "VYRA-500-OIL-200-SHAMPOO-COMBO",
    "title": "Hair Oil 500ml + Shampoo 200ml Combo",
    "category": "combo-s",
    "price": 1129,
    "regular_price": 1948,
    "image_url": "https://obbohecegyagnqufelpx.supabase.co/storage/v1/object/public/images/oil-500ml-shampoo-200ml-combo/1771522532497-zyf6rq7.jpeg",
    "status": null,
    "brand": null,
    "sku": "VYRA-OIL-500-SHAMPOO-200-COMBO",
    "description": "Complete hair care combo featuring our large 500ml Herbal Hair Oil and 200ml Herbal Shampoo. Perfect for those who love our oil and want to stock up. Experience the complete Vyra hair care routine at an amazing value!"
  },
  {
    "id": 18,
    "handle": "VYRA-100-OIL-500-SHAMPOO-COMBO",
    "title": "Hair Oil 100ml + Shampoo 500ml Combo",
    "category": "combo-s",
    "price": 829,
    "regular_price": 1048,
    "image_url": "https://obbohecegyagnqufelpx.supabase.co/storage/v1/object/public/images/oil-100ml-shampoo-500ml-combo/1770471877167-ewzmywl.jpeg",
    "status": null,
    "brand": null,
    "sku": "VYRA-OIL-100-SHAMPOO-500-COMBO",
    "description": "Complete hair care combo featuring our 100ml Herbal Hair Oil and large 500ml Herbal Shampoo. Ideal for those who shampoo frequently. Experience the complete Vyra hair care routine at great savings!"
  },
  {
    "id": 19,
    "handle": "VYRA-200-OIL-500-SHAMPOO-COMBO",
    "title": "Hair Oil 200ml + Shampoo 500ml Combo",
    "category": "combo-s",
    "price": 1029,
    "regular_price": 1348,
    "image_url": "https://obbohecegyagnqufelpx.supabase.co/storage/v1/object/public/images/oil-200ml-shampoo-500ml-combo/1771522606328-f29suta.jpeg",
    "status": null,
    "brand": null,
    "sku": "VYRA-OIL-200-SHAMPOO-500-COMBO",
    "description": "Complete hair care combo featuring our 200ml Herbal Hair Oil and large 500ml Herbal Shampoo. Perfect balance for regular oil application and frequent washing. Great value for the complete Vyra experience!"
  },
  {
    "id": 20,
    "handle": "VYRA-500-OIL-500-SHAMPOO-COMBO",
    "title": "Hair Oil 500ml + Shampoo 500ml Combo",
    "category": "combo-s",
    "price": 1499,
    "regular_price": 2298,
    "image_url": "https://obbohecegyagnqufelpx.supabase.co/storage/v1/object/public/images/oil-500ml-shampoo-500ml-combo/1770471841046-aem14ro.jpeg",
    "status": null,
    "brand": null,
    "sku": "VYRA-OIL-500-SHAMPOO-500-COMBO",
    "description": "Ultimate value combo featuring our largest sizes - 500ml Herbal Hair Oil and 500ml Herbal Shampoo. Best value for families or long-term use. Stock up and save big on the complete Vyra hair care routine!"
  },
  {
    "id": 21,
    "handle": "VYRA-200-SHAMPOO-MASSAGER-COMBO",
    "title": "Shampoo 200ml + Scalp Massager Combo",
    "category": "combo-s",
    "price": 429,
    "regular_price": 698,
    "image_url": "https://obbohecegyagnqufelpx.supabase.co/storage/v1/object/public/images/shampoo-scalp-massager-combo/1769795343375-x5iukp4.jpg",
    "status": null,
    "brand": null,
    "sku": "VYRA-SHAMPOO-200-MASSAGER-COMBO",
    "description": "Perfect scalp care combo featuring our 200ml Herbal Shampoo and Scalp Massager. Use the massager while shampooing to deeply cleanse the scalp, stimulate blood circulation, and promote healthy hair growth. Enhanced cleansing experience!"
  },
  {
    "id": 1,
    "handle": "VYRA-OIL-100",
    "title": "Vyra Herbal Hair Oil - 100ml",
    "category": "hair-oil",
    "price": 249,
    "regular_price": 349,
    "image_url": "https://obbohecegyagnqufelpx.supabase.co/storage/v1/object/public/images/hair-oil-100ml/1769794807906-zgf6vtn.jpg",
    "status": null,
    "brand": null,
    "sku": "VYRA-OIL-100",
    "description": "Vyra Herbal Hair Oil (100ml) For Men & Women | Promotes Hair Growth | Reduces Hair Fall | Controls Dandruff | Suitable for All Hair Types"
  },
  {
    "id": 2,
    "handle": "VYRA-OIL-200",
    "title": "Vyra Herbal Hair Oil - 200ml",
    "category": "hair-oil",
    "price": 429,
    "regular_price": 699,
    "image_url": "https://obbohecegyagnqufelpx.supabase.co/storage/v1/object/public/images/hair-oil-200ml/1769795064167-l7q1kqu.jpg",
    "status": 1,
    "brand": "Vyra Herbals",
    "sku": "VYRA-OIL-200",
    "description": "Vyra Herbal Hair Oil (200ml) For Men & Women | Promotes Hair Growth | Reduces Hair Fall | Controls Dandruff | Suitable for All Hair Types"
  },
  {
    "id": 3,
    "handle": "hVYRA-OIL-500",
    "title": "Vyra Herbal Hair Oil - 500ml",
    "category": "hair-oil",
    "price": 879,
    "regular_price": 1499,
    "image_url": "https://obbohecegyagnqufelpx.supabase.co/storage/v1/object/public/images/hair-oil-500ml/1769797340640-uk28u86.jpeg",
    "status": null,
    "brand": null,
    "sku": "VYRA-OIL-500 ",
    "description": "Premium herbal hair oil crafted with ancient Ayurvedic formulations. This 500ml family-size bottle offers the best value with a powerful blend of natural herbs including Bhringraj, Amla, Brahmi, and Coconut Oil to nourish your scalp, strengthen hair roots, and promote healthy hair growth. Ideal for families and long-term use."
  },
  {
    "id": 11,
    "handle": "VYRA-OIL-100-COMBO",
    "title": "Vyra Herbal Hair Oil 100ml - Pack of 3",
    "category": "hair-oil",
    "price": 579,
    "regular_price": 1497,
    "image_url": "https://obbohecegyagnqufelpx.supabase.co/storage/v1/object/public/images/hair-oil-100ml-combo-3/1769794990102-g8020o1.jpg",
    "status": null,
    "brand": null,
    "sku": "VYRA-OIL-100-COMBO",
    "description": "Vyra Herbal Hair Oil 100ml (Pack of 3) For Men & Women | Promotes Hair Growth | Reduces Hair Fall | Controls Dandruff | Suitable for All Hair Types"
  },
  {
    "id": 12,
    "handle": "VYRA-OIL-200-COMBO",
    "title": "Vyra Herbal Hair Oil 200ml - Pack of 2",
    "category": "hair-oil",
    "price": 729,
    "regular_price": 1598,
    "image_url": "https://obbohecegyagnqufelpx.supabase.co/storage/v1/object/public/images/hair-oil-200ml-combo-2/1769795103249-asaap8d.jpg",
    "status": null,
    "brand": null,
    "sku": "VYRA-OIL-200-COMBO",
    "description": "Vyra Herbal Hair Oil 200ml (Pack of 2) For Men & Women | Promotes Hair Growth | Reduces Hair Fall | Controls Dandruff | Suitable for All Hair Types"
  },
  {
    "id": 9,
    "handle": "MASK-POWDER",
    "title": "Herbal Hair Mask Powder",
    "category": "herbal-hair-mask-powder",
    "price": 199,
    "regular_price": 399,
    "image_url": "https://obbohecegyagnqufelpx.supabase.co/storage/v1/object/public/images/herbal-hair-mask-powder/1771663039180-wsclkdq.jpeg",
    "status": null,
    "brand": null,
    "sku": "VYRA-MASK-POWDER",
    "description": "Traditional Ayurvedic hair mask powder blend containing Amla, Shikakai, Bhringraj, Hibiscus, and Methi. Mix with water, curd, or egg to create a nourishing hair mask that deep conditions hair, reduces hair fall, promotes growth, and adds natural shine. 100% natural with no chemicals or preservatives."
  },
  {
    "id": 22,
    "handle": "vyra-mini-hair-care-kit",
    "title": "Vyra Mini Hair Care Kit",
    "category": "kits",
    "price": 729,
    "regular_price": 1445,
    "image_url": "https://obbohecegyagnqufelpx.supabase.co/storage/v1/object/public/images/vyra-mini-hair-care-kit/1769795651808-43c9af3.jpg",
    "status": null,
    "brand": null,
    "sku": "VYRA-MINI-HAIRCARE-KIT",
    "description": "Complete starter kit for healthy hair! Includes: 100ml Herbal Hair Oil, 200ml Herbal Shampoo, and 2 Neem Wood Combs (Half + Full). Everything you need to begin your natural hair care journey. Perfect gift set!"
  },
  {
    "id": 23,
    "handle": "vyra-complete-hair-care-kit",
    "title": "Vyra Complete Hair Care Kit",
    "category": "kits",
    "price": 879,
    "regular_price": 1745,
    "image_url": "https://obbohecegyagnqufelpx.supabase.co/storage/v1/object/public/images/vyra-complete-hair-care-kit/1769872064574-x5v050f.jpg",
    "status": null,
    "brand": null,
    "sku": "VYRA-COMPLETE-HAIRCARE-KIT",
    "description": "Our most popular kit for comprehensive hair care! Includes: 200ml Herbal Hair Oil, 200ml Herbal Shampoo, and 2 Neem Wood Combs (Half + Full). Upgraded oil size for extended use. Perfect for regular hair care routine!"
  },
  {
    "id": 24,
    "handle": "vyra-mini-scalp-care-kit",
    "title": "Vyra Mini Scalp Care Kit",
    "category": "kits",
    "price": 829,
    "regular_price": 1694,
    "image_url": "https://obbohecegyagnqufelpx.supabase.co/storage/v1/object/public/images/vyra-mini-scalp-care-kit/1769795755905-710ar42.jpg",
    "status": null,
    "brand": null,
    "sku": "VYRA-MINI-SCALPCARE-KIT",
    "description": "Focus on scalp health with this comprehensive kit! Includes: 100ml Herbal Hair Oil, 200ml Herbal Shampoo, 2 Neem Wood Combs, and Scalp Massager. The massager enhances oil absorption and scalp circulation. Starter size perfect for trying out!"
  },
  {
    "id": 25,
    "handle": "vyra-complete-scalp-care-kit",
    "title": "Vyra Complete Scalp Care Kit",
    "category": "kits",
    "price": 979,
    "regular_price": 1994,
    "image_url": "https://obbohecegyagnqufelpx.supabase.co/storage/v1/object/public/images/vyra-complete-scalp-care-kit/1769872101347-7kdggtz.jpg",
    "status": null,
    "brand": null,
    "sku": "VYRA-COMPLETE-SCALPCARE-KIT",
    "description": "Ultimate scalp care solution! Includes: 200ml Herbal Hair Oil, 200ml Herbal Shampoo, 2 Neem Wood Combs, and Scalp Massager. Upgraded oil size for extended scalp therapy. Complete toolkit for healthy scalp and gorgeous hair!"
  },
  {
    "id": 26,
    "handle": "vyra-hair-growth-kit",
    "title": "Vyra Mini Hair Growth Kit",
    "category": "kits",
    "price": 849,
    "regular_price": 1346,
    "image_url": "https://obbohecegyagnqufelpx.supabase.co/storage/v1/object/public/images/vyra-hair-growth-kit/1770281303118-qjl4oy8.jpeg",
    "status": null,
    "brand": null,
    "sku": "VYRA-MINI-HAIRGROWTH-KIT",
    "description": "Targeted kit for hair growth! Includes: 100ml Herbal Hair Oil, 200ml Herbal Shampoo, Herbal Hair Mask Powder, and Dried Rosemary Leaves. Combines the power of daily care with intensive treatments. Perfect for those focusing on growth!"
  },
  {
    "id": 27,
    "handle": "vyra-intensive-hair-growth-kit",
    "title": "Vyra Complete Hair Growth Kit",
    "category": "kits",
    "price": 979,
    "regular_price": 1646,
    "image_url": "https://obbohecegyagnqufelpx.supabase.co/storage/v1/object/public/images/vyra-intensive-hair-growth-kit/1770288433498-6t0q3hr.png",
    "status": null,
    "brand": null,
    "sku": "VYRA-COMPLETE-HAIRGROWTH-KIT",
    "description": "Intensive hair growth solution! Includes: 200ml Herbal Hair Oil (more for extended treatment), 200ml Herbal Shampoo, Herbal Hair Mask Powder, and Dried Rosemary Leaves. For those serious about maximizing hair growth!"
  },
  {
    "id": 28,
    "handle": "vyra-all-in-one-hair-growth-kit",
    "title": "Vyra All-in-One Hair Growth Kit",
    "category": "kits",
    "price": 1099,
    "regular_price": 2042,
    "image_url": "https://obbohecegyagnqufelpx.supabase.co/storage/v1/object/public/images/vyra-all-in-one-hair-growth-kit/1769858480047-bw20842.jpg",
    "status": null,
    "brand": null,
    "sku": "VYRA-ALL-IN-ONE-KIT",
    "description": "The ultimate complete hair care experience! Includes: 100ml Herbal Hair Oil, 200ml Herbal Shampoo, Herbal Hair Mask Powder, Dried Rosemary Leaves, 2 Neem Wood Combs, and Scalp Massager. Everything you need for total hair transformation!"
  },
  {
    "id": 38,
    "handle": "vyra-healthy-hair-kit",
    "title": "Vyra Healthy Hair Kit",
    "category": "kits",
    "price": 729,
    "regular_price": 999,
    "image_url": "https://obbohecegyagnqufelpx.supabase.co/storage/v1/object/public/products/vyra-healthy-hair-kit/1784698714578-mx5hmsw.png",
    "status": null,
    "brand": null,
    "sku": "vyra healthy hair kit",
    "description": "Achieve healthier, stronger-looking hair with the Vyra Healthy Hair Kit\nA complete 3-step herbal hair care routine designed to nourish your scalp, cleanse gently, and care for your hair from root to tip.\n\nThis kit includes everything you need for a holistic hair care routine:\n\nVyra Herbal Hair Oil (100 ml) – Nourishes the scalp and helps reduce hair fall while promoting healthier-looking hair.\nVyr"
  },
  {
    "id": 6,
    "handle": "NEEM-HALF",
    "title": "Neem Wood Half Comb",
    "category": "neem-combs",
    "price": 149,
    "regular_price": 299,
    "image_url": "https://obbohecegyagnqufelpx.supabase.co/storage/v1/object/public/images/neem-half-comb/1769797572260-wxozlbt.jpg",
    "status": null,
    "brand": null,
    "sku": "VYRA-HALF-COMB",
    "description": "Handcrafted neem wood half comb with wide teeth for gentle detangling. Neem has natural antibacterial and antifungal properties that help maintain scalp health. The smooth polished teeth glide through hair without causing breakage or static. Compact size perfect for travel and everyday use."
  },
  {
    "id": 7,
    "handle": "NEEM-FULL",
    "title": "Neem Wood Full Comb",
    "category": "neem-combs",
    "price": 149,
    "regular_price": 299,
    "image_url": "https://obbohecegyagnqufelpx.supabase.co/storage/v1/object/public/images/neem-full-comb/1769797600880-56866ad.jpg",
    "status": null,
    "brand": null,
    "sku": "VYRA-FULL-COMB",
    "description": "Premium handcrafted neem wood full-size comb with both wide and fine teeth. Neem has natural antibacterial and antifungal properties that help maintain scalp health. Features dual-teeth design - wide teeth for detangling and fine teeth for styling. The smooth polished surface prevents hair breakage and eliminates static."
  },
  {
    "id": 14,
    "handle": "NEEM-FULL-HALF",
    "title": "Neem Wood Combs - Pack of 2",
    "category": "neem-combs",
    "price": 229,
    "regular_price": 399,
    "image_url": "https://obbohecegyagnqufelpx.supabase.co/storage/v1/object/public/images/neem-combs-combo-2/1769797623158-lx3krar.jpg",
    "status": null,
    "brand": null,
    "sku": "VYRA-COMBS-PACK-2",
    "description": "Combo pack containing 1 Neem Half Comb and 1 Neem Full Comb. Get the best of both worlds - compact half comb for travel and full-size comb for home use. Handcrafted neem wood with natural antibacterial properties for healthy scalp."
  },
  {
    "id": 10,
    "handle": "ROSEMARY-LEAVES",
    "title": "Dried Rosemary Leaves",
    "category": "rosemary-leaves",
    "price": 149,
    "regular_price": 249,
    "image_url": "https://obbohecegyagnqufelpx.supabase.co/storage/v1/object/public/images/rosemary-leaves/1771662946547-x0yeozh.jpeg",
    "status": null,
    "brand": null,
    "sku": "VYRA-ROSEMARY",
    "description": "Premium quality dried rosemary leaves known for stimulating hair growth and improving scalp health. Rich in antioxidants and anti-inflammatory compounds. Use to make rosemary water rinse, infuse in hair oil, or add to hair masks. Helps darken hair naturally and adds shine."
  },
  {
    "id": 8,
    "handle": "MASSAGER",
    "title": "Scalp Massager",
    "category": "scalp-massager",
    "price": 149,
    "regular_price": 249,
    "image_url": "https://obbohecegyagnqufelpx.supabase.co/storage/v1/object/public/images/scalp-massager/1771935718696-hz94vln.jpg",
    "status": null,
    "brand": null,
    "sku": "VYRA-MASSAGER",
    "description": "Ergonomic scalp massager designed to stimulate blood circulation, promote hair growth, and provide relaxing scalp massage. Features soft silicone bristles that gently exfoliate the scalp, remove product buildup, and distribute natural oils. Can be used wet or dry for maximum versatility."
  },
  {
    "id": 4,
    "handle": "VYRA-SHAMPOO-200",
    "title": "Vyra Herbal Shampoo - 200ml",
    "category": "shampoo",
    "price": 329,
    "regular_price": 449,
    "image_url": "https://obbohecegyagnqufelpx.supabase.co/storage/v1/object/public/images/herbal-shampoo-200ml/1769795134812-b9j9hng.jpg",
    "status": null,
    "brand": null,
    "sku": "VYRA-SHAMPOO-200 ",
    "description": "Vyra Herbal Shampoo (200ml) for Men & Women – Sulphate & Paraben Free, Reduces Hair Fall & Dandruff, Promotes Hair Growth, Suitable for All Hair Types"
  },
  {
    "id": 5,
    "handle": "VYRA-SHAMPOO-500",
    "title": "Vyra Herbal Shampoo - 500ml",
    "category": "shampoo",
    "price": 679,
    "regular_price": 799,
    "image_url": "https://obbohecegyagnqufelpx.supabase.co/storage/v1/object/public/images/herbal-shampoo-500ml/1769861086304-whh3087.jpeg",
    "status": null,
    "brand": null,
    "sku": "VYRA-SHAMPOO-500 ",
    "description": "Vyra Herbal Shampoo (500ml) for Men & Women – Sulphate & Paraben Free, Reduces Hair Fall & Dandruff, Promotes Hair Growth, Suitable for All Hair Types"
  },
  {
    "id": 13,
    "handle": "VYRA-SHAMPOO-200-COMBO",
    "title": "Vyra Herbal Shampoo 200ml - Pack of 2",
    "category": "shampoo",
    "price": 579,
    "regular_price": 898,
    "image_url": "https://obbohecegyagnqufelpx.supabase.co/storage/v1/object/public/images/herbal-shampoo-combo-2/1769795197556-lxsskn2.jpeg",
    "status": null,
    "brand": null,
    "sku": "VYRA-SHAMPOO-200-COMBO",
    "description": "Vyra Herbal Shampoo 200ml(Pack of 2) for Men & Women – Sulphate & Paraben Free, Reduces Hair Fall & Dandruff, Promotes Hair Growth, Suitable for All Hair Types"
  }
];

/** Just the handles, in sitemap-ready order. */
export const STATIC_PRODUCT_HANDLES: string[] = STATIC_PRODUCTS
  .map((p) => p.handle)
  .filter((h): h is string => !!h);
