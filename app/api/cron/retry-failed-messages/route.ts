import { NextResponse } from 'next/server';
import { processRetryQueue } from '@/services/communications';
import { isAuthorizedCronRequest } from '@/lib/cronAuth';

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
