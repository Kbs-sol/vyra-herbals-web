import { logger } from '../logging/logger';
import { whatsappClient } from '../providers/whatsapp/client';
import { getSession, updateSession } from './sessionManager';
import { handleMainMenu, handleShopByCategory } from './handlers/mainMenu';
import { handleOrderReceived } from './handlers/orderReceiver';
import { handleAddressInput, handleConfirmAddress, handlePromptForAddress, handleStartAddAddress, handlePayOnline } from './handlers/addressReceiver';
import { handleTracking } from './handlers/tracking';
import { handleProductBrowser } from './handlers/productBrowser';
import { handleProductViewer } from './handlers/productViewer';
import { handleCart, handleAddToCart, handleCartQuantity, handleRemoveFromCart, handleProductSelectedAndShowSummary, handleManageCart, handleClearCart } from './handlers/cartManager';
import { handleCheckout, handlePaymentCheck, handleCodCheckout } from './handlers/paymentHandler';
import { handleHumanHandoff } from './handlers/humanHandoff';
import { handleCancellation } from './handlers/cancellationHandler';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

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
    try {
      const { logChatMessage } = await import('./chatLogger');
      await logChatMessage({
        phone_number: from,
        direction: 'inbound',
        message_type: 'order',
        body: '🛒 Sent Order / Catalog Cart',
        raw_payload: msg.order,
      });
    } catch {}
    await handleOrderReceived(from, msg.order, session);
    return;
  }

  const replyId = interactiveReplyId || listReplyId;
  const normalizedText = textBody.toLowerCase();

  // Log inbound message for Admin Live Chat
  try {
    const { logChatMessage } = await import('./chatLogger');
    await logChatMessage({
      phone_number: from,
      direction: 'inbound',
      message_type: msg.type || 'text',
      body: textBody || replyId || 'Interactive Selection',
      raw_payload: msg,
    });
  } catch {}

  // --- HUMAN HANDOFF: bot goes silent UNLESS customer wants to return to shopping ---
  if (session.state === 'HUMAN_HANDOFF') {
    const EXIT_WORDS = ['menu', 'start', 'shop', 'main menu', 'exit', 'hi', 'hello', 'catalog'];
    const wantsMenu = replyId === 'MAIN_MENU' || EXIT_WORDS.some(w => normalizedText === w || normalizedText.startsWith(w + ' '));
    if (wantsMenu) {
      await updateSession(from, { state: 'BROWSING', context: { ...session.context } });
      await handleMainMenu(from, { ...session, state: 'BROWSING', context: { ...session.context } });
      return;
    }
    // Otherwise do not reply — leave conversation open for human agent
    return;
  }

  // --- GLOBAL KEYWORD INTERCEPTORS ---

  const GREETING_WORDS = ['hi', 'hello', 'hii', 'hiii', 'hy', 'hey', 'heyy', 'menu', 'start', 'namaste', 'hola', 'good morning', 'good afternoon', 'good evening', 'vyra'];
  const isGreeting = GREETING_WORDS.some(w => normalizedText === w || normalizedText.startsWith(w + ' ') || normalizedText.endsWith(' ' + w));

  if (isGreeting || replyId === 'MAIN_MENU') {
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

  const CLEAR_CART_WORDS = ['clear cart', 'delete cart', 'empty cart', 'clear my cart', 'delete my cart', 'remove all', 'empty'];
  if (CLEAR_CART_WORDS.includes(normalizedText) || replyId === 'CLEAR_CART') {
    await handleClearCart(from, session);
    return;
  }

  const MANAGE_CART_WORDS = ['manage cart', 'edit cart', 'remove item', 'remove from cart', 'delete item', 'remove items'];
  if (MANAGE_CART_WORDS.includes(normalizedText) || replyId === 'MANAGE_CART' || replyId === 'EDIT_CART') {
    await handleManageCart(from, session);
    return;
  }

  if (
    replyId === 'SHOP_PRODUCTS' || 
    replyId === 'BROWSE_MORE' || 
    replyId === 'VIEW_CATALOG' ||
    ['shop', 'products', 'buy', 'catalog', 'items'].some(w => normalizedText === w || normalizedText.includes(w))
  ) {
    await handleShopByCategory(from, session);
    return;
  }

  if (replyId === 'MY_ORDERS' || ['my orders', 'orders'].includes(normalizedText)) {
    await handleTracking(from, session);
    return;
  }

  if (replyId === 'TRACK_ORDER' || normalizedText === 'track order' || normalizedText === 'track') {
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

  // --- GUARD AGAINST STALE BUTTONS ON ALREADY CONFIRMED ORDERS ---
  const orderRelatedButtons = [
    'CONFIRM_AND_PAY',
    'CONFIRM_ADDRESS',
    'EDIT_ADDRESS',
    'ADD_ADDRESS',
    'PAY_ONLINE',
    'COD_ORDER',
    'CHECK_PAYMENT_STATUS',
    'CHECKOUT',
    'PROCEED_TO_CHECKOUT',
  ];

  if (orderRelatedButtons.includes(replyId)) {
    if (session.state === 'ORDER_CONFIRMED') {
      await sendText(
        from,
        `✅ Your order has already been confirmed! 📦\n\nType *Track Order* to check the status or *Menu* to start a new order.`
      );
      return;
    }

    const draftOrderId = session.context?.draft_order_id || session.context?.confirmed_order_id;
    if (draftOrderId) {
      const db = getSupabaseAdmin();
      const { data: existingOrder } = await db
        .from('orders')
        .select('id, status, payment_method')
        .eq('id', draftOrderId)
        .maybeSingle();

      if (existingOrder && ['placed', 'confirmed', 'shipped', 'delivered'].includes(existingOrder.status)) {
        await updateSession(from, {
          state: 'ORDER_CONFIRMED',
          context: { confirmed_order_id: existingOrder.id }
        });
        await sendText(
          from,
          `✅ Your order #${existingOrder.id} has already been placed! 📦\n\nType *Track Order* to check its status or *Menu* to shop again.`
        );
        return;
      }
    }
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
      await handleMainMenu(from, session);
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
