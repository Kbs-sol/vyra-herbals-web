# 🧪 Production Testing Script
## Automated Testing Guide for Vyra Herbals

This document provides step-by-step instructions for manually testing all critical features before deployment.

---

## 🔧 SETUP

1. Ensure you've run `DATABASE_FIX_PRODUCTION.sql` in Supabase
2. Start the development server: `npm run dev`
3. Open browser to: http://localhost:3000

---

## ✅ TEST SUITE

### 1. HOMEPAGE TESTS (`/`)

**Test 1.1: Page Load**
- [ ] Page loads without errors
- [ ] No console errors in browser DevTools
- [ ] All sections visible (Hero, Products, Features, Testimonials)

**Test 1.2: Product Grid**
- [ ] Products display with images
- [ ] Product titles and prices visible
- [ ] "Add to Cart" buttons functional
- [ ] Category filter works (if implemented)

**Test 1.3: Navigation**
- [ ] Header navigation links work
- [ ] Footer links work
- [ ] Logo click returns to homepage
- [ ] Mobile menu works (if responsive)

**Expected Results:**
✅ Homepage loads in < 3 seconds
✅ All products display with correct images
✅ No 404 errors for images or assets

---

### 2. PRODUCT DETAIL TESTS (`/product/[handle]`)

**Test 2.1: Product Page Load**
1. Click any product from homepage
2. Verify:
   - [ ] Product title displays
   - [ ] Main image loads
   - [ ] Price and description visible
   - [ ] "Add to Cart" button works

**Test 2.2: Product Gallery**
- [ ] Multiple images display (if available)
- [ ] Image thumbnails clickable
- [ ] Image zoom works (if implemented)

**Test 2.3: Reviews Section**
- [ ] Customer reviews display
- [ ] Star ratings visible
- [ ] "Write a Review" form accessible

**Test 2.4: Add to Cart**
1. Click "Add to Cart"
2. Verify:
   - [ ] Success message displays
   - [ ] Cart count updates in header
   - [ ] Can add multiple quantities

**URLs to Test:**
- http://localhost:3000/product/hair-oil-200ml
- http://localhost:3000/product/herbal-shampoo-200ml
- http://localhost:3000/product/neem-full-comb

**Expected Results:**
✅ Product details match database
✅ Images load correctly
✅ Cart functionality works

---

### 3. CART TESTS (`/cart`)

**Test 3.1: View Cart**
1. Add items to cart
2. Navigate to `/cart`
3. Verify:
   - [ ] All cart items display
   - [ ] Product images visible
   - [ ] Quantities correct
   - [ ] Total price calculated correctly

**Test 3.2: Cart Operations**
- [ ] Update quantity (increase/decrease)
- [ ] Remove items from cart
- [ ] "Continue Shopping" returns to homepage
- [ ] Empty cart shows appropriate message

**Test 3.3: Price Calculation**
1. Add multiple items
2. Verify:
   - [ ] Subtotal correct
   - [ ] COD charges added (if applicable)
   - [ ] Total amount accurate

**Test 3.4: Proceed to Checkout**
- [ ] "Proceed to Checkout" button works
- [ ] Redirects to checkout page

**Expected Results:**
✅ Cart persists across page refreshes
✅ Price calculations are accurate
✅ Cart operations work smoothly

---

### 4. CHECKOUT TESTS

**Test 4.1: Checkout Form**
1. Proceed to checkout
2. Fill form with test data:
   ```
   Name: Test Customer
   Email: test@example.com
   Phone: 9876543210
   Address: 123 Test Street
   City: Mumbai
   State: Maharashtra
   Pincode: 400001
   ```
3. Verify:
   - [ ] All fields validate correctly
   - [ ] Required fields marked
   - [ ] Email format validated
   - [ ] Phone number validation works

**Test 4.2: COD Order Placement**
1. Select "Cash on Delivery"
2. Click "Place Order"
3. Verify:
   - [ ] Order confirmation displays
   - [ ] Order ID shown
   - [ ] "Track Order" link works
   - [ ] Cart clears after order

**Test 4.3: Order Storage**
1. Note the Order ID
2. Check Supabase:
   ```sql
   SELECT * FROM orders ORDER BY created_at DESC LIMIT 1;
   ```
3. Verify:
   - [ ] Order saved in database
   - [ ] All details correct
   - [ ] items JSONB contains products
   - [ ] shipping_data JSONB contains address

