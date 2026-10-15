import { whatsappClient } from '../../providers/whatsapp/client';
import { updateSession, type WhatsAppSession } from '../sessionManager';

export async function handleHumanHandoff(from: string, session: WhatsAppSession) {
  await updateSession(from, { state: 'HUMAN_HANDOFF', context: session.context });
  
  await whatsappClient.sendRaw({
    messaging_product: 'whatsapp',
    to: from,
    type: 'interactive',
    interactive: {
      type: 'button',
      header: { type: 'text', text: '💬 Customer Support' },
      body: {
        text: `👋 *Connecting you to our team...*\n\nA team member will be with you shortly. Please feel free to type your question here.\n\n_Support hours: 10 AM – 7 PM, Mon–Sat_\n\nIf you'd like to return to shopping at any point, tap below:`
      },
      action: {
        buttons: [
          { type: 'reply', reply: { id: 'MAIN_MENU', title: '🏠 Back to Menu' } },
        ]
      }
    }
  });
}
