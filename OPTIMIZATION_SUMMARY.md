# Vyra Herbals - Database & Performance Optimization

## Overview
This document outlines all optimizations made to reduce database costs and improve website performance.

---

## 1. Product IDs Reference

### Single Products (IDs 1-10)
| ID | Product | Handle |
|----|---------|--------|
| 1 | 100ml Oil Bottle | `hair-oil-100ml` |
| 2 | 200ml Oil Bottle | `hair-oil-200ml` |
| 3 | 500ml Oil Bottle | `hair-oil-500ml` |
| 4 | Shampoo 200ml | `herbal-shampoo-200ml` |
| 5 | Shampoo 500ml | `herbal-shampoo-500ml` |
| 6 | Neem Half Comb | `neem-half-comb` |
| 7 | Neem Full Comb | `neem-full-comb` |
| 8 | Scalp Massager | `scalp-massager` |
| 9 | Herbal Hair Mask Powder | `herbal-hair-mask-powder` |
| 10 | Rosemary Leaves | `rosemary-leaves` |

### Same Product Combos (IDs 11-14)
| ID | Product | Contents |
|----|---------|----------|
| 11 | 100ml Oil Combo | 3 x 100ml bottles |
| 12 | 200ml Oil Combo | 2 x 200ml bottles |
| 13 | Shampoo Combo | 2 x 200ml bottles |
| 14 | Neem Combs Combo | 2 combs (half + full) |

### Oil + Shampoo Combos (IDs 15-21)
| ID | Product | Contents |
|----|---------|----------|
| 15 | Oil + Shampoo Combo | 100ml oil + 200ml shampoo |
| 16 | Oil + Shampoo Combo | 200ml oil + 200ml shampoo |
| 17 | Oil + Shampoo Combo | 500ml oil + 200ml shampoo |
| 18 | Oil + Shampoo Combo | 100ml oil + 500ml shampoo |
| 19 | Oil + Shampoo Combo | 200ml oil + 500ml shampoo |
| 20 | Oil + Shampoo Combo | 500ml oil + 500ml shampoo |
| 21 | Shampoo + Massager | 200ml shampoo + scalp massager |

### Kits (IDs 22-28)
| ID | Kit Name | Contents |
|----|----------|----------|
| 22 | Vyra Mini Hair Care Kit | 100ml oil + shampoo + 2 combs |
| 23 | Vyra Complete Hair Care Kit | 200ml oil + shampoo + 2 combs |
| 24 | Vyra Mini Scalp Care Kit | 100ml oil + shampoo + 2 combs + massager |
| 25 | Vyra Complete Scalp Care Kit | 200ml oil + shampoo + 2 combs + massager |
| 26 | Vyra Hair Growth Kit | 100ml oil + shampoo + mask + rosemary |
| 27 | Vyra Intensive Hair Growth Kit | 200ml oil + shampoo + mask + rosemary |
| 28 | Vyra All-in-One Kit | 100ml oil + shampoo + mask + rosemary + 2 combs + massager |

---

## 2. API Optimizations

### Before vs After - Data Transfer Reduction

| Endpoint | Before | After | Savings |
|----------|--------|-------|---------|
| `/api/products/with-reviews` | SELECT * (all columns) | Only 7 product fields + 5 review fields | ~60% reduction |
| `/api/products/by-category` | SELECT * | Only 8 fields | ~50% reduction |
| `/api/products/cart` | SELECT * | Only 6 fields | ~60% reduction |
| `/api/products/detail` | SELECT * + all reviews | 10 fields + limited 50 reviews | ~40% reduction |
| `/api/data` | SELECT * always | Default optimized fields per table | ~50% reduction |
| `/api/orders/info` | SELECT * | Only 9 order fields | ~30% reduction |
| `/api/login` | SELECT * | Only 8 user fields | ~30% reduction |

### Optimized Field Selections

