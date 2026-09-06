-- ========================================
-- VYRA HERBALS - COMPLETE PRODUCTS SETUP
-- ========================================
-- This script sets up all 28 products with correct IDs (1-28)
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
  'hair-oil-100ml.png',
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
  'hair-oil-200ml.png',
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
  'hair-oil-500ml.png',
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
  'herbal-shampoo-200ml.png',
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
  'herbal-shampoo-500ml.png',
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
  'neem-half-comb.png',
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
  'neem-full-comb.png',
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
  'scalp-massager.png',
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
  'herbal-hair-mask-powder.png',
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
  'rosemary-leaves.png',
  'hair-care'
);

-- ========================================
-- SAME PRODUCT COMBOS (IDs 11-14)
-- ========================================

-- Product ID 11: 100ml Oil Combo (3 bottles)
INSERT INTO products (handle, title, description, price, regular_price, image_url, category)
VALUES (
  'hair-oil-100ml-combo-3',
  'Vyra Herbal Hair Oil 100ml - Pack of 3',
  'Value combo pack containing 3 bottles of our premium 100ml Herbal Hair Oil. Perfect for stocking up or sharing with family. Each bottle contains the same powerful blend of Bhringraj, Amla, Brahmi, and Coconut Oil. Save more with this combo offer!',
  899,
  1497,
  'hair-oil-100ml-combo.png',
  'combos'
);

-- Product ID 12: 200ml Oil Combo (2 bottles)
INSERT INTO products (handle, title, description, price, regular_price, image_url, category)
VALUES (
  'hair-oil-200ml-combo-2',
  'Vyra Herbal Hair Oil 200ml - Pack of 2',
  'Value combo pack containing 2 bottles of our premium 200ml Herbal Hair Oil. Perfect for extended use or sharing with family. Each bottle contains the same powerful blend of Bhringraj, Amla, Brahmi, and Coconut Oil. Save more with this combo offer!',
  999,
  1598,
  'hair-oil-200ml-combo.png',
  'combos'
);

-- Product ID 13: Shampoo Combo (2 bottles)
INSERT INTO products (handle, title, description, price, regular_price, image_url, category)
VALUES (
  'herbal-shampoo-combo-2',
  'Vyra Herbal Shampoo 200ml - Pack of 2',
  'Value combo pack containing 2 bottles of our gentle Herbal Shampoo (200ml each). Stock up on your favorite sulfate-free, paraben-free shampoo. Contains Shikakai, Reetha, Hibiscus, and Aloe Vera for gentle cleansing and nourishment.',
  499,
  898,
  'herbal-shampoo-combo.png',
  'combos'
);

-- Product ID 14: Neem Combs Combo (2 combs)
INSERT INTO products (handle, title, description, price, regular_price, image_url, category)
VALUES (
  'neem-combs-combo-2',
  'Neem Wood Combs - Pack of 2',
  'Combo pack containing 1 Neem Half Comb and 1 Neem Full Comb. Get the best of both worlds - compact half comb for travel and full-size comb for home use. Handcrafted neem wood with natural antibacterial properties for healthy scalp.',
  399,
  698,
  'neem-combs-combo.png',
  'combos'
);

-- ========================================
-- OIL + SHAMPOO COMBOS (IDs 15-21)
-- ========================================

-- Product ID 15: 100ml Oil + 200ml Shampoo
INSERT INTO products (handle, title, description, price, regular_price, image_url, category)
VALUES (
  'oil-100ml-shampoo-200ml-combo',
  'Hair Oil 100ml + Shampoo 200ml Combo',
  'Complete hair care combo featuring our 100ml Herbal Hair Oil and 200ml Herbal Shampoo. The perfect starter kit for healthy hair. Oil before wash, shampoo after - experience the complete Vyra hair care routine. Great value combo price!',
  549,
  948,
  'oil-shampoo-combo-1.png',
  'combos'
);

