# Meta WhatsApp Message Templates — Setup Guide for Store Owner

This guide contains the exact template names and message bodies that must be submitted for approval in **Meta WhatsApp Manager** to enable automated WhatsApp notifications for **Vyra Herbals**.

---

## Instructions for Meta WhatsApp Manager

1. Log in to [Meta Business Suite](https://business.facebook.com/) -> **WhatsApp Manager**.
2. Go to **Account tools** -> **Message templates**.
3. Click **Create template** for each of the templates listed below.
4. Set **Category**, **Language: English (en)**, and the exact **Template Name** (lowercase with underscores).
5. Paste the body text and click **Submit**.

---

## 1. Welcome Offer (Sent 3 hours after registration)
- **Template Name**: `welcome_promo_3hr`
- **Category**: Marketing
- **Language**: English (`en`)
- **Body Text**:
```text
Hi {{1}}, welcome to the Vyra Herbals family! 🌿

At Vyra Herbals, we believe in the power of pure, traditional natural ingredients to transform your hair care journey. From root nourishment to natural shine, our formulations are crafted with truth in every drop.

Explore our pure hair oils, natural shampoos, and neem scalp care essentials today: https://vyraherbals.com
```

---

## 2. Order Placed & Tracking Confirmation
- **Template Name**: `order_placed`
- **Category**: Utility
- **Language**: English (`en`)
- **Body Text**:
```text
Good news! 🎉 Your Vyra Herbals order is confirmed!💚

Hi {{1}}, your order for Rs {{2}} has been successfully placed.

📦 *Tracking ID:* {{3}}

You can use your tracking ID to check your order status.

Thank you for choosing Vyra Herbals🌿
```
- **Buttons**: Add a "Call to Action" button. 
  - Type: **Visit Website**
  - Button Text: **Track Order**
  - URL Type: **Dynamic**
  - Base URL: `https://www.icarry.in/track-shipment?awb=`
  - (When adding the button, Meta will automatically append `{{1}}` to the URL. The system will automatically inject the AWB Number there).

---

## 4. 2-Month Hair Care Check-in (Sent 60 days after order)
- **Template Name**: `feedback_request`
- **Category**: Utility (or Marketing)
- **Language**: English (`en`)
- **Body Text**:
```text
Hi {{1}}, it's been 2 months since your Vyra Herbals order #{{2}}!

We hope your hair is feeling stronger, healthier, and naturally nourished. We'd love to hear about your experience! Share your feedback with our community: https://vyraherbals.com/testimonials
```

---

## 5. 3-Month Replenishment Reminder (Sent 90 days after order)
- **Template Name**: `reorder_reminder`
- **Category**: Utility (or Marketing)
- **Language**: English (`en`)
- **Body Text**:
```text
Hi {{1}}, consistency is key to long-term hair health! 🌿

Running low on your favorite Vyra Herbals routine? Replenish your natural hair care products today to keep your scalp nourished: https://vyraherbals.com
```

---

## 6. Courier Delivery Updates (Utility Category)

### a. Out for Delivery
- **Template Name**: `out_for_delivery`
- **Category**: Utility
- **Language**: English (`en`)
- **Body Text**:
```text
Your Vyra Herbals order #{{1}} is out for delivery today. Please keep your phone handy for the courier agent. Tracking ID: {{2}}
```

### b. Delivered
- **Template Name**: `delivered`
- **Category**: Utility
- **Language**: English (`en`)
- **Body Text**:
```text
Your Vyra Herbals order #{{1}} has been delivered successfully! Reference ID: {{2}}. Thank you for choosing natural care with Vyra Herbals!
```
