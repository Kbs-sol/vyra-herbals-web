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
import { ToastContainer } from 'react-toastify';
import JsonLd from '@/Components/Shared/JsonLd';
import AnalyticsLoader from '@/Components/Common/AnalyticsLoader';
import ConsentBanner from '@/Components/Common/ConsentBanner';
import { organizationJsonLd, websiteJsonLd, localBusinessJsonLd, SITE_URL, BRAND_DEFAULT_DESCRIPTION } from '@/utils/seo';
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

// Root metadata: acts as a fallback + template for pages that do not export
// their own `generateMetadata`. Product / category / blog pages override each
// field with a specific value — that's where the SEO win is.
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Vyra Herbals | Herbal Hair Care — Ayurvedic, ISO & GMP Certified',
    // %s comes from child `title` strings (e.g. product name). Non-overriding
    // pages fall back to `default`.
    template: '%s',
  },
  description: BRAND_DEFAULT_DESCRIPTION,
  keywords: ['herbal hair oil', 'natural shampoo', 'ayurvedic hair care', 'rosemary hair oil', 'chemical free', 'sulphate free shampoo', 'GMP certified', 'ISO 9001:2015'],
  icons: { icon: '/assets/images/vyra_favicon.jpg' },
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: SITE_URL,
    siteName: 'Vyra Herbals',
    title: 'Vyra Herbals | Herbal Hair Care — Ayurvedic, ISO & GMP Certified',
    description: BRAND_DEFAULT_DESCRIPTION,
    images: [{ url: '/assets/images/banner/og-image.jpg', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Vyra Herbals | Herbal Hair Care',
    description: BRAND_DEFAULT_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  authors: [{ name: 'Sahera Banu' }],
  creator: 'Vyra Herbals',
  publisher: 'Vyra Herbals',
  alternates: { canonical: SITE_URL },
  formatDetection: { email: false, address: false, telephone: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1.0,
  // Note: removed `maximumScale: 1` and `userScalable: false` — pinch-zoom is
  // an accessibility win (WCAG 1.4.4). Google's Lighthouse a11y audit flags
  // sites that disable it, and mobile is 58% of Vyra's traffic.
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning={true}>
      <head>
        {/*
         * Structured data emitted at the root. Every page inherits Organization
         * + WebSite JSON-LD (the audit reported ZERO schema sitewide — this is
         * the sitewide fix). Product / category / blog pages layer their own
         * schema on top via <JsonLd />.
         */}
        <JsonLd data={[organizationJsonLd(), websiteJsonLd(), localBusinessJsonLd()]} />
        {/*
         * Preconnect the third-party origins that render on the first
         * paint. Each one saves ~100–200 ms of DNS+TLS on mobile.
         */}
        <link rel="preconnect" href="https://www.googletagmanager.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://connect.facebook.net" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://fonts.googleapis.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://www.facebook.com" />
        <link rel="dns-prefetch" href="https://www.clarity.ms" />
        {/* PWA manifest + theme color for Chrome/Safari address bar + Android install prompt */}
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="theme-color" content="#2d7a3a" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Vyra Herbals" />
      </head>
      <body className={openSans.className} suppressHydrationWarning={true}>
        {/*
         * Unified analytics loader — GA4, Microsoft Clarity, Meta Pixel and
         * (optionally) a second ads pixel are all initialised from one place.
         * Reads config from NEXT_PUBLIC_* env vars; missing values silently
         * skip that tool so a dev instance doesn't spray broken script tags.
         */}
        <Suspense fallback={null}>
          <AnalyticsLoader />
        </Suspense>
        {/* DPDP Act 2023 consent banner — renders once until the visitor
         * chooses accept or reject. Wired to Google Consent Mode v2 and
         * Meta Pixel's `fbq('consent', ...)`. */}
        <ConsentBanner />

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
      </body>
    </html>
  );
}
