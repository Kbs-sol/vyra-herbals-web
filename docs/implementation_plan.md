# WhatsApp Conversational Commerce Implementation Plan

This is a comprehensive plan to build a full two-way WhatsApp Bot that enables end-to-end purchasing, tracking, and customer support directly within WhatsApp.

## 1. Goal Description

Transform the current one-way WhatsApp notification system into a fully interactive Conversational Commerce platform. Customers will be able to message the Vyra Herbals WhatsApp number and navigate a menu-driven interface to browse products, manage a cart, checkout, pay securely via Easebuzz, and track their orders.

## 2. User Review Required

> [!WARNING]
> This is a massive feature addition that essentially recreates the entire website's functionality as a text-based chatbot. It will require extensive backend development, session state management, and rigorous testing to ensure edge cases (like users typing random text during checkout) are handled gracefully.

> [!IMPORTANT]
> Meta charges differently for **Service Conversations** (user-initiated) vs. **Utility/Marketing Conversations** (business-initiated). Because users will be chatting with the bot, you will incur Service Conversation charges from Meta for these interactions (the first 1,000 service conversations per month are typically free, but you should verify your pricing tier).

## 3. Open Questions

1. **Interactive UI vs Text Parsing**: We plan to use Meta's **Interactive Messages** (Buttons and Lists) so users can tap options instead of typing words (e.g., tap a button that says "🛒 View Cart" instead of typing "Cart"). Does this sound good?
2. **Catalog Integration**: Should we use Meta's built-in WhatsApp Catalog feature (requires syncing your products to Facebook Commerce Manager), or build a custom text-based product browser where the bot sends product details and images as regular messages? Custom text-based is easier to build immediately, but Meta Catalog looks more native.
3. **Payment Flow**: When a user is ready to pay, we will generate an Easebuzz payment link and send it in the chat. They will click the link, pay on the browser, and receive a WhatsApp confirmation. Is this acceptable?

## 4. Proposed Changes

### Database Changes
#### [NEW] `whatsapp_sessions` table
We need a way to remember where the user is in the conversation.
- `phone_number` (Primary Key)
- `state` (e.g., `MAIN_MENU`, `BROWSING`, `CART`, `CHECKOUT`)
- `context_data` (JSON - stores current cart items, selected products, etc.)
- `updated_at` (Timestamp to expire idle sessions)

### Webhook & Incoming Message Handling
#### [MODIFY] `app/api/webhooks/whatsapp/route.ts`
- Update the POST handler to process incoming `messages` array in addition to the `statuses` array.
- Route incoming messages to a new `WhatsAppBotEngine`.

#### [NEW] `src/services/communications/bot/botEngine.ts`
- The core router for incoming messages.
- Loads the user's session from `whatsapp_sessions`.
- Parses the message (button click, text reply).
- Calls the appropriate handler based on the user's current `state`.

### Conversation Handlers
#### [NEW] `src/services/communications/bot/handlers/mainMenu.ts`
- Sends the welcome message and options: "Shop Products", "Track Order", "Help".

#### [NEW] `src/services/communications/bot/handlers/shopping.ts`
- Fetches products from the DB and formats them as Interactive Lists or Images with Buttons (e.g., "Add to Cart").

#### [NEW] `src/services/communications/bot/handlers/cartAndCheckout.ts`
- Shows cart summary.
- Collects shipping address (via text prompts).
- Creates a `pending` order in the DB.
- Generates the Easebuzz payment link and sends it to the user.

#### [NEW] `src/services/communications/bot/handlers/tracking.ts`
- Looks up the user's recent orders by phone number.
- Fetches real-time status from iCarry and sends it back.

### WhatsApp Client Updates
#### [MODIFY] `src/services/communications/providers/whatsapp/client.ts`
- Add methods for sending `interactive` messages (buttons, lists).
- Add methods for sending images (for product photos).

## 5. Verification Plan

### Automated Tests
- Unit tests for the `botEngine` to ensure state transitions work correctly (e.g., cannot checkout with an empty cart).

### Manual Verification
- Deploy to a staging environment and manually chat with the WhatsApp test number.
- Walk through the entire flow: Greeting -> View Products -> Add to Cart -> Checkout -> Enter Address -> Pay -> Receive Confirmation.
- Test edge cases like typing random text when the bot expects an address.
