import type { Metadata, Viewport } from 'next';
import { Open_Sans } from 'next/font/google';
import Script from 'next/script';
import { Suspense } from 'react';
import { AuthProvider } from '@/Components/Contexts/AuthContext';
import { CartProvider } from '@/Components/Contexts/CartContext';
import { WishlistProvider } from '@/Components/Contexts/WishlistContext';
import Header from '@/Components/Common/Header';
import Footer from '@/Components/Common/Footer';
import ConditionalLayout from '@/Components/Common/ConditionalLayout';
import RouteChangeTracker from '@/Components/Common/RouteChangeTracker';
import { ToastContainer } from 'react-toastify';
import { Analytics } from '@vercel/analytics/next';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'react-toastify/dist/ReactToastify.css';
import '@/index.css';
import './globals.css';

import '../public/assets/fonts/flaticon/flaticon.css';
import '../public/assets/fonts/icofont/icofont.min.css';
import '../public/assets/fonts/fontawesome/fontawesome.min.css';
import '../public/assets/css/vendor/nice-select.min.css';
import '../public/assets/css/vendor/slick.min.css';
import '../public/assets/css/vendor/bootstrap.min.css';
import '../public/assets/css/custom/main.css';
import '../public/assets/css/custom/index.css';
import '../public/assets/css/custom/about.css';
import '../public/assets/css/custom/product-details.css';

const openSans = Open_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  style: ['normal', 'italic'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Vyra Herbals | Premium Herbal Hair & Skincare Products',
  description: 'Discover premium herbal hair care and skincare products made from 100% natural ingredients. Chemical-free, organic, and effective solutions for healthy hair and skin.',
  keywords: 'herbal hair oil, natural shampoo, hair care products, skincare, organic, chemical-free',
  icons: {
    icon: '/assets/images/vyra_favicon.jpg',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://vyraherbals.com',
    siteName: 'Vyra Herbals',
    title: 'Vyra Herbals | Premium Herbal Hair & Skincare Products',
    description: 'Discover premium herbal hair care and skincare products made from 100% natural ingredients.',
    images: [
      {
        url: 'https://vyraherbals.com/assets/images/banner/og-image.jpg',
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Vyra Herbals | Premium Herbal Hair & Skincare Products',
    description: 'Discover premium herbal hair care and skincare products made from 100% natural ingredients.',
  },
  robots: 'index, follow',
  authors: [{ name: 'Vyra Herbals' }],
  creator: 'Vyra Herbals',
  publisher: 'Vyra Herbals',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1.0,
  maximumScale: 1.0,
  userScalable: false,
};

/**
 * Google Tag Manager is the SINGLE analytics entry point for this site.
 *
 * GA4 (Google Analytics 4), Meta Pixel, Microsoft Clarity, Google Ads
 * conversion tags, and any other vendor tag are ALL configured inside the
 * GTM container itself (GTM-MHSG926J). Never hardcode a second copy of a
 * vendor snippet here — doing that fires every event twice and inflates
 * conversion counts in GA4 and Meta Ads Manager.
 *
 * Custom events are pushed via `src/utils/analytics.ts`, which writes to
 * `window.dataLayer`. GTM's triggers listen on that dataLayer and fan the
 * events out to every configured vendor.
 */
const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID || 'GTM-MHSG926J';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning={true}>
      <head>
        {/*
          Google Tag Manager — primes `window.dataLayer` before the loader
          script pushes `gtm.start`. `beforeInteractive` isn't allowed for
          inline <Script> outside `_document`, and `afterInteractive` is the
          documented placement for GTM in the Next.js App Router. Loading a
          split-second later is a fair trade-off for keeping GTM out of the
          critical rendering path.
        */}
        <Script id="gtm-datalayer-init" strategy="afterInteractive">
          {`window.dataLayer = window.dataLayer || [];`}
        </Script>
        <Script id="google-tag-manager" strategy="afterInteractive">
          {`
            (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','${GTM_ID}');
          `}
        </Script>
      </head>
      <body className={openSans.className} suppressHydrationWarning={true}>
        {/*
          GTM's <noscript> fallback. Per Google's install instructions this
          must be the FIRST child of <body> so it renders even when the
          bundle has not executed.
        */}
        <noscript>
          <iframe
            src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
            height="0"
            width="0"
            style={{ display: 'none', visibility: 'hidden' }}
          />
        </noscript>

        {/*
          App Router doesn't fire a full page load between client navigations,
          so GA4 / Meta Pixel / Clarity would only ever see the first URL.
          RouteChangeTracker pushes a `page_view` event to the dataLayer on
          every route change so GTM tags see the updated URL.
        */}
        <Suspense fallback={null}>
          <RouteChangeTracker />
        </Suspense>

        <AuthProvider>
          <CartProvider>
            <WishlistProvider>
              <ConditionalLayout>
                {children}
              </ConditionalLayout>
            </WishlistProvider>
          </CartProvider>
        </AuthProvider>
        {/* z-index above Bootstrap modal (1055) so errors during checkout are visible on mobile too */}
        <ToastContainer
          position="bottom-center"
          autoClose={4000}
          newestOnTop
          closeOnClick
          pauseOnHover
          draggable
          theme="light"
          style={{ zIndex: 99999 }}
        />
        <Analytics />
      </body>
    </html>
  );
}
