# 🚀 PRODUCTION DEPLOYMENT CHECKLIST
## Vyra Herbals - Complete Pre-Deployment Guide

---

## ⚠️ CRITICAL ISSUE FIXED
**Error:** "Could not find the 'email' column of 'transactions' in the schema cache"
**Solution:** Run `DATABASE_FIX_PRODUCTION.sql` in your Supabase SQL Editor

---

## 📋 PRE-DEPLOYMENT STEPS

### 1. DATABASE SCHEMA FIX (MUST DO FIRST!)
```bash
✅ Go to Supabase Dashboard → SQL Editor
✅ Copy contents of DATABASE_FIX_PRODUCTION.sql
✅ Paste and run the entire script
✅ Verify no errors in execution
```

**What this does:**
- Adds missing `email`, `firstname`, `phone`, `productinfo` columns to `transactions` table
- Ensures all other tables have required columns
- Creates missing indexes for performance
- Sets up proper RLS policies
- Creates `order_sessions` and `testimonials` tables if missing

### 2. ENVIRONMENT VARIABLES VERIFICATION

#### Required Environment Variables:
```env
# Supabase (Already configured ✅)
NEXT_PUBLIC_SUPABASE_URL=https://obbohecegyagnqufelpx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_URL=https://obbohecegyagnqufelpx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
SUPABASE_PUBLIC_URL=https://obbohecegyagnqufelpx.supabase.co
NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET=products

# Admin Credentials (Already configured ✅)
ADMIN_EMAIL=admin@vyraherbals.com
ADMIN_PASSWORD=VyraAdminPass@2026
JWT_SECRET=04d0423b2f4cbed34585bb7398c8a45b...

# Optional - Payment Gateway
# EASEBUZZ_ACCESS_KEY=your_easebuzz_key_here
# SHIPPING_PROXY_URL=your_shipping_api_url
```

**For Vercel Deployment:**
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add all the above variables
3. Make sure they're set for "Production" environment

### 3. VERIFY SUPABASE STORAGE

```bash
✅ Go to Supabase Dashboard → Storage
✅ Ensure bucket named "products" exists
✅ Make bucket public (for product images)
✅ Upload product images if not already done
```

**To make bucket public:**
1. Storage → products → Settings
2. Set "Public bucket" to ON
3. Add policy: Allow public access to SELECT

### 4. CHECK PRODUCT IMAGES

Verify these images exist in your storage:
- hair-oil-100ml.png
- hair-oil-200ml.png
- hair-oil-500ml.png
- herbal-shampoo-200ml.png
- herbal-shampoo-500ml.png
- neem-half-comb.png
- neem-full-comb.png
- scalp-massager.png

### 5. DATABASE DATA VERIFICATION

Run these queries in Supabase SQL Editor:

```sql
-- Check if products exist
SELECT COUNT(*) as product_count FROM products;

-- Check if categories exist
SELECT COUNT(*) as category_count FROM categories;

-- Check transactions table structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'transactions';

-- Check orders table structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'orders';
```

**Expected results:**
- Products: Should have at least 1 product
- Categories: Should have at least 1 category
- Transactions: Should have columns: id, amount, firstname, email, phone, productinfo, status, txn_id, created_at
- Orders: Should have columns: id, items, total_amount, transaction_price, shipping_data, payment_method, status, tracking_id, created_at

---

## 🔍 TESTING CHECKLIST

### Test User Flow:
1. **Homepage** (`/`)
   - [ ] Loads without errors
   - [ ] Products display correctly
   - [ ] Images load properly
   - [ ] Navigation works

2. **Product Pages** (`/product/[handle]`)
   - [ ] Product details load
   - [ ] Images display
   - [ ] Add to cart works
   - [ ] Reviews display

3. **Cart** (`/cart`)
   - [ ] Cart items display
   - [ ] Quantity updates work
   - [ ] Remove items works
   - [ ] Proceed to checkout works

4. **Checkout**
   - [ ] Form validation works
   - [ ] COD order placement works
   - [ ] Order confirmation displays

5. **Track Order** (`/track-order`)
   - [ ] Order lookup works
   - [ ] Order details display correctly

### Test Admin Panel:
1. **Admin Login** (`/admin/login`)
   - [ ] Login with credentials works
   - [ ] Email: admin@vyraherbals.com
   - [ ] Password: VyraAdminPass@2026

2. **Admin Dashboard** (`/admin`)
   - [ ] Dashboard statistics load
   - [ ] No console errors

3. **Products Management** (`/admin/products`)
   - [ ] Products list loads
   - [ ] Can view/edit products
   - [ ] Image uploads work

4. **Orders Management** (`/admin/orders`)
   - [ ] Orders list loads
   - [ ] Can update order status
   - [ ] Order details display

5. **Reviews Management** (`/admin/reviews`)
   - [ ] Reviews list loads
   - [ ] Can approve/reject reviews
   - [ ] Status updates work

6. **Categories Management** (`/admin/categories`)
   - [ ] Categories list loads
   - [ ] Can add/edit categories

---

## 🚀 DEPLOYMENT STEPS

### Option 1: Deploy to Vercel (Recommended)

