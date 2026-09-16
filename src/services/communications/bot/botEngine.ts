import { logger } from '../logging/logger';
import { whatsappClient } from '../providers/whatsapp/client';
import { getSession, updateSession } from './sessionManager';
import { handleMainMenu, handleShopByCategory } from './handlers/mainMenu';
import { handleOrderReceived } from './handlers/orderReceiver';
import { handleAddressInput, handleConfirmAddress, handlePromptForAddress, handleStartAddAddress, handlePayOnline } from './handlers/addressReceiver';
import { handleTracking } from './handlers/tracking';
import { handleProductBrowser } from './handlers/productBrowser';
import { handleProductViewer } from './handlers/productViewer';
import { handleCart, handleAddToCart, handleCartQuantity, handleRemoveFromCart, handleProductSelectedAndShowSummary } from './handlers/cartManager';
import { handleCheckout, handlePaymentCheck, handleCodCheckout } from './handlers/paymentHandler';
import { handleHumanHandoff } from './handlers/humanHandoff';
import { handleCancellation } from './handlers/cancellationHandler';

export async function processIncomingMessages(messages: any[]) {
  for (const msg of messages) {
    try {
      await processSingleMessage(msg);
    } catch (err: any) {
      logger.error('whatsapp_bot_message_error', { message_id: msg.id, error: err.message });
    }
  }
}

async function processSingleMessage(msg: any) {
  const from: string = msg.from;
  if (!from) return;

  const session = await getSession(from);

  // Parse message content
  let textBody = '';
  let interactiveReplyId = '';
  let listReplyId = '';

  if (msg.type === 'text') {
    textBody = (msg.text?.body || '').trim();
  } else if (msg.type === 'interactive') {
    if (msg.interactive?.type === 'button_reply') {
      interactiveReplyId = msg.interactive.button_reply?.id || '';
    } else if (msg.interactive?.type === 'list_reply') {
      listReplyId = msg.interactive.list_reply?.id || '';
    }
  } else if (msg.type === 'order') {
    await handleOrderReceived(from, msg.order, session);
    return;
  }

  const replyId = interactiveReplyId || listReplyId;
  const normalizedText = textBody.toLowerCase();

  // --- HUMAN HANDOFF: bot goes completely silent ---
  if (session.state === 'HUMAN_HANDOFF') {
    // Do not reply. Admin must reset session to IDLE.
    return;
  }

  // --- GLOBAL KEYWORD INTERCEPTORS ---

  if (['hi','hello','hii','hy','hey','menu','start'].includes(normalizedText) || replyId === 'MAIN_MENU') {
    // DON'T clear cart context when returning to menu
    await updateSession(from, { state: 'BROWSING', context: { ...session.context } });
    await handleMainMenu(from, { ...session, state: 'BROWSING', context: { ...session.context } });
    return;
  }

  if (['cancel','cancel order','cancel my order'].includes(normalizedText)) {
    await handleCancellation(from, session);
    return;
  }

  if (['help','agent','human','support','call me','speak to agent','speak to human','call'].includes(normalizedText) || replyId === 'CUSTOMER_SUPPORT') {
    await handleHumanHandoff(from, session);
    return;
  }

  if (['cart','my cart','view cart','show cart'].includes(normalizedText) || replyId === 'VIEW_CART') {
    await handleCart(from, session);
    return;
  }

  if (replyId === 'SHOP_PRODUCTS' || replyId === 'BROWSE_MORE' || ['shop products', 'products', 'shop'].includes(normalizedText)) {
    await handleShopByCategory(from, session);
    return;
  }

  if (replyId === 'MY_ORDERS' || ['my orders', 'orders'].includes(normalizedText)) {
    await handleTracking(from, session);
    return;
  }

  if (replyId === 'TRACK_ORDER' || normalizedText === 'track order') {
    await handleTracking(from, session);
    return;
  }

  if (replyId === 'VIEW_CATALOG') {
    await handleProductBrowser(from, session, null);
    return;
  }

  if (replyId.startsWith('CAT_')) {
    const category = replyId.replace('CAT_', '');
    await handleProductBrowser(from, session, category);
    return;
  }

  if (replyId.startsWith('PRODUCT_')) {
    const productId = parseInt(replyId.replace('PRODUCT_', ''), 10);
    if (!isNaN(productId)) {
      await handleProductSelectedAndShowSummary(from, productId, session);
      return;
    }
  }

  if (replyId === 'ADD_TO_CART') {
    await handleAddToCart(from, session);
    return;
  }

  if (replyId === 'CONFIRM_AND_PAY') {
    await handlePromptForAddress(from, session);
    return;
  }

  if (replyId === 'ADD_ADDRESS') {
    await handleStartAddAddress(from, session);
    return;
  }

  if (replyId === 'PAY_ONLINE') {
    await handlePayOnline(from, session);
    return;
  }

  if (replyId === 'CHECKOUT' || replyId === 'PROCEED_TO_CHECKOUT') {
    await handlePromptForAddress(from, session);
    return;
  }

  if (replyId === 'CONFIRM_ADDRESS') {
    await handleConfirmAddress(from, session);
    return;
  }

  if (replyId === 'EDIT_ADDRESS') {
    await updateSession(from, { state: 'AWAITING_ADDRESS' });
    await sendText(from, 'Please type your full delivery address:\n\nInclude: Name, House/Flat No, Street/Area, City, State, Pincode');
    return;
  }

  if (replyId === 'CHECK_PAYMENT_STATUS') {
    await handlePaymentCheck(from, session);
    return;
  }

  if (replyId === 'COD_ORDER') {
    await handleCodCheckout(from, session);
    return;
  }

  if (replyId.startsWith('QTY_INC_') || replyId.startsWith('QTY_DEC_')) {
    const parts = replyId.split('_');
    const action = parts[1]; // 'INC' or 'DEC'
    const productId = parseInt(parts[2], 10);
    if (!isNaN(productId)) {
      await handleCartQuantity(from, productId, action === 'INC' ? 'increment' : 'decrement', session);
      return;
    }
  }

  if (replyId.startsWith('REMOVE_')) {
    const productId = parseInt(replyId.replace('REMOVE_', ''), 10);
    if (!isNaN(productId)) {
      await handleRemoveFromCart(from, productId, session);
      return;
    }
  }

  // --- STATE MACHINE ---
  switch (session.state) {
    case 'AWAITING_ADDRESS':
      if (textBody.length > 10) {
        await handleAddressInput(from, textBody, session);
      } else if (textBody) {
        await sendText(from, 'Please share your complete delivery address including Name, Street, City, State, and Pincode.');
      }
      break;

    case 'AWAITING_PAYMENT':
      await sendText(from, 'Your payment link is still active! Tap the button above to complete your order, or type *Cancel* to cancel.');
      break;

    default:
      await sendText(from, `I didn't quite understand that. \n\nType *Menu* to browse our products or *Help* to speak with our team. 🌿`);
      break;
  }
}

async function sendText(to: string, text: string) {
  await whatsappClient.sendRaw({
    messaging_product: 'whatsapp',
    to,
    type: 'text',
    text: { body: text }
  });
}
