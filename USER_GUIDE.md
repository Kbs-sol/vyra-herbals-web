# Vyra Herbals - Project & User Guide

Welcome to the Vyra Herbals e-commerce platform. This system is a highly automated, modern Next.js web application designed to maximize conversions through seamless checkouts and advanced WhatsApp integrations.

This guide explains the core modules of the project and how to use them.

---

## 1. Storefront & Customer Experience

The customer-facing application is optimized for speed and frictionless purchasing.

### GoKwik-Style Checkout Gate
We have eliminated traditional, tedious sign-up forms. 
- **Guest Browsing:** Customers can freely browse products and add them to their cart without logging in. Their cart is saved securely to their device for 90 days.
- **1-Click OTP Login:** When clicking "Proceed to Checkout", users are presented with a clean popup asking *only* for their 10-digit mobile number. An instant SMS OTP is sent.
- **Smart Address Skipping:** If the user is a returning customer, the system logs them in, auto-selects their default address, and bypasses the address form entirely, dropping them straight at the "Confirm & Pay" screen.
- **Cart Merging:** If a user builds a cart anonymously and then logs in, their anonymous items are automatically merged with their permanent account.

### Wishlists
Users can save their favorite items to a wishlist. These metrics are tracked in the backend and used for the Lead Generation engine to retarget users.

---

## 2. Admin Dashboard Overview

Access the admin panel by navigating to `/admin/login`. 
This is your command center for managing the business.

### A. Business Intelligence & Lead Generation
Located in the **Business Intel** tab, this is your primary data analytics page.
- **Top Metrics:** Track Gross Revenue, Average Order Value (AOV), and splits between Web vs. WhatsApp orders and Prepaid vs. COD payments.
- **Revenue Trend:** A 30-day visual graph of your daily revenue.
- **Lead Generation Engine:** The system automatically categorizes your traffic into actionable lead buckets:
  - **🔥 Hot Leads:** Cart abandoners (users who entered their phone but didn't pay).
  - **🟡 Warm Leads:** Users with items in their wishlist, or users who interacted with the WhatsApp bot but dropped off.
  - **❄️ Cold Leads:** Imported historical leads from past CSVs.
- **Action:** Click "Broadcast Recovery Campaign" on any of these buckets to immediately send a targeted WhatsApp message to that exact group.

### B. Order Management
Located in the **Orders** tab.
- Track the lifecycle of all orders (Pending -> Placed -> Processing -> Shipped -> Delivered).
- Updating an order's status here automatically triggers the WhatsApp Automation Engine to notify the customer of their new delivery status.

### C. WhatsApp Broadcast Center
Located in the **WhatsApp** tab.
- **Send Mass Campaigns:** Target specific segments (like "All Customers", "Abandoned Carts", or "Historical Leads").
- **Templates:** Use pre-approved WhatsApp templates to send promotional offers or recovery links.
- **Dry Run:** Always use the "Dry Run" feature before a massive broadcast to ensure your recipient count and message formatting are correct.

### D. Historical Leads Importer
If you have data from old platforms (Shopify, WooCommerce, Excel sheets), you can upload a CSV to the **Historical Leads** importer. These users are safely added to your database and can be targeted via the Cold Leads broadcast bucket.

---

## 3. WhatsApp Automation (Dual-Engine)

The platform features a deeply integrated WhatsApp engine that acts as both a customer service bot and a transactional notification system.

### Transactional Notifications (Outbound)
The system automatically messages customers on your behalf when:
- An order is placed successfully.
- An order is marked as "Shipped" (including tracking links).
- An order is marked as "Delivered".
- An abandoned cart is detected (automatically recovers lost sales after a set delay).

### The WhatsApp Bot (Inbound)
If a customer messages your WhatsApp Business number, an automated bot will reply.
- **Shopping Flow:** Customers can browse categories, view product listings, and add items to a cart entirely within WhatsApp.
- **Checkout:** The bot generates a draft order and sends a secure "Pay Online" link. If they click it, they are routed through the Easebuzz payment gateway. Upon success, the bot confirms the order.
- **Order Tracking:** Customers can type "Track my order" to get real-time updates on their shipments without needing human support.

---

## 4. Payment Workflows

- **Prepaid (Online):** Powered by Easebuzz. The system hashes the transaction securely. If a user drops off during payment, it is tracked as a "Payment Failed" hot lead.
- **Cash on Delivery (COD):** COD orders support advanced logic, such as requiring a small advance payment (configured in constants) before the order is confirmed, ensuring serious buyers and reducing Return-to-Origin (RTO) costs.

---

## 5. Routine Maintenance & Tips

- **Updating Banners/Featured Products:** Use the `Featured` and `Products` tabs in the Admin panel to control what displays on the homepage.
- **Monitoring Bot Health:** You can view live bot sessions and intervene if a customer is stuck by checking the logs in the WhatsApp admin tab.
- **Environment Variables:** Never share your `.env.local` file. If you rotate your Easebuzz or Supabase keys, update them immediately in Vercel to prevent downtime.
