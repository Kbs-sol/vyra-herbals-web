# 🚀 Quick Reference - New API Endpoints

## Your Application Status: ✅ READY

**Server:** http://localhost:3001  
**Environment:** Configured ✅  
**API Routes:** All created ✅  
**Frontend:** Updated ✅  

---

## 📋 API Endpoint Quick Reference

### Products
```bash
# Get all products
POST /api/data
Body: { "tbl_name": "products", "extra_condition": "ORDER BY id DESC" }

# Get product details
POST /api/products/detail
Body: { "product_handle": "hair-oil-100ml" }

# Get products by category
POST /api/products/by-category
Body: { "category": "hair-oil" }

# Get products with reviews
POST /api/products/with-reviews
Body: { "tbl_name": "products", "extra_condition": "LIMIT 8" }
```

### Reviews
```bash
# Create review
POST /api/reviews/create
Body: {
  "tbl_name": "reviews",
  "data": {
    "product_id": 1,
    "rating": 5,
    "reviewer_name": "John",
    "review_text": "Great!"
  }
}

# Get reviews
POST /api/data
Body: { "tbl_name": "reviews", "status": 1 }
```

### Orders
```bash
# Get order info
GET /api/orders/info?order_id=123

# Create COD order
POST /api/payment/cod
Body: {
  "orderData": {
    "orderItems": [...],
    "totalAmount": 500,
    "shippingData": {...},
    "paymentMethod": "cod"
  }
}
```

### Payment
```bash
# Get payment access
POST /api/payment/access
Body: {
  "amount": 500,
  "firstname": "John",
  "email": "john@example.com",
  "phone": "9876543210"
}

# Save order session
POST /api/payment/session
Body: { "txnId": "TXN123", "orderData": {...} }
```

### Shipping
```bash
# Track shipment
POST /api/shipping/track
Body: {
  "username": "ela13167",
  "key": "...",
  "shipment_id": "123456"
}
```

---

## 🗂️ Database Tables You Need to Create

Run `supabase_schema.sql` in Supabase to create:

1. **users** - Customer accounts
2. **products** - Product catalog
3. **categories** - Product categories
4. **reviews** - Customer reviews
5. **testimonials** - Featured testimonials
6. **cart** - Shopping cart items
7. **orders** - Order records
8. **order_sessions** - Payment flow temporary data
9. **transactions** - Payment records

---

## ⚡ To Get Started Right Now

### Step 1: Create Tables (2 minutes)
```sql
-- Open Supabase Dashboard → SQL Editor
-- Copy entire supabase_schema.sql file
-- Click "Run"
```

### Step 2: Add Sample Product (1 minute)
```sql
INSERT INTO products (handle, title, description, price, regular_price, category)
VALUES 
('test-product', 'Test Hair Oil', 'Sample product', 299, 399, 'hair-oil');
```

### Step 3: Test (1 minute)
```bash
# Open browser: http://localhost:3001
# You should see the homepage
```

### Step 4: Import Your Real Data
```sql
-- Export from your MySQL
-- Import to Supabase (CSV or SQL)
```

---

## 🐛 Troubleshooting

### API returns empty arrays?
→ Tables not created yet. Run `supabase_schema.sql`

### Images not loading?
→ Upload to Supabase Storage bucket named `images`

### Build errors?
→ Run `npm install` to ensure all dependencies installed

### 500 errors?
→ Check terminal logs for detailed error messages

---

## 📁 Important Files

- `SETUP_GUIDE.md` - Detailed setup steps
- `API_DOCUMENTATION.md` - Complete API docs
- `supabase_schema.sql` - Database schema (run this!)
- `CHANGES.md` - What changed in this refactor
- `.env.local` - Your environment variables

---

## ✅ What Works Now

- All API routes responding
- Clean URLs (no .php)
- Frontend calling correct endpoints
- Error handling and logging
- Supabase integration ready

## ⏳ What You Need to Do

1. Create Supabase tables
2. Import your data
3. Upload images

**That's it!** Once tables exist, everything works automatically.

---

## 🎯 Test Checklist

After creating tables:

- [ ] Homepage loads
- [ ] Products display
- [ ] Product details page works
- [ ] Reviews show up
- [ ] Cart functions
- [ ] Checkout works
- [ ] Orders can be placed

---

Made with ❤️ for Vyra Herbals
