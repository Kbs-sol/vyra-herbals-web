import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const parts = url.pathname.split('/');
    const name = parts[parts.length - 1];
    if (!name) return NextResponse.json({ error: 'file name required' }, { status: 400 });

    // If SUPABASE_PUBLIC_URL and bucket provided, redirect to storage
    const supaPublic = process.env.SUPABASE_PUBLIC_URL;
    const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'public';
    if (supaPublic) {
      const redirectUrl = `${supaPublic}/storage/v1/object/public/${bucket}/${name}`;
      return NextResponse.redirect(redirectUrl);
    }

    // Fallback to public assets directory
    const localPath = `/assets/images/${name}`;
    return NextResponse.redirect(localPath);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