-- Product ID 16: 200ml Oil + 200ml Shampoo
INSERT INTO products (handle, title, description, price, regular_price, image_url, category)
VALUES (
  'oil-200ml-shampoo-200ml-combo',
  'Hair Oil 200ml + Shampoo 200ml Combo',
  'Complete hair care combo featuring our 200ml Herbal Hair Oil and 200ml Herbal Shampoo. Balanced combo for regular hair care routine. Oil before wash, shampoo after - experience the complete Vyra hair care routine. Excellent value!',
  749,
  1248,
  'oil-shampoo-combo-2.png',
  'combos'
);

-- Product ID 17: 500ml Oil + 200ml Shampoo
INSERT INTO products (handle, title, description, price, regular_price, image_url, category)
VALUES (
  'oil-500ml-shampoo-200ml-combo',
  'Hair Oil 500ml + Shampoo 200ml Combo',
  'Complete hair care combo featuring our large 500ml Herbal Hair Oil and 200ml Herbal Shampoo. Perfect for those who love our oil and want to stock up. Experience the complete Vyra hair care routine at an amazing value!',
  1099,
  1948,
  'oil-shampoo-combo-3.png',
  'combos'
);

-- Product ID 18: 100ml Oil + 500ml Shampoo
INSERT INTO products (handle, title, description, price, regular_price, image_url, category)
VALUES (
  'oil-100ml-shampoo-500ml-combo',
  'Hair Oil 100ml + Shampoo 500ml Combo',
  'Complete hair care combo featuring our 100ml Herbal Hair Oil and large 500ml Herbal Shampoo. Ideal for those who shampoo frequently. Experience the complete Vyra hair care routine at great savings!',
  749,
  1048,
  'oil-shampoo-combo-4.png',
  'combos'
);

-- Product ID 19: 200ml Oil + 500ml Shampoo
INSERT INTO products (handle, title, description, price, regular_price, image_url, category)
VALUES (
  'oil-200ml-shampoo-500ml-combo',
  'Hair Oil 200ml + Shampoo 500ml Combo',
  'Complete hair care combo featuring our 200ml Herbal Hair Oil and large 500ml Herbal Shampoo. Perfect balance for regular oil application and frequent washing. Great value for the complete Vyra experience!',
  949,
  1348,
  'oil-shampoo-combo-5.png',
  'combos'
);

-- Product ID 20: 500ml Oil + 500ml Shampoo
INSERT INTO products (handle, title, description, price, regular_price, image_url, category)
VALUES (
  'oil-500ml-shampoo-500ml-combo',
  'Hair Oil 500ml + Shampoo 500ml Combo',
  'Ultimate value combo featuring our largest sizes - 500ml Herbal Hair Oil and 500ml Herbal Shampoo. Best value for families or long-term use. Stock up and save big on the complete Vyra hair care routine!',
  1299,
  2298,
  'oil-shampoo-combo-6.png',
  'combos'
);

-- Product ID 21: Shampoo + Scalp Massager
INSERT INTO products (handle, title, description, price, regular_price, image_url, category)
VALUES (
  'shampoo-scalp-massager-combo',
  'Shampoo 200ml + Scalp Massager Combo',
  'Perfect scalp care combo featuring our 200ml Herbal Shampoo and Scalp Massager. Use the massager while shampooing to deeply cleanse the scalp, stimulate blood circulation, and promote healthy hair growth. Enhanced cleansing experience!',
  399,
  698,
  'shampoo-massager-combo.png',
  'combos'
);

-- ========================================
-- VYRA HERBALS KITS (IDs 22-28)
-- ========================================

-- Product ID 22: Vyra Mini Hair Care Kit
INSERT INTO products (handle, title, description, price, regular_price, image_url, category)
VALUES (
  'vyra-mini-hair-care-kit',
  'Vyra Mini Hair Care Kit',
  'Complete starter kit for healthy hair! Includes: 100ml Herbal Hair Oil, 200ml Herbal Shampoo, and 2 Neem Wood Combs (Half + Full). Everything you need to begin your natural hair care journey. Perfect gift set!',
  799,
  1445,
  'mini-hair-care-kit.png',
  'kits'
);

