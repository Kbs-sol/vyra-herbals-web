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
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import 'bootstrap/dist/css/bootstrap.min.css';
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

import FacebookPixel from '@/Components/Common/FacebookPixel';

const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID || 'GTM-MHSG926J';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning={true}>
      <head>
        {/* Google Tag Manager */}
        <Script id="google-tag-manager" strategy="afterInteractive">
          {`
            (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','${GTM_ID}');
          `}
        </Script>

        {/* Google Analytics */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-K0F7N513MS"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());

            gtag('config', 'G-K0F7N513MS');
          `}
        </Script>

        {/* Facebook Pixel */}
        <Suspense fallback={null}>
          <FacebookPixel />
        </Suspense>

        {/* External Stylesheets are now imported at the top of the file as per Next.js best practices */}
      </head>
      <body className={openSans.className} suppressHydrationWarning={true}>
        {/* Google Tag Manager (noscript) */}
        <noscript>
          <iframe
            src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
            height="0"
            width="0"
            style={{ display: 'none', visibility: 'hidden' }}
          />
        </noscript>

        <AuthProvider>
          <CartProvider>
            <WishlistProvider>
              <ConditionalLayout>
                {children}
              </ConditionalLayout>
            </WishlistProvider>
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
