import { NextResponse } from 'next/server';
import { processRetryQueue } from '@/services/communications';
import { isAuthorizedCronRequest } from '@/lib/cronAuth';


// Force dynamic — API routes touch Supabase / cookies; static analysis at build time would try
// to import the module without runtime env vars and blow up in 'collect page data'.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const runtime = 'nodejs';
export const maxDuration = 60;

/** Triggered every 5 minutes — see vercel.cron.json for the schedule entry. */
export async function GET(req: Request) {
  if (!isAuthorizedCronRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const summary = await processRetryQueue();
  return NextResponse.json(summary);
}
