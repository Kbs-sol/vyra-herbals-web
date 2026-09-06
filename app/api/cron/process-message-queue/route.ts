import { NextResponse } from 'next/server';
import { processPendingQueue } from '@/services/communications';
import { isAuthorizedCronRequest } from '@/lib/cronAuth';

export const runtime = 'nodejs';
export const maxDuration = 60;

/** Triggered every minute — see vercel.cron.json for the schedule entry. */
export async function GET(req: Request) {
  if (!isAuthorizedCronRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const summary = await processPendingQueue();
  return NextResponse.json(summary);
}
