import { whatsappClient } from '../../providers/whatsapp/client';
import { updateSession, type WhatsAppSession } from '../sessionManager';

export async function handleMainMenu(from: string, session: WhatsAppSession) {
  // Reset state to IDLE when returning to main menu
  if (session.state !== 'IDLE') {
    await updateSession(from, { state: 'IDLE', context: {} });
  }

  await whatsappClient.sendRaw({
    messaging_product: 'whatsapp',
    to: from,
    type: 'interactive',
    interactive: {
      type: 'button',
      body: {
        text: 'Welcome to Vyra Herbals! 🌿\n\nHow can we help you today?'
      },
      action: {
        buttons: [
          {
            type: 'reply',
            reply: {
              id: 'VIEW_CATALOG',
              title: '🛍️ Shop Products'
            }
          },
          {
            type: 'reply',
            reply: {
              id: 'TRACK_ORDER',
              title: '📦 Track Order'
            }
          },
          {
            type: 'reply',
            reply: {
              id: 'CUSTOMER_SUPPORT',
              title: '💬 Customer Support'
            }
          }
        ]
      }
    }
  });
}
