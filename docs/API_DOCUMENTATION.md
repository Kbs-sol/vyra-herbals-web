# Vyra Herbals - API Documentation

## Clean API Structure

All API endpoints have been refactored to use clean, RESTful naming conventions without `.php` extensions.

### API Endpoints Overview

| Endpoint | Method | Purpose | Request Body |
|----------|--------|---------|--------------|
| `/api/data` | POST | Generic data fetching from any allowed table | `{ tbl_name, extra_condition, ...filters }` |
| `/api/products/detail` | POST | Get product details by handle with reviews | `{ product_handle, user_id? }` |
| `/api/products/by-category` | POST | Get products filtered by category | `{ category, extra_condition? }` |
| `/api/products/with-reviews` | POST | Get products with their reviews | `{ tbl_name, extra_condition?, ids? }` |
| `/api/reviews/create` | POST | Create a new review | `{ tbl_name: "reviews", data: {...} }` |
| `/api/orders/info` | GET | Get order details by ID | Query: `?order_id=123` |
| `/api/shipping/track` | POST | Track shipment (proxies to provider) | `{ shipment_id, username, key }` |
| `/api/payment/access` | POST | Get payment gateway access key | `{ amount, firstname, email, phone, productinfo }` |
| `/api/payment/session` | POST | Save order session for payment | `{ txnId, orderData }` |
| `/api/payment/cod` | POST | Create COD order | `{ orderData }` |
| `/api/uploads/[name]` | GET | Redirect to uploaded images | Path param: filename |

---

## Supabase Database Setup

### Environment Variables Required

Add these to your `.env.local` file:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_PUBLIC_URL=your_supabase_project_url
SUPABASE_STORAGE_BUCKET=images

# Optional Integrations
SHIPPING_PROXY_URL=your_shipping_provider_api_url
EASEBUZZ_ACCESS_KEY=your_easebuzz_key
```

### Database Schema

Run these SQL statements in your Supabase SQL Editor:

\`\`\`sql
-- Users table
CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  email TEXT UNIQUE,
  name TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Products table
CREATE TABLE IF NOT EXISTS products (
  id BIGSERIAL PRIMARY KEY,
  handle TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL,
  regular_price NUMERIC,
  image_url TEXT,
  category TEXT,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id BIGSERIAL PRIMARY KEY,
  product_id BIGINT REFERENCES products(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  reviewer_name TEXT NOT NULL,
  review_text TEXT NOT NULL,
  status INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster review queries
CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews(status);

-- Testimonials table (optional, if separate from reviews)
CREATE TABLE IF NOT EXISTS testimonials (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  image_url TEXT,
  rating INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cart table
CREATE TABLE IF NOT EXISTS cart (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  product_id BIGINT REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER DEFAULT 1 CHECK (quantity > 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
  id BIGSERIAL PRIMARY KEY,
  items JSONB NOT NULL,
  total_amount NUMERIC NOT NULL,
  transaction_price NUMERIC DEFAULT 0,
  shipping_data JSONB NOT NULL,
  payment_method TEXT NOT NULL,
  status TEXT DEFAULT 'placed',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Order sessions (temporary storage for payment flow)
CREATE TABLE IF NOT EXISTS order_sessions (
  id BIGSERIAL PRIMARY KEY,
  txn_id TEXT,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transactions table (payment records)
CREATE TABLE IF NOT EXISTS transactions (
  id BIGSERIAL PRIMARY KEY,
  amount NUMERIC NOT NULL,
  firstname TEXT,
  email TEXT,
  phone TEXT,
  productinfo TEXT,
  status TEXT DEFAULT 'created',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Categories table (optional, for structured category management)
CREATE TABLE IF NOT EXISTS categories (
  id BIGSERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
\`\`\`

### Indexes for Performance

\`\`\`sql
-- Product indexes
CREATE INDEX IF NOT EXISTS idx_products_handle ON products(handle);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);

-- Order indexes
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);

-- Cart indexes
CREATE INDEX IF NOT EXISTS idx_cart_user_id ON cart(user_id);
CREATE INDEX IF NOT EXISTS idx_cart_product_id ON cart(product_id);
\`\`\`

### Row Level Security (RLS) Policies

After creating tables, enable RLS and add policies:

\`\`\`sql
-- Enable RLS on all tables
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Products: Public read access
CREATE POLICY "Public products read" ON products FOR SELECT USING (true);

-- Reviews: Public can read approved reviews, authenticated users can insert
CREATE POLICY "Public approved reviews read" ON reviews FOR SELECT USING (status = 1);
CREATE POLICY "Anyone can insert reviews" ON reviews FOR INSERT WITH CHECK (true);

-- Cart: Users can only access their own cart
CREATE POLICY "Users manage own cart" ON cart FOR ALL USING (auth.uid()::text = user_id::text);

-- Orders: Users can read their own orders
CREATE POLICY "Users read own orders" ON orders FOR SELECT USING (
  (shipping_data->>'email')::text = (SELECT email FROM users WHERE id::text = auth.uid()::text)
);
\`\`\`

---

## Migrating Data from MySQL

### Export from MySQL

\`\`\`bash
# Export each table
mysqldump -u username -p vyraherbals products > products.sql
mysqldump -u username -p vyraherbals reviews > reviews.sql
mysqldump -u username -p vyraherbals orders > orders.sql
# ... repeat for other tables
\`\`\`

### Import to Supabase

1. Convert MySQL dumps to PostgreSQL format (adjust data types if needed)
2. Use Supabase SQL Editor to run INSERT statements
3. Or use a migration tool like `pgloader`:

\`\`\`bash
pgloader mysql://user:pass@localhost/vyraherbals postgresql://postgres:pass@db.your-project.supabase.co:5432/postgres
\`\`\`

---

## Storage Setup (Images)

### Create Storage Bucket in Supabase

1. Go to Supabase Dashboard → Storage
2. Create a new bucket named `images`
3. Set it to **Public** (or use signed URLs for private access)
4. Upload product images to the bucket

### Image URL Format

Images are accessed via: `/api/uploads/[filename]` which redirects to:
- Supabase Storage: `https://[project].supabase.co/storage/v1/object/public/images/[filename]`
- Or falls back to local `/assets/images/[filename]`