**Expected Results:**
✅ Form validation works correctly
✅ COD orders process successfully
✅ Order data saves to database
✅ User receives order confirmation

---

### 5. ORDER TRACKING TESTS (`/track-order`)

**Test 5.1: Track Order Page**
1. Navigate to `/track-order`
2. Enter test Order ID
3. Verify:
   - [ ] Form accepts order ID
   - [ ] Search button works
   - [ ] Invalid ID shows error message

**Test 5.2: Order Details Display**
1. Enter valid Order ID
2. Verify:
   - [ ] Order details display
   - [ ] Items list correct
   - [ ] Shipping address visible
   - [ ] Order status shown
   - [ ] Total amount correct

**Test 5.3: Order Status**
- [ ] Status badge displays correctly
- [ ] Tracking ID shown (if available)
- [ ] Order date/time visible

**Test URLs:**
- http://localhost:3000/track-order
- http://localhost:3000/orders/[order_id]

**Expected Results:**
✅ Can retrieve order by ID
✅ All order details accurate
✅ Status tracking works

---

### 6. CATEGORY PAGES (`/category/[name]`)

**Test 6.1: Category Pages**
1. Visit category pages:
   - http://localhost:3000/category/hair-oil
   - http://localhost:3000/category/combs
   - http://localhost:3000/category/shampoo

2. Verify:
   - [ ] Category title displays
   - [ ] Products filtered correctly
   - [ ] Images load
   - [ ] Product links work

**Test 6.2: Empty Categories**
- [ ] Categories with no products show message
- [ ] "Browse All Products" link works

**Expected Results:**
✅ Products filter by category
✅ Category pages load quickly
✅ Navigation works correctly

---

### 7. SEARCH TESTS (`/search`)

**Test 7.1: Search Functionality**
1. Use search bar (if implemented)
2. Search for "hair oil"
3. Verify:
   - [ ] Results display
   - [ ] Relevant products shown
   - [ ] Search highlights terms

**Test 7.2: No Results**
1. Search for nonsense term
2. Verify:
   - [ ] "No results" message displays
   - [ ] Suggestions shown (if implemented)

---

### 8. STATIC PAGES

**Test 8.1: About Page** (`/about`)
- [ ] Page loads
- [ ] Content displays
- [ ] Images load

**Test 8.2: Contact Page** (`/contact`)
- [ ] Page loads
- [ ] Contact form visible
- [ ] Form submission works (if implemented)

**Test 8.3: FAQs** (`/faqs`)
- [ ] Page loads
- [ ] FAQs display
- [ ] Accordion/expand works (if implemented)

**Test 8.4: Legal Pages**
- [ ] Privacy Policy (`/privacy-policy`)
- [ ] Terms & Conditions (`/terms-conditions`)

**Expected Results:**
✅ All pages accessible
✅ Content readable
✅ No broken links

---

### 9. ADMIN PANEL TESTS (`/admin`)

**Test 9.1: Admin Login** (`/admin/login`)
1. Navigate to `/admin/login`
2. Try invalid credentials:
   - [ ] Error message displays
   - [ ] Login rejected
3. Enter valid credentials:
   ```
   Email: admin@vyraherbals.com
   Password: VyraAdminPass@2026
   ```
4. Verify:
   - [ ] Login successful
   - [ ] Redirects to dashboard
   - [ ] Session persists

**Test 9.2: Admin Dashboard** (`/admin`)
- [ ] Statistics display correctly
- [ ] Order counts accurate
- [ ] Product counts correct
- [ ] Revenue calculated (if applicable)
- [ ] Recent orders list shows

**Test 9.3: Products Management** (`/admin/products`)
1. View products list:
   - [ ] All products display
   - [ ] Pagination works
   - [ ] Search/filter works
   
2. Create new product:
   - [ ] Form validation works
   - [ ] Image upload works
   - [ ] Product saves successfully
   
3. Edit product:
   - [ ] Can modify details
   - [ ] Changes save correctly
   
4. Delete product:
   - [ ] Confirmation prompt shows
   - [ ] Deletion works

**Test 9.4: Orders Management** (`/admin/orders`)
1. View orders:
   - [ ] Orders list displays
   - [ ] Status filters work
   - [ ] Date sorting works
   
