import { NextResponse } from 'next/server';
import { runCleanup } from '@/services/communications';
import { isAuthorizedCronRequest } from '@/lib/cronAuth';

export const runtime = 'nodejs';
export const maxDuration = 60;

/** Triggered once daily at 2 AM UTC — see vercel.cron.json for the schedule entry. */
export async function GET(req: Request) {
  if (!isAuthorizedCronRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await runCleanup();
  return NextResponse.json(result);
}
