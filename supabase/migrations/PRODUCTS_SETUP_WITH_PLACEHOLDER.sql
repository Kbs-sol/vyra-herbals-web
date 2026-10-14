-- ========================================
-- VYRA HERBALS - PRODUCTS SETUP (WITH PLACEHOLDER IMAGES)
-- ========================================
-- This script sets up all 28 products with placeholder images
-- Run this in your Supabase SQL Editor
-- ========================================

-- ========================================
-- STEP 1: CLEAR EXISTING PRODUCTS (OPTIONAL - BE CAREFUL!)
-- ========================================
-- This will delete all existing products, reviews, and cart items
-- Comment out these lines if you want to keep existing data

TRUNCATE TABLE cart CASCADE;
TRUNCATE TABLE reviews CASCADE;
TRUNCATE TABLE products CASCADE;

-- ========================================
-- STEP 2: INSERT ALL PRODUCTS
-- ========================================
-- Products will get sequential IDs automatically starting from 1
-- Using /assets/images/vyra_placeholder.png as placeholder until real images are uploaded

-- ========================================
-- SINGLE PRODUCTS (IDs 1-10)
-- ========================================

-- Product ID 1: 100ml Oil Bottle
INSERT INTO products (handle, title, description, price, regular_price, image_url, category)
VALUES (
  'hair-oil-100ml',
  'Vyra Herbal Hair Oil - 100ml',
  'Premium herbal hair oil crafted with ancient Ayurvedic formulations. This 100ml bottle contains a powerful blend of natural herbs including Bhringraj, Amla, Brahmi, and Coconut Oil to nourish your scalp, strengthen hair roots, and promote healthy hair growth. Perfect for daily use and suitable for all hair types.',
  349,
  499,
  '/assets/images/vyra_placeholder.png',
  'hair-oil'
);

-- Product ID 2: 200ml Oil Bottle
INSERT INTO products (handle, title, description, price, regular_price, image_url, category)
VALUES (
  'hair-oil-200ml',
  'Vyra Herbal Hair Oil - 200ml',
  'Premium herbal hair oil crafted with ancient Ayurvedic formulations. This 200ml bottle offers excellent value with a powerful blend of natural herbs including Bhringraj, Amla, Brahmi, and Coconut Oil to nourish your scalp, strengthen hair roots, and promote healthy hair growth. Perfect for regular use and suitable for all hair types.',
  599,
  799,
  '/assets/images/vyra_placeholder.png',
  'hair-oil'
);

-- Product ID 3: 500ml Oil Bottle
INSERT INTO products (handle, title, description, price, regular_price, image_url, category)
VALUES (
  'hair-oil-500ml',
  'Vyra Herbal Hair Oil - 500ml',
  'Premium herbal hair oil crafted with ancient Ayurvedic formulations. This 500ml family-size bottle offers the best value with a powerful blend of natural herbs including Bhringraj, Amla, Brahmi, and Coconut Oil to nourish your scalp, strengthen hair roots, and promote healthy hair growth. Ideal for families and long-term use.',
  999,
  1499,
  '/assets/images/vyra_placeholder.png',
  'hair-oil'
);

-- Product ID 4: Shampoo 200ml
INSERT INTO products (handle, title, description, price, regular_price, image_url, category)
VALUES (
  'herbal-shampoo-200ml',
  'Vyra Herbal Shampoo - 200ml',
  'Gentle yet effective herbal shampoo formulated with natural cleansers and nourishing herbs. This 200ml bottle contains Shikakai, Reetha, Hibiscus, and Aloe Vera to cleanse your scalp without stripping natural oils, reduce dandruff, and add shine to your hair. Sulfate-free and paraben-free formula suitable for daily use.',
  299,
  449,
  '/assets/images/vyra_placeholder.png',
  'shampoo'
);

-- Product ID 5: Shampoo 500ml
INSERT INTO products (handle, title, description, price, regular_price, image_url, category)
VALUES (
  'herbal-shampoo-500ml',
  'Vyra Herbal Shampoo - 500ml',
  'Gentle yet effective herbal shampoo formulated with natural cleansers and nourishing herbs. This 500ml family-size bottle offers the best value with Shikakai, Reetha, Hibiscus, and Aloe Vera to cleanse your scalp without stripping natural oils, reduce dandruff, and add shine to your hair. Sulfate-free and paraben-free formula.',
  549,
  799,
  '/assets/images/vyra_placeholder.png',
  'shampoo'
);

-- Product ID 6: Neem Half Comb
INSERT INTO products (handle, title, description, price, regular_price, image_url, category)
VALUES (
  'neem-half-comb',
  'Neem Wood Half Comb',
  'Handcrafted neem wood half comb with wide teeth for gentle detangling. Neem has natural antibacterial and antifungal properties that help maintain scalp health. The smooth polished teeth glide through hair without causing breakage or static. Compact size perfect for travel and everyday use.',
  199,
  299,
  '/assets/images/vyra_placeholder.png',
  'combs'
);

