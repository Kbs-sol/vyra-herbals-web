# Product Upload Storage Setup

## Supabase Storage Bucket Configuration

The product upload feature requires a storage bucket named `products` in your Supabase project.

### Steps to Create the Storage Bucket:

1. **Go to Supabase Dashboard**
   - Navigate to https://supabase.com/dashboard
   - Select your project: `obbohecegyagnqufelpx`

2. **Create Storage Bucket**
   - Click on "Storage" in the left sidebar
   - Click "Create bucket" button
   - **Bucket name:** `products`
   - **Public bucket:** Yes (check this option)
   - **File size limit:** 50 MB (recommended)
   - **Allowed MIME types:** image/* (images only)
   - Click "Create bucket"

3. **Set Bucket Policies**
   The bucket should be publicly accessible for reading. Run these policies:

```sql
-- Allow public read access
CREATE POLICY "Public read access for product images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'products');

-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload product images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'products');

-- Allow authenticated users to delete their uploads
CREATE POLICY "Authenticated users can delete product images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'products');
```

### Folder Structure

Images will be automatically organized by product handle:
```
products/
  ├── hair-oil-500ml/
  │   ├── 1704901234567-abc123.jpg
  │   └── 1704901234568-def456.jpg
  ├── neem-comb/
  │   └── 1704901234569-ghi789.jpg
  └── ...
```

### Troubleshooting

**Error: "new row violates row-level security policy"**
- Make sure RLS policies are created (see above)
- Verify you're logged in as admin

**Error: "Failed to upload: Bucket not found"**
- Create the `products` bucket in Supabase dashboard
- Ensure bucket name in `.env` matches: `NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET=products`

**Error: "Failed to upload: Permission denied"**
- Check bucket is set to "Public" 
- Verify RLS policies are in place

### Testing Upload

1. Go to Admin Panel > Products
2. Click "Add Product"
3. Fill in product details
4. Upload a test image (max 5MB)
5. Image should upload and preview should appear
6. Check Supabase Storage dashboard to verify file is stored

### Environment Variables

Ensure these are set in your `.env` file:
```env
NEXT_PUBLIC_SUPABASE_URL=https://obbohecegyagnqufelpx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET=products
```

### Blogs Storage Bucket (new)

If you're adding the Blogs feature, create a `blogs` public bucket in Supabase as well. The admin upload endpoint supports an explicit `bucket` form field (`bucket = 'blogs'`) so uploaded blog images are stored under the `blogs` bucket. Use the same public read policies as for `products` but replace `products` with `blogs` in the SQL examples above.

Example policy (replace `products` with `blogs`):
```sql
-- Allow public read access for blog images
CREATE POLICY "Public read access for blog images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'blogs');
```

