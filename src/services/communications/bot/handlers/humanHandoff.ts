import { whatsappClient } from '../../providers/whatsapp/client';
import { updateSession, type WhatsAppSession } from '../sessionManager';

export async function handleHumanHandoff(from: string, session: WhatsAppSession) {
  await updateSession(from, { state: 'HUMAN_HANDOFF', context: session.context });
  
  await whatsappClient.sendRaw({
    messaging_product: 'whatsapp',
    to: from,
    type: 'text',
    text: {
      body: `👋 Connecting you to our team...\n\nA team member will be with you shortly. Please hold on.\n\n_Our support hours: 10 AM – 7 PM, Mon–Sat_`
    }
  });

  // TODO: In production, this should also send an alert to admin (Slack/email/internal notification)
  // The admin panel shows HUMAN_HANDOFF sessions with a red badge
}
