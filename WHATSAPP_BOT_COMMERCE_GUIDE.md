# WhatsApp Conversational Commerce — Live Integration Guide

Your code is now set up to handle incoming WhatsApp messages, manage user sessions, accept orders via the WhatsApp Catalog, and send payment links.

To make the WhatsApp ordering flow live, you need to configure your **Meta Commerce Manager**.

## Step 1: Upload Your Products to Meta
Because you chose the **WhatsApp Catalog Integration**, you do not need to manually code product lists. Instead:
1. Go to **[Facebook Commerce Manager](https://business.facebook.com/commerce)**.
2. Create a Catalog (if you don't have one) and upload your Vyra Herbals products with their Prices and Images.
3. Link the Catalog to your **WhatsApp Business Account**.

## Step 2: How the Customer Flow Works Now
1. **Greeting**: The customer texts "Hi" or clicks a button.
2. **Main Menu**: The bot instantly replies with interactive buttons: **"🛍️ Shop Products"**, **"📦 Track Order"**, and **"💬 Customer Support"**.
3. **Shopping**: The customer clicks "Shop Products", opens your WhatsApp Catalog, adds items to their WhatsApp Cart, and sends it to the bot.
4. **Checkout**:
   - The bot receives the exact cart contents.
   - It calculates the total and asks the customer for their **Full Delivery Address**.
   - Once they type their address, the bot saves the draft order and generates a secure checkout link (`https://vyraherbals.com/checkout/pay?order_id=...`).
5. **Payment**: The customer clicks the link, pays via Easebuzz securely on their browser, and gets redirected back to the chat.
6. **Confirmation**: Your existing system (which we already built) will detect the successful payment and instantly send them the `payment_confirmed` WhatsApp message!

## Step 3: Run Database Migration
Before the bot can start storing user sessions, you must run the latest SQL migration in your Supabase project.

1. Go to your **Supabase Dashboard** -> **SQL Editor**.
2. Copy the contents of `database/migrations/004_whatsapp_sessions.sql` from GitHub.
3. Run the query to create the `whatsapp_sessions` table.

---
*Note: I have already committed and pushed the entire backend logic to your GitHub `main` branch.*
