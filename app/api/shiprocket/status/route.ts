import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/utils/supabaseClient';
import { getRuntimeDecision } from '@/utils/shiprocketRuntime';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';
export const preferredRegion = 'bom1';

/**
 * Public, secret-free answer to "should the cart show Shiprocket as the primary
 * checkout?". The storefront calls this once per page; if it errors or says
 * disabled, the native Easebuzz / COD checkout is used. Never returns keys.
 */
export async function GET() {
  try {
    const { status } = await getRuntimeDecision(createServerSupabase());
    return NextResponse.json(status, { headers: { 'Cache-Control': 'public, s-maxage=20, stale-while-revalidate=40' } });
  } catch (e) {
    console.error('[shiprocket/status]', (e as Error).message);
    return NextResponse.json({ enabled: false, reason: 'error' }, { status: 200, headers: { 'Cache-Control': 'no-store' } });
  }
}
