-- ========================================
-- FIX PRODUCT IMAGES - Use Placeholder
-- ========================================
-- Run this to update all products to use the placeholder image
-- This fixes the broken images issue

UPDATE products 
SET image_url = '/assets/images/vyra_placeholder.png' 
WHERE image_url IS NULL 
   OR image_url NOT LIKE '/%' 
   OR image_url NOT LIKE 'http%';

-- Verify the update
SELECT id, handle, title, image_url FROM products ORDER BY id;
