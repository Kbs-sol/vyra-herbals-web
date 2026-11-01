import { NextResponse } from 'next/server';
import { handleMarketingOptOut } from '@/services/communications/marketing/optOutHandler';
import { verifyAdminAuth } from '@/utils/adminAuth';

export async function POST(req: Request) {
  const isAdmin = await verifyAdminAuth(req);
  // Optional: Allow webhook-triggered internal calls if no auth, but currently webhook bypasses this and uses handler directly
  // So we require admin auth here.
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { phone, action } = await req.json();
    if (!phone || (action !== 'stop' && action !== 'start')) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const result = await handleMarketingOptOut(phone, action === 'stop' ? 'unsubscribe' : 'subscribe');
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
