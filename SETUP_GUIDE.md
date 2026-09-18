# Vyra Herbals - Complete Setup Guide

This guide covers the end-to-end setup of the Vyra Herbals e-commerce platform, including local development, database configuration, and production deployment.

## 1. Prerequisites

Before you begin, ensure you have the following installed and set up:
- **Node.js** (v18 or higher) & **npm**
- **Git**
- **Supabase Account**: For PostgreSQL database and authentication.
- **Easebuzz Account**: Merchant account for the payment gateway.
- **Message Central / WhatsApp API**: For WhatsApp automation and bot services.
- **Vercel Account**: Recommended for hosting the Next.js application.

## 2. Installation

Clone the repository and install the required dependencies:

```bash
# Navigate to the project directory
cd icarry-vyra-complete

# Install dependencies
npm install
```

## 3. Environment Variables

The project requires several environment variables to function properly. 
Create a `.env.local` file in the root of the project (for local development) and add the following keys. 

*Note: For production, these exact keys must be added directly into your Vercel project settings.*

```env
# ----------------------------------------
# 1. SUPABASE (Database & Auth)
# ----------------------------------------
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# ----------------------------------------
# 2. EASEBUZZ (Payment Gateway)
# ----------------------------------------
EASEBUZZ_KEY=your_easebuzz_merchant_key
EASEBUZZ_SALT=your_easebuzz_salt
EASEBUZZ_ENV=test # Change to 'prod' for production

# ----------------------------------------
# 3. WHATSAPP / MESSAGE CENTRAL
# ----------------------------------------
MESSAGE_CENTRAL_API_KEY=your_mc_api_key
WHATSAPP_PHONE_NUMBER_ID=your_whatsapp_number_id

# ----------------------------------------
# 4. APP CONFIGURATION
# ----------------------------------------
NEXT_PUBLIC_APP_URL=http://localhost:3000 # Change to your actual domain in production
CRON_SECRET=your_secure_cron_secret_string # Used for securing background cron jobs
```

## 4. Database Setup (Supabase)

Your Supabase PostgreSQL database needs the correct schema. 

1. Go to your Supabase project dashboard.
2. Navigate to the **SQL Editor**.
3. Run the migration scripts located in the `supabase/migrations/` and `database/migrations/` folders in sequential order.
4. Ensure the following core tables are created:
   - `users` & `user_addresses` (Authentication and profiles)
   - `products`, `categories`, `ingredients` (Catalog)
   - `orders`, `transactions`, `order_sessions` (Checkout)
   - `carts`, `anon_carts`, `abandoned_carts` (Cart tracking)
   - `communications_log`, `whatsapp_bot_sessions` (WhatsApp Bot)
   - `historical_leads` (Lead Generation)
5. **Row Level Security (RLS)**: Ensure RLS policies are enabled where necessary so clients can only read/write their own data, while the Service Role Key handles admin tasks.

## 5. Running the Application Locally

Start the development server:

```bash
npm run dev
```

The storefront will be accessible at `http://localhost:3000`.
The admin dashboard will be accessible at `http://localhost:3000/admin/login`.

## 6. Production Deployment (Vercel)

The recommended hosting platform for this Next.js app is Vercel.

1. Push your code to a GitHub, GitLab, or Bitbucket repository.
2. Log in to Vercel and click **Add New... > Project**.
3. Import your repository.
4. In the **Environment Variables** section, copy and paste all the keys from your `.env.local` file.
5. Click **Deploy**.
6. Once deployed, update your `NEXT_PUBLIC_APP_URL` in Vercel to match your new production domain.

## 7. Post-Deployment Checks
- **Webhooks**: Configure Easebuzz to send successful payment webhooks to `https://your-domain.com/api/payment/success`.
- **WhatsApp Webhooks**: Point your Message Central/WhatsApp webhook URL to `https://your-domain.com/api/webhooks/whatsapp`.
- **Cron Jobs**: Vercel handles cron jobs via `vercel.json`. Ensure your `CRON_SECRET` is set in Vercel so the automated abandoned cart recoveries can fire securely.