2. Update order:
   - [ ] Can change status
   - [ ] Can add tracking ID
   - [ ] Changes save
   
3. View order details:
   - [ ] Full order info displays
   - [ ] Customer details visible
   - [ ] Items list correct

**Test 9.5: Reviews Management** (`/admin/reviews`)
- [ ] Pending reviews display
- [ ] Can approve reviews
- [ ] Can reject reviews
- [ ] Status updates work

**Test 9.6: Categories Management** (`/admin/categories`)
- [ ] Categories list displays
- [ ] Can add category
- [ ] Can edit category
- [ ] Can delete category

**Test 9.7: Blogs Management** (`/admin/blogs`)
- [ ] Blogs list displays
- [ ] Can create new blog with title, excerpt, content
- [ ] Can upload blog image (stored in `blogs` bucket)
- [ ] Can edit blog and change status (draft/published)
- [ ] Published blog visible on public `/blogs` page
- [ ] Blog detail page loads at `/blogs/:slug`

**Test 9.7: Admin Logout**
- [ ] Logout button works
- [ ] Session cleared
- [ ] Redirects to login
- [ ] Cannot access admin pages after logout

**Expected Results:**
✅ Admin authentication works
✅ All CRUD operations functional
✅ Data updates reflect immediately
✅ No unauthorized access possible

---

### 10. API ENDPOINT TESTS

Use Postman or browser DevTools to test:

**Test 10.1: Products API**
```bash
POST http://localhost:3000/api/products/with-reviews
Body: { "filters": { "category": "hair-oil" } }
```
Expected: 200 response with products array

**Test 10.2: Product Detail API**
```bash
POST http://localhost:3000/api/products/detail
Body: { "handle": "hair-oil-200ml" }
```
Expected: 200 response with product details

**Test 10.3: COD Order API**
```bash
POST http://localhost:3000/api/payment/cod
Body: {
  "orderData": {
    "orderItems": [{"id": 1, "quantity": 1, "price": 299, "title": "Test"}],
    "totalAmount": 349,
    "transactionPrice": 0,
    "shippingData": {
      "name": "Test",
      "email": "test@test.com",
      "phone": "9876543210",
      "address": "Test Address"
    }
  }
}
```
Expected: 200 response with order_id

**Test 10.4: Order Info API**
```bash
POST http://localhost:3000/api/orders/info
Body: { "id": "ORDER_ID_HERE" }
```
Expected: 200 response with order details

**Expected Results:**
✅ All API endpoints return expected responses
✅ Error handling works correctly
✅ Database operations succeed

---

### 11. RESPONSIVE DESIGN TESTS

**Test 11.1: Mobile View** (375px width)
- [ ] Navigation menu (hamburger)
- [ ] Product grid (1 column)
- [ ] Cart page layout
- [ ] Forms are usable
- [ ] Images scale correctly

**Test 11.2: Tablet View** (768px width)
- [ ] Product grid (2 columns)
- [ ] Navigation adapts
- [ ] All pages readable

**Test 11.3: Desktop View** (1920px width)
- [ ] Product grid (3-4 columns)
- [ ] Full navigation
- [ ] Optimal spacing

**Tools to Use:**
- Chrome DevTools (F12 → Device Toolbar)
- Firefox Responsive Design Mode
- Actual mobile devices

**Expected Results:**
✅ Site fully functional on all screen sizes
✅ Touch targets are 44px minimum
✅ Text readable without zoom
✅ No horizontal scroll

---

### 12. PERFORMANCE TESTS

**Test 12.1: Page Load Speed**
Use Chrome DevTools → Network tab:
- [ ] Homepage < 3 seconds
- [ ] Product page < 2 seconds
- [ ] Cart page < 1 second
- [ ] Admin pages < 2 seconds

**Test 12.2: Lighthouse Audit**
Run Chrome Lighthouse:
- [ ] Performance > 70
- [ ] Accessibility > 90
- [ ] Best Practices > 90
- [ ] SEO > 90

**Test 12.3: Image Optimization**
- [ ] Images use WebP/AVIF
- [ ] Lazy loading works
- [ ] Correct sizes loaded

**Expected Results:**
✅ Good Lighthouse scores
✅ Fast page loads
✅ Optimized assets

---

### 13. DATABASE INTEGRITY TESTS

**Test 13.1: Verify Schema**
```sql
-- Check transactions table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'transactions'
ORDER BY ordinal_position;
```
Expected columns: id, amount, firstname, email, phone, productinfo, status, txn_id, created_at

