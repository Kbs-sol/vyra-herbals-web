import { NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/utils/adminAuth';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { getAudiencePhones } from '@/services/communications/marketing/audienceFetcher';
import { messageQueue } from '@/services/communications';
import { whatsappClient } from '@/services/communications/providers/whatsapp/client';
import { sendQueuedMessage } from '@/services/communications/queue/messageSender';
import { logger } from '@/services/communications/logging/logger';
import { tryNormalizePhone } from '@/services/communications/utils/phoneNormalizer';

export async function POST(req: Request) {
  const isAdmin = await verifyAdminAuth(req);
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { campaign_name, template_name, audience_segment, parameters = [], idempotency_key } = body;

    const supabase = getSupabaseAdmin();

    // Check idempotency
    const { data: existingCampaign } = await supabase
      .from('campaigns')
      .select('id, status')
      .eq('idempotency_key', idempotency_key)
      .single();

    if (existingCampaign) {
      if (existingCampaign.status === 'sent') {
        return NextResponse.json({ message: 'Already sent', campaign_id: existingCampaign.id });
      }
      return NextResponse.json({ error: 'Campaign already in progress or exists in non-sent state' }, { status: 400 });
    }

    // Create campaign row
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .insert({
        name: campaign_name,
        template_name,
        audience_segment,
        status: 'sending',
        idempotency_key
      })
      .select('id')
      .single();

    if (campaignError || !campaign) {
      throw new Error(`Failed to create campaign: ${campaignError?.message}`);
    }

    const campaignId = campaign.id;

    // Fetch audience
    const audience = await getAudiencePhones(audience_segment);
    let freq_cap_excluded = 0;
    let opt_out_excluded = 0;
    const eligiblePhones: Array<{ phone: string; source: string; user_id?: string }> = [];

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
      const normalized = tryNormalizePhone(user.phone);
      if (normalized) {
        eligiblePhones.push({ phone: normalized, source: user.source, user_id: user.user_id });
      }
    }

    let sentCount = 0;
    let failedCount = 0;

    for (const user of eligiblePhones) {
      try {
        // Insert campaign recipient
        await supabase.from('campaign_recipients').insert({
          campaign_id: campaignId,
          customer_phone: user.phone,
          send_status: 'pending'
        });

        // Enqueue message
        const dedupeKey = `CAMPAIGN:${campaignId}:${user.phone}`;
        const msg = await messageQueue.enqueue({
          order_id: null,
          customer_phone: user.phone,
          message_type: 'MANUAL',
          provider: 'whatsapp',
          template_name,
          parameters,
          dedupe_key: dedupeKey
        });

        // Send immediately
        const outcome = await sendQueuedMessage(msg, whatsappClient);
        const finalStatus = outcome === 'sent' ? 'sent' : 'failed';
        
        if (outcome === 'sent') {
          sentCount++;
        } else {
          failedCount++;
        }

        // Update recipient (message_id will be handled later or left null if we can't get it easily)
        await supabase
          .from('campaign_recipients')
          .update({ 
            send_status: finalStatus
            // omitted message_id since sendQueuedMessage doesn't return it
          })
          .eq('campaign_id', campaignId)
          .eq('customer_phone', user.phone);

        // Update frequency caps if sent successfully
        if (outcome === 'sent') {
          if (user.source === 'users' && user.user_id) {
            const { data: userData } = await supabase.from('users').select('campaign_count_14d').eq('id', user.user_id).single();
            await supabase
              .from('users')
              .update({
                last_marketing_sent_at: new Date().toISOString(),
                campaign_count_14d: (userData?.campaign_count_14d || 0) + 1
              })
              .eq('id', user.user_id);
          } else if (user.source === 'historical_leads') {
            await supabase
              .from('historical_leads')
              .update({
                last_marketing_sent_at: new Date().toISOString()
              })
              .eq('mobile_number', user.phone);
          }
        }
      } catch (err: any) {
        logger.error('campaign_send_error', { phone: user.phone, error: err.message });
        failedCount++;
        await supabase
          .from('campaign_recipients')
          .update({ send_status: 'failed' })
          .eq('campaign_id', campaignId)
          .eq('customer_phone', user.phone);
      }
    }

    // Update campaign row
    await supabase
      .from('campaigns')
      .update({
        status: 'sent',
        audience_count: audience.length,
        sent_count: sentCount,
        failed_count: failedCount,
        opt_out_excluded,
        freq_cap_excluded,
        sent_at: new Date().toISOString()
      })
      .eq('id', campaignId);

    return NextResponse.json({
      success: true,
      campaign_id: campaignId,
      audience_count: audience.length,
      sent_count: sentCount,
      failed_count: failedCount,
      opt_out_excluded,
      freq_cap_excluded
    });
  } catch (error: any) {
    logger.error('campaign_creation_error', { error: error.message });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