```javascript
// Product Card (listing pages)
'id, handle, title, price, regular_price, image_url, category'

// Product Detail Page
'id, handle, title, description, price, regular_price, image_url, category, view_count, created_at'

// Cart Items
'id, handle, title, price, regular_price, image_url'

// Reviews Summary (for cards)
'id, product_id, rating, reviewer_name, status'

// Full Reviews (for detail page)
'id, product_id, rating, reviewer_name, review_text, status, date, created_at'

// Orders
'id, items, total_amount, transaction_price, shipping_data, payment_method, status, tracking_id, created_at'

// Users
'id, email, name, phone, role, image'
```

---

## 3. Query Optimizations

### Pagination Added
- Product detail reviews: Limited to 50 most recent
- Testimonials: Limited to 9 top-rated

### Conditional Fetching
- Related products: Only fetched after main product loads
- Cart check: Uses COUNT instead of full row fetch
- Reviews: Only fetched if `include_reviews: true`

### Smart Field Selection
All APIs now support custom `fields` parameter:
```javascript
// Example: Fetch only specific fields
fetch('/api/data', {
  method: 'POST',
  body: JSON.stringify({
    tbl_name: 'products',
    fields: 'id, title, price', // Custom fields
  })
});
```

---

## 4. Database Indexes (in PRODUCTS_SETUP.sql)

```sql
CREATE INDEX idx_products_id ON products(id);
CREATE INDEX idx_products_handle ON products(handle);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_price ON products(price);

CREATE INDEX idx_reviews_product_id ON reviews(product_id);
CREATE INDEX idx_reviews_status ON reviews(status);
CREATE INDEX idx_reviews_created_at ON reviews(created_at DESC);

CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);

CREATE INDEX idx_cart_user_id ON cart(user_id);
CREATE INDEX idx_cart_product_id ON cart(product_id);
```

---

## 5. Frontend Optimizations

### Home Page Components
- **BestSeller**: Fetches only IDs [2, 4, 23, 16] - top selling products
- **OurProducts**: Fetches only IDs [1-8] - main single products

### Search Page
- Fetches only required fields for product cards
- Client-side filtering maintained for flexibility

### Product Detail Page
- Related products fetched only AFTER main product loads
- Reviews limited to 50 most recent
- Pagination for reviews on frontend

### Cart Page
- Only cart-specific fields fetched (no descriptions)

---

## 6. Setup Instructions

### Step 1: Run Product Setup SQL
Execute `PRODUCTS_SETUP.sql` in your Supabase SQL Editor:
- Creates all 28 products with correct IDs
- Sets up categories
- Adds performance indexes

### Step 2: Verify Products
```sql
SELECT id, handle, title, price, category FROM products ORDER BY id;
```

### Step 3: Test API Endpoints
```bash
# Test optimized endpoints
curl -X POST /api/products/with-reviews -d '{"ids": [1,2,3]}'
curl -X POST /api/products/by-category -d '{"category": "hair-oil"}'
```

---

## 7. Expected Cost Savings

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Avg bytes per product query | ~2KB | ~800B | 60% less |
| Avg bytes per review query | ~500B | ~200B | 60% less |
| Home page total data | ~50KB | ~20KB | 60% less |
| Product detail data | ~15KB | ~8KB | 47% less |
| **Total Supabase bandwidth** | Baseline | **~50-60% reduction** | Significant savings |

---

## 8. Files Modified

### API Routes
- `app/api/data/route.ts` - Default optimized fields
- `app/api/products/with-reviews/route.ts` - Specific ID filtering + minimal fields
- `app/api/products/by-category/route.ts` - Optimized category queries
- `app/api/products/cart/route.ts` - Cart-specific fields only
- `app/api/products/detail/route.ts` - Detail fields + paginated reviews
- `app/api/orders/info/route.ts` - Order-specific fields
- `app/api/login/route.ts` - User-specific fields

### Frontend Components
- `src/Components/Home/BestSeller.tsx` - Updated product IDs
- `src/Components/Home/OurProducts.tsx` - Updated product IDs + optimized fetch
- `src/Components/Reviews/Testimonial.tsx` - Optimized review fields
- `src/PageComponents/SearchResult.tsx` - Optimized product fields
- `src/PageComponents/Singleproducts.tsx` - Conditional related products fetch

### New Files
- `PRODUCTS_SETUP.sql` - Complete product database setup with 28 products
- `OPTIMIZATION_SUMMARY.md` - This documentation file