-- Product ID 7: Neem Full Comb
INSERT INTO products (handle, title, description, price, regular_price, image_url, category)
VALUES (
  'neem-full-comb',
  'Neem Wood Full Comb',
  'Premium handcrafted neem wood full-size comb with both wide and fine teeth. Neem has natural antibacterial and antifungal properties that help maintain scalp health. Features dual-teeth design - wide teeth for detangling and fine teeth for styling. The smooth polished surface prevents hair breakage and eliminates static.',
  249,
  399,
  '/assets/images/vyra_placeholder.png',
  'combs'
);

-- Product ID 8: Scalp Massager
INSERT INTO products (handle, title, description, price, regular_price, image_url, category)
VALUES (
  'scalp-massager',
  'Scalp Massager',
  'Ergonomic scalp massager designed to stimulate blood circulation, promote hair growth, and provide relaxing scalp massage. Features soft silicone bristles that gently exfoliate the scalp, remove product buildup, and distribute natural oils. Can be used wet or dry for maximum versatility.',
  149,
  249,
  '/assets/images/vyra_placeholder.png',
  'scalp-massager'
);

-- Product ID 9: Herbal Hair Mask Powder
INSERT INTO products (handle, title, description, price, regular_price, image_url, category)
VALUES (
  'herbal-hair-mask-powder',
  'Herbal Hair Mask Powder',
  'Traditional Ayurvedic hair mask powder blend containing Amla, Shikakai, Bhringraj, Hibiscus, and Methi. Mix with water, curd, or egg to create a nourishing hair mask that deep conditions hair, reduces hair fall, promotes growth, and adds natural shine. 100% natural with no chemicals or preservatives.',
  249,
  399,
  '/assets/images/vyra_placeholder.png',
  'hair-care'
);

-- Product ID 10: Rosemary Leaves
INSERT INTO products (handle, title, description, price, regular_price, image_url, category)
VALUES (
  'rosemary-leaves',
  'Dried Rosemary Leaves',
  'Premium quality dried rosemary leaves known for stimulating hair growth and improving scalp health. Rich in antioxidants and anti-inflammatory compounds. Use to make rosemary water rinse, infuse in hair oil, or add to hair masks. Helps darken hair naturally and adds shine.',
  149,
  249,
  '/assets/images/vyra_placeholder.png',
  'hair-care'
);

-- ========================================
-- SAME PRODUCT COMBOS (IDs 11-14)
-- ========================================

-- Product ID 11: 100ml Oil Combo (3 bottles)
INSERT INTO products (handle, title, description, price, regular_price, image_url, category)
VALUES (
  'hair-oil-100ml-combo',
  'Vyra Hair Oil 100ml - Pack of 3',
  'Value pack containing 3 bottles of our premium 100ml Herbal Hair Oil. Perfect for monthly use or sharing with family. Each bottle contains the same powerful Ayurvedic blend of Bhringraj, Amla, Brahmi, and Coconut Oil. Save more with this combo offer.',
  899,
  1497,
  '/assets/images/vyra_placeholder.png',
  'combos'
);

-- Product ID 12: 200ml Oil Combo (2 bottles)
INSERT INTO products (handle, title, description, price, regular_price, image_url, category)
VALUES (
  'hair-oil-200ml-combo',
  'Vyra Hair Oil 200ml - Pack of 2',
  'Value pack containing 2 bottles of our premium 200ml Herbal Hair Oil. Ideal for couples or extended use. Each bottle contains the same powerful Ayurvedic blend of Bhringraj, Amla, Brahmi, and Coconut Oil. Great savings with this combo offer.',
  999,
  1598,
  '/assets/images/vyra_placeholder.png',
  'combos'
);

-- Product ID 13: Shampoo Combo (2 bottles 200ml each)
INSERT INTO products (handle, title, description, price, regular_price, image_url, category)
VALUES (
  'herbal-shampoo-combo',
  'Vyra Herbal Shampoo 200ml - Pack of 2',
  'Value pack containing 2 bottles of our gentle Herbal Shampoo (200ml each). Perfect for family use or extended supply. Each bottle contains the same nourishing blend of Shikakai, Reetha, Hibiscus, and Aloe Vera. Sulfate-free and paraben-free formula.',
  499,
  898,
  '/assets/images/vyra_placeholder.png',
  'combos'
);