-- Product ID 23: Vyra Complete Hair Care Kit
INSERT INTO products (handle, title, description, price, regular_price, image_url, category)
VALUES (
  'vyra-complete-hair-care-kit',
  'Vyra Complete Hair Care Kit',
  'Our most popular kit for comprehensive hair care! Includes: 200ml Herbal Hair Oil, 200ml Herbal Shampoo, and 2 Neem Wood Combs (Half + Full). Upgraded oil size for extended use. Perfect for regular hair care routine!',
  999,
  1745,
  'complete-hair-care-kit.png',
  'kits'
);

-- Product ID 24: Vyra Mini Scalp Care Kit
INSERT INTO products (handle, title, description, price, regular_price, image_url, category)
VALUES (
  'vyra-mini-scalp-care-kit',
  'Vyra Mini Scalp Care Kit',
  'Focus on scalp health with this comprehensive kit! Includes: 100ml Herbal Hair Oil, 200ml Herbal Shampoo, 2 Neem Wood Combs, and Scalp Massager. The massager enhances oil absorption and scalp circulation. Starter size perfect for trying out!',
  899,
  1694,
  'mini-scalp-care-kit.png',
  'kits'
);

-- Product ID 25: Vyra Complete Scalp Care Kit
INSERT INTO products (handle, title, description, price, regular_price, image_url, category)
VALUES (
  'vyra-complete-scalp-care-kit',
  'Vyra Complete Scalp Care Kit',
  'Ultimate scalp care solution! Includes: 200ml Herbal Hair Oil, 200ml Herbal Shampoo, 2 Neem Wood Combs, and Scalp Massager. Upgraded oil size for extended scalp therapy. Complete toolkit for healthy scalp and gorgeous hair!',
  1099,
  1994,
  'complete-scalp-care-kit.png',
  'kits'
);

-- Product ID 26: Vyra Hair Growth Kit
INSERT INTO products (handle, title, description, price, regular_price, image_url, category)
VALUES (
  'vyra-hair-growth-kit',
  'Vyra Hair Growth Kit',
  'Targeted kit for hair growth! Includes: 100ml Herbal Hair Oil, 200ml Herbal Shampoo, Herbal Hair Mask Powder, and Dried Rosemary Leaves. Combines the power of daily care with intensive treatments. Perfect for those focusing on growth!',
  849,
  1346,
  'hair-growth-kit.png',
  'kits'
);

-- Product ID 27: Vyra Intensive Hair Growth Kit
INSERT INTO products (handle, title, description, price, regular_price, image_url, category)
VALUES (
  'vyra-intensive-hair-growth-kit',
  'Vyra Intensive Hair Growth Kit',
  'Intensive hair growth solution! Includes: 200ml Herbal Hair Oil (more for extended treatment), 200ml Herbal Shampoo, Herbal Hair Mask Powder, and Dried Rosemary Leaves. For those serious about maximizing hair growth!',
  1049,
  1646,
  'intensive-hair-growth-kit.png',
  'kits'
);

-- Product ID 28: Vyra All-in-One Hair Growth Kit
INSERT INTO products (handle, title, description, price, regular_price, image_url, category)
VALUES (
  'vyra-all-in-one-hair-growth-kit',
  'Vyra All-in-One Hair Growth Kit',
  'The ultimate complete hair care experience! Includes: 100ml Herbal Hair Oil, 200ml Herbal Shampoo, Herbal Hair Mask Powder, Dried Rosemary Leaves, 2 Neem Wood Combs, and Scalp Massager. Everything you need for total hair transformation!',
  1299,
  2042,
  'all-in-one-kit.png',
  'kits'
);

