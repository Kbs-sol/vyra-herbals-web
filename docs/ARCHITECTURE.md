# API Architecture Overview

## 🏗️ New Clean API Structure

```
Frontend (React/Next.js)
         ↓
    /api/... (Next.js API Routes)
         ↓
    Supabase PostgreSQL Database
         ↓
    Your Data (Products, Orders, Reviews)
```

---

## 📂 Complete API Route Structure

```
app/api/
│
├── 📁 data/
│   └── route.ts                    ✅ Generic data fetch (replaces get.php)
│       • POST → Select from any table
│       • Used by: Products list, Reviews list, Testimonials
│
├── 📁 products/
│   ├── 📁 detail/
│   │   └── route.ts                ✅ Get single product (replaces product_detail.php)
│   │       • POST → Fetch by handle
│   │       • Returns: Product + Reviews + Cart status
│   │
│   ├── 📁 by-category/
│   │   └── route.ts                ✅ Filter by category (replaces category_products.php)
│   │       • POST → Get products in category
│   │       • Used by: Category pages
│   │
│   └── 📁 with-reviews/
│       └── route.ts                ✅ Products with reviews (replaces get_products_with_reviews.php)
│           • POST → Products joined with reviews
│           • Used by: Homepage, Best sellers
│
├── 📁 reviews/
│   └── 📁 create/
│       └── route.ts                ✅ Create review (replaces insert.php)
│           • POST → Insert new review
│           • Used by: Review submission form
│
├── 📁 orders/
│   └── 📁 info/
│       └── route.ts                ✅ Get order details (replaces order_info.php)
│           • GET → Fetch by order_id
│           • Used by: Order confirmation page
│
├── 📁 shipping/
│   └── 📁 track/
│       └── route.ts                ✅ Track shipment (replaces shipping.php)
│           • POST → Proxy to shipping provider
│           • Used by: Track order page
│
├── 📁 payment/
│   ├── 📁 access/
│   │   └── route.ts                ✅ Get payment key (replaces get_access.php)
│   │       • POST → Create transaction, return access key
│   │       • Used by: Checkout (online payment)
│   │
│   ├── 📁 session/
│   │   └── route.ts                ✅ Save order session (replaces order_session.php)
│   │       • POST → Store order before payment
│   │       • Used by: Checkout (online payment flow)
│   │
│   └── 📁 cod/
│       └── route.ts                ✅ COD order (replaces cod_order.php)
│           • POST → Create order, return order_id
│           • Used by: Checkout (cash on delivery)
│
└── 📁 uploads/
    └── 📁 [name]/
        └── route.ts                ✅ Image handler (unchanged)
            • GET → Redirect to Supabase Storage
            • Used by: All product images
```

---

## 🔄 Request Flow Example

### Example: Fetching Products

```
User visits Homepage
        ↓
Component: OurProducts.tsx
        ↓
fetch('/api/products/with-reviews')
        ↓
API Route: app/api/products/with-reviews/route.ts
        ↓
Supabase Query: SELECT * FROM products WITH reviews
        ↓
Response: JSON array of products
        ↓
Component renders products
```

### Example: Creating a Review

```
User submits review form
        ↓
Component: AddReview.tsx
        ↓
fetch('/api/reviews/create', { body: reviewData })
        ↓
API Route: app/api/reviews/create/route.ts
        ↓
Supabase Insert: INSERT INTO reviews VALUES (...)
        ↓
Response: { status: '1', data: insertedReview }
        ↓
Component shows success message
```

### Example: Placing COD Order

```
User clicks "Place Order"
        ↓
Component: Checkout.tsx
        ↓
fetch('/api/payment/cod', { body: orderData })
        ↓
API Route: app/api/payment/cod/route.ts
        ↓
Supabase Insert: INSERT INTO orders VALUES (...)
        ↓
Response: { order_id: 123 }
        ↓
Redirect to: /orders/123
```

---

## 🗃️ Database Schema Overview