-- Product ID 14: Neem Combs Combo (Half + Full)
INSERT INTO products (handle, title, description, price, regular_price, image_url, category)
VALUES (
  'neem-combs-combo',
  'Neem Wood Combs Combo - Half & Full',
  'Complete neem wood comb set containing both the Half Comb and Full Comb. Half comb for everyday detangling and travel, full comb for thorough styling at home. Both handcrafted from premium neem wood with natural antibacterial properties.',
  399,
  698,
  '/assets/images/vyra_placeholder.png',
  'combos'
);

-- ========================================
-- OIL + SHAMPOO COMBOS (IDs 15-21)
-- ========================================

-- Product ID 15: 100ml Oil + 200ml Shampoo
INSERT INTO products (handle, title, description, price, regular_price, image_url, category)
VALUES (
  'oil-shampoo-combo-1',
  'Hair Care Duo - 100ml Oil + 200ml Shampoo',
  'Perfect starter combo with 100ml Herbal Hair Oil and 200ml Herbal Shampoo. The oil nourishes and strengthens while the shampoo gently cleanses without stripping natural oils. Ideal for trying our products or for light users.',
  549,
  948,
  '/assets/images/vyra_placeholder.png',
  'combos'
);

-- Product ID 16: 200ml Oil + 200ml Shampoo
INSERT INTO products (handle, title, description, price, regular_price, image_url, category)
VALUES (
  'oil-shampoo-combo-2',
  'Hair Care Duo - 200ml Oil + 200ml Shampoo',
  'Our most popular combo with 200ml Herbal Hair Oil and 200ml Herbal Shampoo. Balanced sizes perfect for regular use. The complete hair care routine - oil for nourishment and shampoo for gentle cleansing.',
  799,
  1248,
  '/assets/images/vyra_placeholder.png',
  'combos'
);

-- Product ID 17: 500ml Oil + 200ml Shampoo
INSERT INTO products (handle, title, description, price, regular_price, image_url, category)
VALUES (
  'oil-shampoo-combo-3',
  'Hair Care Duo - 500ml Oil + 200ml Shampoo',
  'Value combo with 500ml Herbal Hair Oil and 200ml Herbal Shampoo. Perfect for those who oil their hair frequently. The large oil bottle ensures you never run out while the shampoo keeps your hair fresh and clean.',
  1149,
  1948,
  '/assets/images/vyra_placeholder.png',
  'combos'
);

-- Product ID 18: 100ml Oil + 500ml Shampoo
INSERT INTO products (handle, title, description, price, regular_price, image_url, category)
VALUES (
  'oil-shampoo-combo-4',
  'Hair Care Duo - 100ml Oil + 500ml Shampoo',
  'Combo with 100ml Herbal Hair Oil and 500ml Herbal Shampoo. Ideal for those who shampoo frequently but oil occasionally. The large shampoo bottle provides excellent value for daily hair washing.',
  799,
  1048,
  '/assets/images/vyra_placeholder.png',
  'combos'
);

-- Product ID 19: 200ml Oil + 500ml Shampoo
INSERT INTO products (handle, title, description, price, regular_price, image_url, category)
VALUES (
  'oil-shampoo-combo-5',
  'Hair Care Duo - 200ml Oil + 500ml Shampoo',
  'Balanced combo with 200ml Herbal Hair Oil and 500ml Herbal Shampoo. Great for families or those who prefer larger shampoo sizes. Complete hair care routine with excellent savings.',
  999,
  1348,
  '/assets/images/vyra_placeholder.png',
  'combos'
);

-- Product ID 20: 500ml Oil + 500ml Shampoo
INSERT INTO products (handle, title, description, price, regular_price, image_url, category)
VALUES (
  'oil-shampoo-combo-6',
  'Hair Care Duo - 500ml Oil + 500ml Shampoo',
  'Our largest combo with 500ml Herbal Hair Oil and 500ml Herbal Shampoo. Best value for families or bulk buyers. Both products in their largest sizes ensure months of premium hair care.',
  1399,
  2298,
  '/assets/images/vyra_placeholder.png',
  'combos'
);

-- Product ID 21: Shampoo + Scalp Massager
INSERT INTO products (handle, title, description, price, regular_price, image_url, category)
VALUES (
  'shampoo-massager-combo',
  'Shampoo & Scalp Massager Combo',
  'Perfect cleansing combo with 200ml Herbal Shampoo and Scalp Massager. Use the massager while shampooing for deeper cleaning, better blood circulation, and a relaxing spa-like experience at home.',
  399,
  698,
  '/assets/images/vyra_placeholder.png',
  'combos'
);

-- ========================================
-- KITS (IDs 22-28)
-- ========================================

