export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { requireAdmin } from '@/utils/adminAuth';
import { getAdminJwtSecret, getSupabaseUrl, getSupabaseServiceRoleKey } from '@/utils/serverEnv';

const DEFAULT_STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || 'products';

export async function POST(request: NextRequest) {
  try {
    const denied = await requireAdmin(request);
    if (denied) return denied;

    const formData = await request.formData();
    const uploadFile = formData.get('file') as File | null;
    
    // Bucket allowlist
    const ALLOWED_BUCKETS = new Set(['products', 'blogs', 'testimonials', 'avatars']);
    const requestedBucket = formData.get('bucket') as string;
    const bucket = ALLOWED_BUCKETS.has(requestedBucket) ? requestedBucket : DEFAULT_STORAGE_BUCKET;

    // Handle sanitization
    const rawHandle = (formData.get('handle') as string) || 'product';
    const handle = rawHandle.replace(/[^a-z0-9-_]/gi, '').slice(0, 50) || 'product';

    if (!uploadFile) {
      return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });
    }

    // MIME type allowlist
    const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);
    if (!ALLOWED_MIME_TYPES.has(uploadFile.type)) {
      return NextResponse.json({ success: false, error: 'Invalid file type. Only JPEG, PNG, WEBP, and AVIF are allowed.' }, { status: 400 });
    }

    const extension = uploadFile.name.split('.').pop() || 'jpg';
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    const path = `${handle}/${timestamp}-${random}.${extension}`;

    const arrayBuffer = await uploadFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const supabaseAdmin = createClient(getSupabaseUrl(), getSupabaseServiceRoleKey(), {
      auth: { persistSession: false },
    });

    const { data: uploadData, error } = await supabaseAdmin.storage
      .from(bucket)
      .upload(path, buffer, {
        cacheControl: '3600',
        upsert: false,
        contentType: uploadFile.type,
      });

    if (error) {
      console.error('Server upload error:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }

    // Get public URL and also generate a long-lived signed URL as a fallback
    const { data: publicData } = supabaseAdmin.storage.from(bucket).getPublicUrl(path);

    // Try to create a signed URL (expires in 1 year = 31536000 seconds)
    let signedUrl: string | null = null;
    try {
      const { data: signedData, error: signErr } = await supabaseAdmin.storage
        .from(bucket)
        .createSignedUrl(path, 31536000);
      if (!signErr && signedData?.signedUrl) signedUrl = signedData.signedUrl;
    } catch (e) {
      // ignore signing error, public url will be returned
      console.warn('Signed URL creation failed', e);
    }

    return NextResponse.json({ success: true, publicUrl: publicData.publicUrl, signedUrl });
  } catch (err) {
    console.error('Upload API error', err);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