---

## Testing the Application

1. **Install dependencies:**
   \`\`\`bash
   npm install
   \`\`\`

2. **Set up environment variables** (see above)

3. **Create Supabase tables** (run the SQL schema)

4. **Start dev server:**
   \`\`\`bash
   npm run dev
   \`\`\`

5. **Open browser:**
   - Local: http://localhost:3000
   - Test API: http://localhost:3000/api/data (POST with `{"tbl_name": "products"}`)

---

## API Usage Examples

### Fetch All Products

\`\`\`javascript
const response = await fetch('/api/data', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    tbl_name: 'products',
    extra_condition: 'ORDER BY id DESC LIMIT 10'
  })
});
const products = await response.json();
\`\`\`

### Get Product Details

\`\`\`javascript
const response = await fetch('/api/products/detail', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    product_handle: 'hair-oil-100ml',
    user_id: 123 // optional, for cart check
  })
});
const product = await response.json();
\`\`\`

### Create Review

\`\`\`javascript
const response = await fetch('/api/reviews/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    tbl_name: 'reviews',
    data: {
      product_id: 1,
      rating: 5,
      reviewer_name: 'John Doe',
      review_text: 'Excellent product!'
    }
  })
});
const result = await response.json();
\`\`\`

### Place COD Order

\`\`\`javascript
const response = await fetch('/api/payment/cod', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    orderData: {
      orderItems: [{id: 1, quantity: 2, price: 299, title: 'Hair Oil'}],
      totalAmount: 598,
      transactionPrice: 0,
      shippingData: {
        fullName: 'Jane Doe',
        phone: '9876543210',
        address: '123 Street',
        pincode: '123456',
        city: 'Mumbai',
        state: 'Maharashtra'
      },
      paymentMethod: 'cod'
    }
  })
});
const result = await response.json();
console.log('Order ID:', result.order_id);
\`\`\`

---

## Next Steps

1. ✅ Create Supabase project and run SQL schema
2. ✅ Add environment variables to `.env.local`
3. ✅ Import your existing MySQL data to Supabase
4. ✅ Upload product images to Supabase Storage
5. ✅ Test all API endpoints
6. ✅ Configure payment gateway (Easebuzz) credentials
7. ✅ Set up shipping provider integration
8. ✅ Deploy to Vercel/production

---

## Troubleshooting

### API returns empty arrays
- Check Supabase credentials in `.env.local`
- Verify tables exist in Supabase
- Check browser console for CORS errors
- Review server logs: `npm run dev`

### Images not loading
- Ensure `SUPABASE_STORAGE_BUCKET` is set correctly
- Verify bucket is public in Supabase Dashboard
- Check image filenames match exactly

### Payment integration not working
- Set `EASEBUZZ_ACCESS_KEY` in environment
- Replace placeholder logic in `/api/payment/access`
- Test with Easebuzz sandbox credentials first

---

## Support

For issues or questions:
- Check server logs: terminal running `npm run dev`
- Review Supabase logs: Dashboard → Logs
- Verify environment variables are loaded