-- Product ID 22: Mini Hair Care Kit
INSERT INTO products (handle, title, description, price, regular_price, image_url, category)
VALUES (
  'mini-hair-care-kit',
  'Vyra Mini Hair Care Kit',
  'Perfect starter kit containing: 100ml Herbal Hair Oil, 200ml Herbal Shampoo, Neem Half Comb, and Neem Full Comb. Everything you need to start your natural hair care journey. Great as a gift or for trying our range.',
  799,
  1446,
  '/assets/images/vyra_placeholder.png',
  'kits'
);

-- Product ID 23: Complete Hair Care Kit
INSERT INTO products (handle, title, description, price, regular_price, image_url, category)
VALUES (
  'complete-hair-care-kit',
  'Vyra Complete Hair Care Kit',
  'Our best-selling kit containing: 200ml Herbal Hair Oil, 200ml Herbal Shampoo, Neem Half Comb, and Neem Full Comb. Complete hair care solution with our most popular sizes. Perfect balance of nourishment and care.',
  999,
  1746,
  '/assets/images/vyra_placeholder.png',
  'kits'
);

-- Product ID 24: Mini Scalp Care Kit
INSERT INTO products (handle, title, description, price, regular_price, image_url, category)
VALUES (
  'mini-scalp-care-kit',
  'Vyra Mini Scalp Care Kit',
  'Focused scalp care kit containing: 100ml Herbal Hair Oil, 200ml Herbal Shampoo, Neem Half Comb, Neem Full Comb, and Scalp Massager. Extra attention to scalp health with the addition of our popular massager.',
  899,
  1695,
  '/assets/images/vyra_placeholder.png',
  'kits'
);

-- Product ID 25: Complete Scalp Care Kit
INSERT INTO products (handle, title, description, price, regular_price, image_url, category)
VALUES (
  'complete-scalp-care-kit',
  'Vyra Complete Scalp Care Kit',
  'Premium scalp care kit containing: 200ml Herbal Hair Oil, 200ml Herbal Shampoo, Neem Half Comb, Neem Full Comb, and Scalp Massager. Our most comprehensive kit for those serious about scalp and hair health.',
  1099,
  1995,
  '/assets/images/vyra_placeholder.png',
  'kits'
);

-- Product ID 26: Hair Growth Kit
INSERT INTO products (handle, title, description, price, regular_price, image_url, category)
VALUES (
  'hair-growth-kit',
  'Vyra Hair Growth Kit',
  'Targeted hair growth kit containing: 100ml Herbal Hair Oil, 200ml Herbal Shampoo, Herbal Hair Mask Powder, and Dried Rosemary Leaves. Focused on promoting hair growth with our most effective growth-boosting products.',
  849,
  1396,
  '/assets/images/vyra_placeholder.png',
  'kits'
);

-- Product ID 27: Intensive Hair Growth Kit
INSERT INTO products (handle, title, description, price, regular_price, image_url, category)
VALUES (
  'intensive-hair-growth-kit',
  'Vyra Intensive Hair Growth Kit',
  'Advanced hair growth kit containing: 200ml Herbal Hair Oil, 200ml Herbal Shampoo, Herbal Hair Mask Powder, and Dried Rosemary Leaves. Larger oil size for intensive treatment. Perfect for those experiencing hair fall.',
  999,
  1696,
  '/assets/images/vyra_placeholder.png',
  'kits'
);

-- Product ID 28: All-in-One Kit
INSERT INTO products (handle, title, description, price, regular_price, image_url, category)
VALUES (
  'all-in-one-kit',
  'Vyra All-in-One Hair Care Kit',
  'Our ultimate kit containing EVERYTHING: 100ml Herbal Hair Oil, 200ml Herbal Shampoo, Herbal Hair Mask Powder, Dried Rosemary Leaves, Neem Half Comb, Neem Full Comb, and Scalp Massager. The complete Vyra experience in one package.',
  1499,
  2643,
  '/assets/images/vyra_placeholder.png',
  'kits'
);

-- ========================================
-- STEP 3: VERIFY PRODUCTS
-- ========================================
SELECT id, handle, title, price, regular_price, category FROM products ORDER BY id;

-- ========================================
-- STEP 4: ADD PERFORMANCE INDEXES
-- ========================================
CREATE INDEX IF NOT EXISTS idx_products_id ON products(id);
CREATE INDEX IF NOT EXISTS idx_products_handle ON products(handle);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_price ON products(price);

-- ========================================
-- NOTES:
-- ========================================
-- All products use /assets/images/vyra_placeholder.png as the image
-- To update with real images, run:
-- UPDATE products SET image_url = 'your-actual-image-filename.png' WHERE handle = 'product-handle';
-- 
-- Or if using Supabase Storage:
-- UPDATE products SET image_url = 'https://your-project.supabase.co/storage/v1/object/public/images/filename.png' WHERE handle = 'product-handle';
