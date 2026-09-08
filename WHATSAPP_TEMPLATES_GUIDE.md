# WhatsApp Template Configuration Guide

This guide is for the store owner and developers configuring WhatsApp templates in the Meta Business Manager.

Because the Vyra Herbals backend communicates with the Meta Cloud API to automatically send order notifications, the templates configured in Meta **must strictly match** the parameters expected by the codebase. Any deviation will result in Meta rejecting the messages.

---

## 1. Mismatched Languages
**Error Code:** `(#132001) Template name does not exist in the translation`

By default, the codebase sends templates using the language code **`en`** (English).

When creating a template in Meta Business Manager, Meta often defaults to regional English like `English (US)` (`en_US`) or `English (UK)` (`en_GB`). 
*   **The Fix:** You must create the templates explicitly under the exact language `English` (`en`). If you must use `en_US` or another locale, you need to update the `WHATSAPP_TEMPLATE_LANGUAGE` environment variable in Vercel to match.

---

## 2. Parameter Mismatch
**Error Code:** `(#131008) Required parameter is missing` or `(#131009) Parameter format does not match`

The Meta API relies on positional parameters (`{{1}}`, `{{2}}`, etc.). You must ensure that the number of variables in your template body exactly matches the number of variables the backend sends.

### ORDER_PLACED Template Requirements
The backend currently sends **exactly 3 body parameters** and **1 button parameter** for the `order_placed` event.

**Body Text Configuration:**
Your message body in Meta must have exactly three variables:
*   `{{1}}` - Maps to **Customer Name**
*   `{{2}}` - Maps to **Order Amount** (Rupees)
*   `{{3}}` - Maps to **Tracking ID / AWB Number**

*Example Body:*
```text
Good news! 🎉 Your Vyra Herbals order is confirmed!💚

Hi {{1}}, your order for Rs {{2}} has been successfully placed.

📦 *Tracking ID:* {{3}}

You can use your tracking ID to check your order status.

Thank you for choosing Vyra Herbals🌿
```

**Dynamic Button Configuration:**
If you want to include the tracking link, add a **Call-To-Action (URL)** button:
*   **Type:** Dynamic URL
*   **Button Text:** `Track Shipment` (or similar)
*   **URL:** `https://www.icarry.in/track-shipment?awb={{1}}`
*(The backend sends the AWB code specifically to fill `{{1}}` in this button).*

### What happens if I add a Photo (Media Header)?
If you edit the template and add a **Header > Media > Image**, Meta marks that template as requiring an image component via the API. 
Because the backend is currently configured **not to send images**, adding a photo to the template in Meta will instantly break the automation, and you will see the error `(#131008) Required parameter is missing`.

*   **The Fix:** Remove the Media Header (Photo) from the template in Meta Business Manager. Set the Header to either "None" or "Text". (If you want to use photos in the future, a developer will need to uncomment the image support in the codebase and configure an image URL).

---

## 3. Renaming Templates

If you delete a template and create a new one with a different name (e.g., changing `payment_confirmed` to `payment_success`), the backend will not automatically know the new name.

*   **The Fix:** Update the Vercel environment variables to point to the new template names.
    *   `WHATSAPP_TEMPLATE_ORDER_PLACED` (defaults to `order_placed`)
    *   `WHATSAPP_TEMPLATE_PAYMENT_CONFIRMED` (defaults to `payment_confirmed`)
    *   `WHATSAPP_TEMPLATE_SHIPMENT_CREATED` (defaults to `shipment_created`)
