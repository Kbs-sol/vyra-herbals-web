# Complete Meta Business Portal & WhatsApp Cloud API Configuration Guide

This guide provides exact, step-by-step instructions for configuring everything required on the **Meta Developer Portal**, **Meta Business Manager**, and **Meta Commerce Manager** to operate Vyra Herbals' WhatsApp conversational ordering bot, catalog checkout, and automated notification system.

---

## Table of Contents
1. [Prerequisites & Account Requirements](#1-prerequisites--account-requirements)
2. [Step 1: Meta Developer App Creation](#step-1-meta-developer-app-creation)
3. [Step 2: WhatsApp Product Configuration & Phone Number](#step-2-whatsapp-product-configuration--phone-number)
4. [Step 3: Creating a Permanent System User Access Token](#step-3-creating-a-permanent-system-user-access-token)
5. [Step 4: Configuring the Webhook (Instant Message Receiving)](#step-4-configuring-the-webhook-instant-message-receiving)
6. [Step 5: Meta Catalog & WhatsApp Shop Setup](#step-5-meta-catalog--whatsapp-shop-setup)
7. [Step 6: WhatsApp Message Templates (Required for Notifications)](#step-6-whatsapp-message-templates-required-for-notifications)
8. [Step 7: Vercel Environment Variables Checklist](#step-7-vercel-environment-variables-checklist)
9. [Step 8: Testing & Verification Procedure](#step-8-testing--verification-procedure)

---

## 1. Prerequisites & Account Requirements

Before beginning, ensure you have:
* An active **Facebook Account** with admin access to your company's **Meta Business Portfolio (Business Manager)** at [business.facebook.com](https://business.facebook.com).
* A registered **Meta Developer Account** at [developers.facebook.com](https://developers.facebook.com).
* A clean phone number dedicated to WhatsApp Business (the number cannot be currently registered on WhatsApp Consumer or WhatsApp Business mobile app; if it is, you must delete the account from WhatsApp settings on the phone first).

---

## 2. Step 1: Meta Developer App Creation

1. Navigate to [developers.facebook.com](https://developers.facebook.com) and log in.
2. Click **My Apps** in the top-right corner, then click **Create App**.
3. **Use Case / App Type Selection**:
   * Select **Other** (or **Business** if prompted for business use case).
   * Click **Next**.
   * Under App Types, choose **Business** ("Manage business assets like Pages, Events, Groups, Ads, WhatsApp, etc.").
   * Click **Next**.
4. **App Details**:
   * **App Name**: `Vyra Herbals WhatsApp Engine`
   * **App Contact Email**: Your official technical/support email.
   * **Business Account**: Select your verified **Vyra Herbals Meta Business Account**.
   * Click **Create App** and complete the security verification.

---

## 3. Step 2: WhatsApp Product Configuration & Phone Number

1. In the app dashboard left-hand menu, scroll to **Add products to your app** and locate **WhatsApp**.
2. Click **Set up**.
3. Under the left sidebar under **WhatsApp**, click **API Setup**:
   * You will see a test sandbox with:
     * **Temporary Access Token** (valid for 24 hours only — we will replace this with a permanent token in Step 3).
     * **Phone Number ID**: A 15–16 digit number (e.g., `104857291827461`). Copy this for Vercel `WHATSAPP_PHONE_NUMBER_ID`.
     * **WhatsApp Business Account ID**: A 15–16 digit number (e.g., `109283746501928`). Copy this for Vercel `WHATSAPP_BUSINESS_ACCOUNT_ID`.
4. **To add your real phone number**:
   * Scroll down to **Step 5: Add a phone number**.
   * Click **Add phone number**.
   * Enter your business display name: `Vyra Herbals`
   * Select Category: `Health & Beauty`.
   * Enter the phone number and verify it via SMS or Phone Call OTP.

---

## 4. Step 3: Creating a Permanent System User Access Token

> ⚠️ **CRITICAL**: The access token shown in the Developer App dashboard expires in 24 hours. If you use it, your bot and order notifications will stop working after one day. You **must** create a Permanent System User Token.

1. Go to [business.facebook.com/settings](https://business.facebook.com/settings) (Meta Business Settings).
2. Ensure your **Vyra Herbals** business account is selected at the top left.
3. In the left navigation, go to **Users** > **System Users**.
4. Click **Add**:
   * **System User Name**: `Vyra-WhatsApp-Service-Worker`
   * **Role**: `Admin` (required to manage templates and webhooks).
   * Click **Create system user**.
5. With the system user selected, click **Assign Assets**:
   * Select **Apps** in the asset column > choose your `Vyra Herbals WhatsApp Engine` app.
   * Toggle on **Full Control** (Manage App) > click **Save Changes**.
   * Select **WhatsApp Accounts** in the asset column > choose your `Vyra Herbals` WhatsApp account.
   * Toggle on **Full Control** (Manage WhatsApp Business Account) > click **Save Changes**.
6. Under the system user details, click **Generate new token**:
   * **Select App**: Choose your `Vyra Herbals WhatsApp Engine` app.
   * **Token Expiration**: Select **Never** (Permanent).
   * **Available Permissions**: Scroll and select the following two required scopes:
     1. `whatsapp_business_messaging`
     2. `whatsapp_business_management`
   * Click **Generate Token**.
7. **Copy this token immediately** and store it safely in your password manager. This token is your `WHATSAPP_ACCESS_TOKEN`.

---

## 5. Step 4: Configuring the Webhook (Instant Message Receiving)

The webhook notifies your Next.js application whenever a customer sends a message, clicks a menu button, places a catalog order, or receives a delivery status update.

### Part A: Retrieve Your Meta App Secret
1. In [developers.facebook.com](https://developers.facebook.com), open your app.
2. In the left sidebar, click **App settings** > **Basic**.
3. Under **App Secret**, click **Show** (re-enter your Facebook password).
4. Copy the 32-character hexadecimal string. This is your `WHATSAPP_APP_SECRET`.

### Part B: Configure the Webhook Endpoint
1. In the left sidebar, go to **WhatsApp** > **Configuration**.
2. Locate the **Webhook** section and click **Edit**:
   * **Callback URL**: `https://vyraherbals.com/api/webhooks/whatsapp`
     *(If testing locally, use your ngrok HTTPS URL: e.g. `https://xxxx.ngrok-free.app/api/webhooks/whatsapp`)*
   * **Verify Token**: Any private string you choose (e.g., `vyra-webhook-secret-2026`).
     *(Must match `WHATSAPP_WEBHOOK_VERIFY_TOKEN` in your Vercel environment variables).*
3. Click **Verify and Save**. Meta will immediately send a verification request. If your Vercel app is running with matching env vars, it will display a green checkmark.
4. **Webhook Subscription Fields (Crucial)**:
   * Click **Manage** next to Webhook Fields.
   * Find **`messages`** and click **Subscribe**.
     *(This is mandatory. Without subscribing to `messages`, Meta will never forward incoming chats or catalog orders to your webhook).*

---

## 6. Step 5: Meta Catalog & WhatsApp Shop Setup

To allow customers to browse your products and checkout directly within WhatsApp (the Meta Catalog flow):

### Part A: Create a Product Catalog in Commerce Manager
1. Go to [business.facebook.com/commerce](https://business.facebook.com/commerce).
2. Click **Add Catalog** > Select **E-commerce** (Products) > Click **Next**.
3. Select **Upload product info**, name your catalog: `Vyra Herbals Products`, and assign it to your Business Account.
4. Click **Create** > **View Catalog**.

### Part B: Connect Catalog to WhatsApp
1. In [business.facebook.com/settings](https://business.facebook.com/settings), go to **Accounts** > **WhatsApp Accounts**.
2. Select your WhatsApp Account and click **Settings**.
3. Under **WhatsApp Manager**, click **Account tools** > **Catalog**.
4. Click **Choose a catalog** and link `Vyra Herbals Products`.
5. Under Catalog settings, toggle on **"Show catalog button in WhatsApp profile"** and **"Enable Cart"**.

### Part C: Add Products with Exact Retailer IDs (Matching Supabase)
When adding products to your Meta Catalog (manually or via CSV):
* **Content ID / Content SKU (Retailer ID)**: **MUST** match the product `sku` or `handle` from your Supabase `products` table!
  * *Example 1*: `VYRA-MINI-SCALPCARE-KIT`
  * *Example 2*: `vyra-mini-scalp-care-kit`
* **Title**: e.g., `Vyra Mini Scalp Care Kit`
* **Price**: Enter standard price in `INR` (e.g., `829.00 INR`).
* **Availability**: `In Stock`.
* **Image**: High-resolution product image URL.

*(Our backend `orderReceiver.ts` reads `item.product_retailer_id` and looks up `sku.eq.X OR handle.eq.X` in Supabase to fetch verified database prices and create orders).*

---

## 7. Step 6: WhatsApp Message Templates (Required for Notifications)

Meta requires pre-approved templates for initiating conversations or sending automated alerts outside the 24-hour customer service window.

### Where to Create Templates:
1. Open [business.facebook.com/wa/manage/home](https://business.facebook.com/wa/manage/home) (WhatsApp Manager).
2. In the left menu, select **Account tools** > **Message templates**.
3. Click **Create template**.
4. Set **Language** to **English** (`en`) for all templates (or matching `WHATSAPP_TEMPLATE_LANGUAGE` in Vercel).

### Master Template Registry:

| Template Name | Category | Parameters Required | Purpose |
|---|---|---|---|
| `welcome_promo_3hr` | Marketing | `{{1}}` = Customer Name | 3-Hour welcome offer after registration |
| `order_placed` | Utility | `{{1}}` = Customer Name, `{{2}}` = Total Amount, `{{3}}` = Tracking ID | Sent immediately on confirmed order |
| `payment_confirmed` | Utility | `{{1}}` = Order ID, `{{2}}` = Amount Paid | Sent when Easebuzz payment succeeds |
| `shipment_created` | Utility | `{{1}}` = Order ID, `{{2}}` = Courier Name, `{{3}}` = Tracking ID, `{{4}}` = AWB Code | Sent when courier label is generated |
| `shipment_picked` | Utility | `{{1}}` = Order ID, `{{2}}` = Tracking ID | Sent when courier picks up parcel |
| `in_transit` | Utility | `{{1}}` = Order ID, `{{2}}` = Tracking ID | Sent when parcel moves through hubs |
| `out_for_delivery` | Utility | `{{1}}` = Order ID, `{{2}}` = Tracking ID | Sent on morning of delivery |
| `delivered` | Utility | `{{1}}` = Order ID, `{{2}}` = Tracking ID | Sent upon successful delivery |
| `delivery_failed` | Utility | `{{1}}` = Order ID, `{{2}}` = Tracking ID | Sent if delivery attempt failed |
| `refund_initiated` | Utility | `{{1}}` = Order ID, `{{2}}` = Refund Amount | Sent on refund generation |
| `feedback_request` | Marketing | `{{1}}` = Customer Name, `{{2}}` = Order ID | Sent 60 days after purchase |
| `reorder_reminder` | Marketing | `{{1}}` = Customer Name | Sent 90 days after purchase |
| `abandoned_cart` | Marketing | `{{1}}` = Customer Name, `{{2}}` = Cart Total | Sent for abandoned carts (Day 2 & 9) |

---

## 8. Step 7: Vercel Environment Variables Checklist

Configure these variables in **Vercel Dashboard > Project Settings > Environment Variables**:

| Variable Name | Example Value | Description |
|---|---|---|
| `WHATSAPP_ENABLED` | `true` | Enables outbound messaging |
| `WHATSAPP_PHONE_NUMBER_ID` | `104857291827461` | From WhatsApp API Setup |
| `WHATSAPP_BUSINESS_ACCOUNT_ID` | `109283746501928` | From WhatsApp API Setup |
| `WHATSAPP_ACCESS_TOKEN` | `EAALoN...` *(Permanent)* | Generated from System User |
| `WHATSAPP_APP_SECRET` | `3a9f0e8b1...` | From Meta App Settings > Basic |
| `WHATSAPP_WEBHOOK_VERIFY_TOKEN` | `vyra-webhook-2026` | Custom string verified in Meta Webhook |
| `WHATSAPP_TEMPLATE_LANGUAGE` | `en` | Must match language chosen in Meta Manager |
| `CRON_SECRET` | `your-secure-random-token` | Protects `/api/cron/*` endpoints |

---

## 9. Step 8: Testing & Verification Procedure

### A. Testing the Conversational Bot
1. Send **"Hi"** to your registered WhatsApp Business Number.
2. You should receive the Vyra Herbals interactive Main Menu with buttons:
   * *Shop Products*
   * *My Orders*
   * *Track Order*
   * *Customer Support*
3. Test browsing by category, viewing product details, and tapping **Add to Cart**.
4. Test completing checkout with **Pay on Delivery (COD)** or **Pay Online (Easebuzz link)**.

### B. Testing the Sample Catalog
1. Open the WhatsApp chat with your Business number.
2. Tap the **Storefront / Catalog icon** next to the chat header.
3. Add a sample product to your WhatsApp native cart and tap **Send Cart to Business**.
4. Verify that the bot acknowledges the incoming cart order and immediately prompts: *"Where should we deliver it? Please tap below to add your address."*
5. Submit an address and confirm that the order draft transitions to payment.
