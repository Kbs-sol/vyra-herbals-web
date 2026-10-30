import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/utils/supabaseClient';
import { isAuthorizedCronRequest } from '@/lib/cronAuth';
import { fetchOrderList } from '@/utils/shiprocketCheckout';
import { resolveShiprocketConfig } from '@/utils/shiprocketSettings';
import { finalizeShiprocketOrder } from '@/utils/shiprocketOrder';

// Force dynamic - these routes touch Supabase and Shiprocket at request time.
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * Failsafe recommended by Shiprocket's docs: "create some periodic jobs as a
 * failsafe for pending orders". Lists SUCCESS orders from the last 48 hours via
 * the Order List API and finalizes any we have not recorded (a dropped webhook
 * AND a buyer who closed the tab before the redirect). Idempotent, so it is safe
 * to run often. Schedule: see vercel.cron.json.
 */
export async function GET(req: Request) {
  if (!isAuthorizedCronRequest(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = createServerSupabase();
  const cfg = await resolveShiprocketConfig(supabase);
  if (!cfg.configured) return NextResponse.json({ skipped: 'shiprocket not configured' });

  const end = new Date();
  const start = new Date(end.getTime() - 48 * 3600 * 1000);
  const list = await fetchOrderList(cfg, { startDate: start.toISOString(), endDate: end.toISOString(), status: 'SUCCESS', limit: 100, page: 0 });
  if (!list.ok) return NextResponse.json({ error: list.error }, { status: 502 });

  const summary = { checked: 0, created: 0, existing: 0, failed: 0 };
  const deadline = Date.now() + 50_000;
  for (const row of list.data?.data || []) {
    if (Date.now() > deadline) break;
    summary.checked++;
    const r = await finalizeShiprocketOrder(supabase, cfg, row.id);
    if (!r.ok) { summary.failed++; continue; }
    if (r.alreadyExisted) { summary.existing++; continue; }
    summary.created++;
    await r.sideEffects();
  }
  return NextResponse.json(summary);
}