-- ========================================
-- STEP 3: UPDATE CATEGORIES (OPTIONAL - Comment out if you get errors)
-- ========================================
-- If your categories table has different columns, skip this section
-- The products will still work since they use category as a text field

-- Uncomment below if you want to set up categories:
/*
-- First ensure categories table exists with correct structure
CREATE TABLE IF NOT EXISTS categories (
  id BIGSERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO categories (name, slug, description, image_url) VALUES
  ('Hair Oil', 'hair-oil', 'Nourishing Ayurvedic hair oils for healthy, strong hair', 'cat-hair-oil.png'),
  ('Shampoo', 'shampoo', 'Natural herbal shampoos - sulfate & paraben free', 'cat-shampoo.png'),
  ('Combs', 'combs', 'Handcrafted neem wood combs for gentle hair care', 'cat-combs.png'),
  ('Scalp Massager', 'scalp-massager', 'Scalp massaging tools for improved circulation', 'cat-massager.png'),
  ('Hair Care', 'hair-care', 'Additional hair care products - masks, herbs & more', 'cat-hair-care.png'),
  ('Combos', 'combos', 'Value combo packs - save more!', 'cat-combos.png'),
  ('Kits', 'kits', 'Complete hair care kits for total transformation', 'cat-kits.png')
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  image_url = EXCLUDED.image_url;
*/

-- ========================================
-- STEP 4: VERIFY PRODUCTS
-- ========================================
SELECT id, handle, title, price, regular_price, category FROM products ORDER BY id;

-- ========================================
-- STEP 5: ADD PERFORMANCE INDEXES
-- ========================================
CREATE INDEX IF NOT EXISTS idx_products_id ON products(id);
CREATE INDEX IF NOT EXISTS idx_products_handle ON products(handle);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_price ON products(price);

-- ========================================
-- PRODUCT ID REFERENCE TABLE
-- ========================================
/*
SINGLE PRODUCTS:
  ID 1  - 100ml Oil Bottle
  ID 2  - 200ml Oil Bottle
  ID 3  - 500ml Oil Bottle
  ID 4  - Shampoo 200ml
  ID 5  - Shampoo 500ml
  ID 6  - Neem Half Comb
  ID 7  - Neem Full Comb
  ID 8  - Scalp Massager
  ID 9  - Herbal Hair Mask Powder
  ID 10 - Rosemary Leaves

SAME PRODUCT COMBOS:
  ID 11 - 100ml Oil Combo (3 bottles)
  ID 12 - 200ml Oil Combo (2 bottles)
  ID 13 - Shampoo Combo (2 bottles)
  ID 14 - Neem Combs Combo (2 combs)

OIL + SHAMPOO COMBOS:
  ID 15 - 100ml Oil + 200ml Shampoo
  ID 16 - 200ml Oil + 200ml Shampoo
  ID 17 - 500ml Oil + 200ml Shampoo
  ID 18 - 100ml Oil + 500ml Shampoo
  ID 19 - 200ml Oil + 500ml Shampoo
  ID 20 - 500ml Oil + 500ml Shampoo
  ID 21 - Shampoo + Scalp Massager

KITS:
  ID 22 - Vyra Mini Hair Care Kit (100ml Oil + Shampoo + 2 Combs)
  ID 23 - Vyra Complete Hair Care Kit (200ml Oil + Shampoo + 2 Combs)
  ID 24 - Vyra Mini Scalp Care Kit (100ml Oil + Shampoo + 2 Combs + Massager)
  ID 25 - Vyra Complete Scalp Care Kit (200ml Oil + Shampoo + 2 Combs + Massager)
  ID 26 - Vyra Hair Growth Kit (100ml Oil + Shampoo + Mask + Rosemary)
  ID 27 - Vyra Intensive Hair Growth Kit (200ml Oil + Shampoo + Mask + Rosemary)
  ID 28 - Vyra All-in-One Kit (100ml Oil + Shampoo + Mask + Rosemary + 2 Combs + Massager)
*/
