import { logger } from '../logging/logger';
import { whatsappClient } from '../providers/whatsapp/client';
import { getSession, updateSession } from './sessionManager';
import { handleMainMenu } from './handlers/mainMenu';
import { handleOrderReceived } from './handlers/orderReceiver';
import { handleAddressInput } from './handlers/addressReceiver';
import { handleTracking } from './handlers/tracking';

/**
 * Entry point for all incoming WhatsApp messages from the webhook.
 */
export async function processIncomingMessages(messages: any[]) {
  for (const msg of messages) {
    try {
      await processSingleMessage(msg);
    } catch (err: any) {
      logger.error('whatsapp_bot_message_error', {
        message_id: msg.id,
        error: err.message,
      });
    }
  }
}

async function processSingleMessage(msg: any) {
  const from = msg.from; // Phone number string
  if (!from) return;

  // 1. Get or create user session
  const session = await getSession(from);

  // 2. Determine message content
  let textBody = '';
  let interactiveReplyId = '';
  
  if (msg.type === 'text') {
    textBody = msg.text?.body?.trim() || '';
  } else if (msg.type === 'interactive') {
    if (msg.interactive?.type === 'button_reply') {
      interactiveReplyId = msg.interactive.button_reply?.id || '';
    } else if (msg.interactive?.type === 'list_reply') {
      interactiveReplyId = msg.interactive.list_reply?.id || '';
    }
  } else if (msg.type === 'order') {
    // Native WhatsApp Catalog Cart submission
    await handleOrderReceived(from, msg.order, session);
    return;
  }

  // 3. Global Commands (can override current state)
  const normalizedText = textBody.toLowerCase();
  if (['hi', 'hello', 'menu', 'start'].includes(normalizedText) || interactiveReplyId === 'MAIN_MENU') {
    await handleMainMenu(from, session);
    return;
  }
  
  if (interactiveReplyId === 'TRACK_ORDER' || normalizedText === 'track order') {
    await handleTracking(from, session);
    return;
  }

  // 4. State Machine Routing
  switch (session.state) {
    case 'AWAITING_ADDRESS':
      if (textBody) {
        await handleAddressInput(from, textBody, session);
      } else {
        await sendText(from, 'Please type your full delivery address.');
      }
      break;

    case 'AWAITING_PAYMENT':
      if (interactiveReplyId === 'CHECK_PAYMENT_STATUS') {
        // Implement logic to check DB for payment status and reply
        await sendText(from, 'Checking payment status... (Feature coming soon)');
      } else {
        await sendText(from, 'We are waiting for your payment. Please use the link provided above to complete your order.');
      }
      break;

    case 'IDLE':
    default:
      // If idle and didn't match global commands, just show main menu
      await handleMainMenu(from, session);
      break;
  }
}

/** Helper to send simple text */
async function sendText(to: string, text: string) {
  await whatsappClient.sendRaw({
    messaging_product: 'whatsapp',
    to,
    type: 'text',
    text: { body: text }
  });
}