1. **Install Vercel CLI** (if not installed)
   ```bash
   npm install -g vercel
   ```

2. **Build the project locally first**
   ```bash
   npm run build
   ```

3. **Deploy to Vercel**
   ```bash
   vercel --prod
   ```

4. **Or use Vercel Dashboard:**
   - Connect your GitHub repository
   - Vercel will auto-detect Next.js
   - Add environment variables
   - Deploy

### Option 2: Manual Deployment

1. **Build for production**
   ```bash
   npm run build
   ```

2. **Start production server**
   ```bash
   npm start
   ```

3. **Use PM2 for process management** (if on VPS)
   ```bash
   pm2 start npm --name "vyra-herbals" -- start
   pm2 save
   pm2 startup
   ```

---

## ⚡ PERFORMANCE OPTIMIZATIONS

### Already Implemented:
- ✅ Next.js 15 with App Router
- ✅ Image optimization with Next/Image
- ✅ Database indexes on key columns
- ✅ RLS policies for security
- ✅ Server-side rendering where appropriate
- ✅ API route caching

### Recommended Post-Deployment:
1. Enable Vercel Analytics
2. Set up monitoring (Sentry, LogRocket)
3. Configure CDN for static assets
4. Enable image optimization in Supabase
5. Set up database backups

---

## 🔒 SECURITY CHECKLIST

- [x] Environment variables not committed
- [x] Admin routes protected with JWT
- [x] Database RLS policies enabled
- [x] HTTP-only cookies for admin auth
- [x] Input validation in API routes
- [x] SQL injection prevention (using Supabase client)
- [x] XSS prevention (React escaping)

### Additional Security Measures:
1. **Rate Limiting:** Consider adding rate limiting to API routes
2. **CORS:** Already configured in next.config.ts
3. **HTTPS:** Vercel provides this by default
4. **CSP Headers:** Consider adding Content Security Policy

---

## 📊 MONITORING & MAINTENANCE

### Post-Deployment Tasks:
1. **Monitor Error Logs**
   - Check Vercel logs daily for first week
   - Set up error alerting

2. **Database Monitoring**
   - Monitor Supabase usage
   - Check query performance
   - Review slow queries

3. **User Feedback**
   - Test checkout flow
   - Verify email notifications work (if implemented)
   - Check mobile responsiveness

4. **Regular Backups**
   - Set up daily database backups
   - Test restoration process

---

## 🐛 COMMON ISSUES & SOLUTIONS

### Issue 1: "Could not find column" errors
**Solution:** Run DATABASE_FIX_PRODUCTION.sql

### Issue 2: Images not loading
**Solution:** 
- Check Supabase storage bucket is public
- Verify NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET is set
- Check image paths in database

### Issue 3: Admin login not working
**Solution:**
- Verify ADMIN_EMAIL and ADMIN_PASSWORD in environment variables
- Check JWT_SECRET is set
- Clear browser cookies and try again

### Issue 4: Orders not saving
**Solution:**
- Check orders table has all required columns
- Verify RLS policies allow INSERT
- Check shipping_data and items are valid JSON

### Issue 5: Build fails on Vercel
**Solution:**
- Check all dependencies are in package.json
- Verify no TypeScript errors: `npm run build` locally
- Check Node.js version matches (18.x or 20.x)

---

## 📝 FINAL CHECKLIST BEFORE GO-LIVE

- [ ] Database schema fix applied (DATABASE_FIX_PRODUCTION.sql)
- [ ] All environment variables set in Vercel
- [ ] Supabase storage bucket is public
- [ ] Product images uploaded
- [ ] Test order placement (COD)
- [ ] Test admin login and all pages
- [ ] Verify mobile responsiveness
- [ ] Check page load times (< 3 seconds)
- [ ] Test all navigation links
- [ ] Verify contact form works
- [ ] Check SEO meta tags
- [ ] Test in different browsers (Chrome, Firefox, Safari)
- [ ] Set up error monitoring
- [ ] Prepare rollback plan
- [ ] Document admin procedures
- [ ] Train admin users

---

## 🎉 POST-DEPLOYMENT

1. **Announce Launch**
   - Social media posts
   - Email to existing customers
   - Update Google Business listing

2. **Monitor First 24 Hours**
   - Watch error logs closely
   - Check database usage
   - Monitor user behavior
   - Be ready for hot fixes

3. **Gather Feedback**
   - User testing
   - Customer surveys
   - Performance metrics
   - Conversion tracking

---

## 📞 SUPPORT

If you encounter issues:
1. Check Vercel deployment logs
2. Check Supabase logs
3. Review browser console errors
4. Check network tab for failed requests

---

## ✅ DEPLOYMENT SUMMARY

**Current Status:** Ready for deployment after database fix

**Critical Steps:**
1. ✅ Run DATABASE_FIX_PRODUCTION.sql in Supabase
2. ✅ Verify environment variables
3. ✅ Test locally: `npm run build && npm start`
4. ✅ Deploy to Vercel
5. ✅ Test production site thoroughly

**Estimated Deployment Time:** 15-30 minutes

**Risk Level:** LOW (after database fix)

---

Good luck with your deployment! 🚀
