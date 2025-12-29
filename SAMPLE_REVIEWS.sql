-- ========================================
-- VYRA HERBALS - SAMPLE REVIEWS
-- ========================================
-- This script adds sample customer reviews/testimonials
-- Run this in your Supabase SQL Editor after PRODUCTS_SETUP.sql
-- ========================================

-- Insert sample reviews for testimonials display
INSERT INTO reviews (product_id, rating, reviewer_name, review_text, status, created_at) VALUES
-- 5-star reviews
(1, 5, 'Priya Sharma', 'Amazing hair oil! My hair has become so soft and shiny after using it for just 2 weeks. The herbal fragrance is so refreshing. Highly recommend this product to everyone!', 1, NOW() - INTERVAL '30 days'),
(2, 5, 'Rahul Verma', 'Best hair oil I have ever used. My hair fall has reduced significantly. The quality is excellent and you can feel it''s made with pure natural ingredients.', 1, NOW() - INTERVAL '28 days'),
(3, 5, 'Anita Patel', 'I bought the 500ml bottle for my whole family. Everyone loves it! Great value for money and the results are visible within weeks.', 1, NOW() - INTERVAL '25 days'),
(4, 5, 'Deepak Kumar', 'This shampoo is gentle yet effective. My dandruff is completely gone after using it for a month. No more itchy scalp!', 1, NOW() - INTERVAL '22 days'),
(5, 5, 'Sneha Reddy', 'The best herbal shampoo in the market. Sulfate-free and my hair feels so healthy. Will definitely buy again!', 1, NOW() - INTERVAL '20 days'),
(6, 5, 'Vikram Singh', 'The neem comb is a game changer! No more static and my hair looks healthier. The craftsmanship is excellent.', 1, NOW() - INTERVAL '18 days'),
(7, 5, 'Kavita Joshi', 'I use this full neem comb daily. It glides through my long hair without any pulling. Love the natural antibacterial properties!', 1, NOW() - INTERVAL '15 days'),
(8, 5, 'Amit Gupta', 'The scalp massager is so relaxing! I use it while applying the hair oil and it really helps with blood circulation.', 1, NOW() - INTERVAL '12 days'),

-- 4-star reviews
(1, 4, 'Neha Agarwal', 'Good product, nice fragrance. Slight improvement in hair texture. Would have given 5 stars if the bottle was bigger.', 1, NOW() - INTERVAL '10 days'),
(2, 4, 'Suresh Nair', 'Quality is good. My wife and I both use it. Hair feels nourished. Delivery was quick too!', 1, NOW() - INTERVAL '8 days'),
(3, 4, 'Meera Iyer', 'Excellent oil for the price. Using it for a month now and seeing good results with hair growth.', 1, NOW() - INTERVAL '6 days'),
(4, 4, 'Rajesh Menon', 'Nice shampoo, cleans well without making hair dry. Packaging could be better though.', 1, NOW() - INTERVAL '4 days'),
(5, 4, 'Pooja Desai', 'Good herbal shampoo. Takes some time to show results but worth the wait. Hair is much smoother now.', 1, NOW() - INTERVAL '2 days'),

-- More 5-star reviews
(1, 5, 'Sunita Rao', 'Vyra hair oil is simply the best! I''ve tried many brands but nothing compares to this. Pure and effective!', 1, NOW() - INTERVAL '35 days'),
(2, 5, 'Karthik Subramanian', 'My mother recommended this and I''m so glad I tried it. Hair fall reduced by 80% in 6 weeks!', 1, NOW() - INTERVAL '32 days'),
(6, 5, 'Lakshmi Venkatesh', 'Beautiful handcrafted comb. You can feel the quality. A must-have for healthy hair care routine.', 1, NOW() - INTERVAL '14 days'),
(8, 5, 'Arjun Krishnan', 'The massager works wonders for stress relief too! Great product at great price.', 1, NOW() - INTERVAL '11 days');

-- Verify the reviews were inserted
SELECT COUNT(*) as total_reviews FROM reviews;
SELECT * FROM reviews ORDER BY rating DESC, created_at DESC;