```
┌─────────────┐
│   users     │
│  (id, ...)  │
└──────┬──────┘
       │
       ├──────────────┐
       │              │
┌──────▼──────┐  ┌────▼────┐
│    cart     │  │  orders │
│(user_id, ...)│  └─────────┘
└─────────────┘
       │
       │
┌──────▼──────┐
│  products   │◄─────┐
│  (id, ...)  │      │
└──────┬──────┘      │
       │             │
       ├─────────────┘
       │
┌──────▼──────┐
│   reviews   │
│(product_id,.)│
└─────────────┘
```

---

## 🔐 Security & RLS

```
Public Access:
✅ Products (read)
✅ Approved Reviews (read)
✅ Categories (read)
✅ Anyone can create reviews (pending approval)
✅ Anyone can create orders (for guest checkout)

Restricted:
🔒 Cart (user's own items only - when auth added)
🔒 User data (own profile only - when auth added)
🔒 Admin operations (service role key required)
```

---

## 📊 Data Flow Patterns

### Pattern 1: Generic Data Fetch
```javascript
POST /api/data
{
  "tbl_name": "products",           // Which table
  "extra_condition": "LIMIT 10",    // SQL-like filters
  "status": 1                       // Additional filters
}
```

### Pattern 2: Specific Resource
```javascript
POST /api/products/detail
{
  "product_handle": "hair-oil",     // Unique identifier
  "user_id": 123                    // Optional context
}
```

### Pattern 3: Write Operation
```javascript
POST /api/reviews/create
{
  "tbl_name": "reviews",            // Target table
  "data": {                         // Data to insert
    "product_id": 1,
    "rating": 5,
    "review_text": "Great!"
  }
}
```

---

## 🎯 Frontend → Backend Mapping

| Frontend Component | API Endpoint | Purpose |
|-------------------|--------------|---------|
| `OurProducts.tsx` | `/api/products/with-reviews` | Homepage products |
| `BestSeller.tsx` | `/api/products/with-reviews` | Featured products |
| `Category.tsx` | `/api/products/by-category` | Category page |
| `Singleproducts.tsx` | `/api/products/detail` | Product detail page |
| `SearchResult.tsx` | `/api/data` | Search results |
| `AddReview.tsx` | `/api/reviews/create` | Submit review |
| `Testimonial.tsx` | `/api/data` | Get testimonials |
| `AllTestimonials.tsx` | `/api/data` | All reviews page |
| `Orders.tsx` | `/api/orders/info` | Order details |
| `TrackOrder.tsx` | `/api/shipping/track` | Track shipment |
| `Checkout.tsx` | `/api/payment/cod` | COD checkout |
| `Checkout.tsx` | `/api/payment/access` | Online payment |

---

## 🚀 Performance Optimizations

1. **Database Indexes** - Created on frequently queried columns
2. **Error Handling** - Graceful fallbacks, no crashes
3. **Logging** - Debug logs for troubleshooting
4. **RLS Policies** - Database-level security
5. **Connection Pooling** - Supabase manages connections

---

## 📝 Environment Variables

```env
# Required for API Routes to work
SUPABASE_URL=...                    # Database URL
SUPABASE_SERVICE_ROLE_KEY=...       # Admin key
NEXT_PUBLIC_SUPABASE_URL=...        # Public URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=...   # Public key

# Optional
SHIPPING_PROXY_URL=...              # For tracking
EASEBUZZ_ACCESS_KEY=...             # For payments
```

---

## ✅ Quality Checklist

- [x] RESTful naming conventions
- [x] Consistent error handling
- [x] Input validation
- [x] Database connection pooling
- [x] Security (RLS ready)
- [x] Logging for debugging
- [x] TypeScript types
- [x] Clean code structure
- [x] Documentation
- [x] Ready for production

---

## 🎉 Result

**Before:** Confusing PHP-style endpoints mixed with Next.js  
**After:** Clean, professional REST API following Next.js best practices  

Your application is now:
- ✅ Modern
- ✅ Maintainable
- ✅ Scalable
- ✅ Production-ready

Just add your data to Supabase and you're live! 🚀
