import { NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/utils/adminAuth';
import { getAudiencePhones } from '@/services/communications/marketing/audienceFetcher';

function maskPhone(phone: string) {
  if (phone.length < 10) return phone;
  const first = phone.slice(0, 4);
  const last = phone.slice(-2);
  return `${first}${'X'.repeat(phone.length - 6)}${last}`;
}

export async function POST(req: Request) {
  const isAdmin = await verifyAdminAuth(req);
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { template_name, audience_segment, parameters, idempotency_key } = body;

    const audience = await getAudiencePhones(audience_segment);
    
    let freq_cap_excluded = 0;
    let opt_out_excluded = 0;
    const eligiblePhones: string[] = [];

    const now = new Date();
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    for (const user of audience) {
      if (user.opt_out) {
        opt_out_excluded++;
        continue;
      }
      if (user.last_sent && new Date(user.last_sent) >= fourteenDaysAgo) {
        freq_cap_excluded++;
        continue;
      }
      eligiblePhones.push(user.phone);
    }

    const sample_phones = eligiblePhones.slice(0, 5).map(maskPhone);
    const sample_message = `Preview for ${template_name} (Variables: ${parameters?.join(', ') || 'None'})`;
    const eligible_count = eligiblePhones.length;

    return NextResponse.json({
      total_audience: audience.length,
      freq_cap_excluded,
      opt_out_excluded,
      eligible_count,
      sample_phones,
      sample_message,
      estimated_cost: eligible_count * 0.47,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