**Test 13.2: Check Data**
```sql
-- Recent orders
SELECT id, payment_method, status, total_amount, created_at 
FROM orders 
ORDER BY created_at DESC 
LIMIT 5;

-- Products count
SELECT COUNT(*) FROM products;

-- Categories count
SELECT COUNT(*) FROM categories;
```

**Expected Results:**
✅ All tables have correct columns
✅ Data integrity maintained
✅ No orphaned records

---

### 14. SECURITY TESTS

**Test 14.1: Admin Access**
1. Logout from admin
2. Try accessing `/admin`
   - [ ] Redirects to login
3. Try accessing `/admin/products` directly
   - [ ] Blocked without authentication

**Test 14.2: SQL Injection**
Try entering SQL in forms:
```
' OR '1'='1
<script>alert('xss')</script>
```
- [ ] No SQL injection possible
- [ ] XSS prevented by React

**Test 14.3: Environment Variables**
- [ ] Check `.env` not in git
- [ ] Secrets not exposed in client

**Expected Results:**
✅ Admin routes protected
✅ No security vulnerabilities
✅ Environment variables secure

---

### 15. ERROR HANDLING TESTS

**Test 15.1: 404 Pages**
- Visit http://localhost:3000/non-existent-page
- [ ] 404 page displays
- [ ] "Back to Home" link works

**Test 15.2: Invalid Product**
- Visit http://localhost:3000/product/invalid-handle
- [ ] Error message or 404
- [ ] No crash

**Test 15.3: Network Errors**
1. Disconnect internet
2. Try loading page
   - [ ] Graceful error message
   - [ ] No white screen

**Test 15.4: Invalid Order ID**
- Track non-existent order
- [ ] "Order not found" message
- [ ] No crash

**Expected Results:**
✅ All errors handled gracefully
✅ User-friendly error messages
✅ No application crashes

---

## 📊 TEST RESULTS TEMPLATE

Copy and fill this out after testing:

```markdown
# Test Results - [Date]

## Summary
- Tests Passed: __/100
- Tests Failed: __/100
- Blocker Issues: __
- Critical Issues: __
- Minor Issues: __

## Failed Tests
1. [Test Name]: [Description of failure]
2. [Test Name]: [Description of failure]

## Issues Found
### Blocker (Must fix before deployment)
- [ ] Issue 1
- [ ] Issue 2

### Critical (Should fix before deployment)
- [ ] Issue 1
- [ ] Issue 2

### Minor (Can fix after deployment)
- [ ] Issue 1
- [ ] Issue 2

## Overall Status
[ ] READY FOR DEPLOYMENT
[ ] NEEDS FIXES BEFORE DEPLOYMENT

## Tester: [Your Name]
## Date: [Test Date]
```

---

## 🚨 CRITICAL TEST REQUIREMENTS

Before marking as "Ready for Deployment", ensure:
- [ ] All homepage tests pass
- [ ] Product detail pages work
- [ ] Cart and checkout functional
- [ ] Order placement works (COD)
- [ ] Order tracking works
- [ ] Admin login works
- [ ] Admin can manage orders
- [ ] No console errors on any page
- [ ] Mobile responsive works
- [ ] Database schema is correct

---

## 📞 WHAT TO DO IF TESTS FAIL

1. **Document the Issue:**
   - What were you testing?
   - What did you expect?
   - What actually happened?
   - Steps to reproduce

2. **Check Console Errors:**
   - Browser console (F12)
   - Terminal logs
   - Supabase logs

3. **Verify Database:**
   - Run DATABASE_FIX_PRODUCTION.sql
   - Check table structures
   - Verify data exists

4. **Check Environment Variables:**
   - All variables set correctly
   - No typos in URLs
   - Keys are valid

5. **Review Recent Changes:**
   - What was changed recently?
   - Can you rollback?

---

## ✅ FINAL SIGN-OFF

After all tests pass:

```
✅ All critical tests passed
✅ No blocker issues
✅ Performance acceptable
✅ Security verified
✅ Mobile responsive
✅ Database integrity confirmed

SIGNED OFF BY: _______________
DATE: _______________
TIME: _______________

APPROVED FOR PRODUCTION DEPLOYMENT
```

---

Good luck with testing! 🧪✅
