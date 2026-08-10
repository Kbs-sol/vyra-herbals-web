export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { getAdminJwtSecret } from '@/utils/serverEnv';


const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const DEFAULT_STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || 'products';

export async function POST(request: NextRequest) {
  try {
    // Verify admin cookie token
    const cookieStore = await cookies();
    const token = cookieStore.get('admin_token')?.value;
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    try {
      await jwtVerify(token, getAdminJwtSecret());
    } catch (err) {
      return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });
    }

    const formData = await request.formData();
    const uploadFile = formData.get('file') as File | null;
    const handle = (formData.get('handle') as string) || 'product';
    const bucket = (formData.get('bucket') as string) || DEFAULT_STORAGE_BUCKET; // allow overriding bucket for different content (e.g., 'blogs')

    if (!uploadFile) {
      return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });
    }

    const extension = uploadFile.name.split('.').pop() || 'jpg';
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    const path = `${handle}/${timestamp}-${random}.${extension}`;

    const arrayBuffer = await uploadFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ success: false, error: 'Supabase credentials missing (SUPABASE_URL / SERVICE_ROLE_KEY)' }, { status: 500 });
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
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
