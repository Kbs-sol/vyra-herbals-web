import { NextResponse } from 'next/server';


// Force dynamic — API routes touch Supabase / cookies; static analysis at build time would try
// to import the module without runtime env vars and blow up in 'collect page data'.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const parts = url.pathname.split('/');
    const name = parts[parts.length - 1];
    if (!name) return NextResponse.json({ error: 'file name required' }, { status: 400 });

    // If SUPABASE_PUBLIC_URL and bucket provided, redirect to storage
    const supaPublic = process.env.SUPABASE_PUBLIC_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'images';
    if (supaPublic) {
      const redirectUrl = `${supaPublic}/storage/v1/object/public/${bucket}/${name}`;
      return NextResponse.redirect(redirectUrl);
    }

    // Fallback to public assets directory placeholder
    const baseUrl = url.origin;
    return NextResponse.redirect(`${baseUrl}/assets/images/vyra_placeholder.png`);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
