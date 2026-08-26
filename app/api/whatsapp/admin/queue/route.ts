import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { sendQueuedMessage } from '@/services/communications/queue/messageSender';
import { whatsappClient } from '@/services/communications/providers/whatsapp/client';

export const runtime = 'nodejs';

/**
 * GET /api/whatsapp/admin/queue?status=pending|failed_retry|failed_permanent
 * Inspect the live queue for the admin dashboard.
 */
export async function GET(req: Request) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');

  const db = getSupabaseAdmin();
  let query = db.from('message_queue').select('*').order('created_at', { ascending: false }).limit(100);
  if (status) query = query.eq('status', status);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ queue: data });
}

/**
 * POST /api/whatsapp/admin/queue { queue_id: number }
 * Manually force-retry a single specific queue row right now, regardless
 * of its next_retry_at — for support cases that can't wait for the cron.
 */
export async function POST(req: Request) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  let body: { queue_id: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.queue_id) {
    return NextResponse.json({ error: 'queue_id is required' }, { status: 400 });
  }

  const db = getSupabaseAdmin();
  const { data: row, error } = await db
    .from('message_queue')
    .select('*')
    .eq('id', body.queue_id)
    .single();

  if (error || !row) {
    return NextResponse.json({ error: 'Queue row not found' }, { status: 404 });
  }

  const outcome = await sendQueuedMessage(row, whatsappClient);
  return NextResponse.json({ queue_id: body.queue_id, outcome });
}
