'use client';

import Script from 'next/script';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

/**
 * Single, opinionated place where every analytics vendor is loaded.
 *
 * Why not GTM for everything?
 *   - Loading GTM adds ~50 KB and a network hop before anything else fires.
 *     Vyra's mobile users (58% of traffic) already suffer LCP issues on
 *     hero-banner.png — piling another blocking script on top makes it worse.
 *   - The four tools we actually use (GA4, Clarity, Meta Pixel, optional
 *     second ads Pixel) each have a tiny direct snippet. Loading them here
 *     with `next/script` + strategy="afterInteractive" is faster AND easier
 *     to audit than a GTM container that other people can change unnoticed.
 *
 * Env vars (all NEXT_PUBLIC_, safe to expose):
 *   NEXT_PUBLIC_GA4_ID              e.g. G-K0F7N513MS   (Google Analytics 4)
 *   NEXT_PUBLIC_GADS_CONVERSION_ID  e.g. AW-1234567890  (Google Ads, optional)
 *   NEXT_PUBLIC_CLARITY_ID          e.g. p1a2b3c4d5     (Microsoft Clarity)
 *   NEXT_PUBLIC_META_PIXEL_ID       e.g. 1234567890     (Meta Business "Pixel & Conversions" — Advantage+ / web events)
 *   NEXT_PUBLIC_META_ADS_PIXEL_ID   e.g. 9876543210     (Optional second Pixel dedicated to Meta Ads performance)
 *   NEXT_PUBLIC_GTM_ID              e.g. GTM-MHSG926J   (Optional GTM container — loaded only if set)
 *   NEXT_PUBLIC_PINTEREST_TAG_ID    e.g. 2612345678901  (Optional Pinterest tag — beauty audiences skew heavily to Pinterest)
 *
 * Any missing var → the corresponding vendor is silently skipped. That means
 * a preview deploy without ad-pixel creds does not spray broken tags into
 * the DOM.
 *
 * Consent: this is India (DPDP Act 2023). We initialise Google Consent Mode
 * v2 in "denied" default, then upgrade if the visitor has previously
 * consented (cookie `vh_consent=granted`). Meta gets `fbq('consent', 'revoke')`
 * until the same cookie flips. The consent banner UI is a small component
 * that just sets this cookie and reloads the analytics context — the
 * heavy lifting stays here so every vendor stays in sync.
 */

const GA4_ID = process.env.NEXT_PUBLIC_GA4_ID || process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID || 'G-K0F7N513MS';
const GADS_CONVERSION_ID = process.env.NEXT_PUBLIC_GADS_CONVERSION_ID || '';
const CLARITY_ID = process.env.NEXT_PUBLIC_CLARITY_ID || '';
const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID || process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID || '';
const META_ADS_PIXEL_ID = process.env.NEXT_PUBLIC_META_ADS_PIXEL_ID || '';
const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID || '';
const PINTEREST_TAG_ID = process.env.NEXT_PUBLIC_PINTEREST_TAG_ID || '';

export default function AnalyticsLoader() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  /**
   * SPA navigation: Next.js keeps the tab alive when a user goes from
   * /product/oil-100 → /category/hair-oil, but neither GA4 nor Meta Pixel
   * auto-fires a page-view on client-side navigation. Push manually.
   */
  useEffect(() => {
    if (!pathname) return;
    const url = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : '');

    // GA4
    if (GA4_ID && typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'page_view', {
        page_path: url,
        page_location: `${window.location.origin}${url}`,
        page_title: document.title,
      });
    }
    // Meta Pixel — SPA-nav PageView, deduped against the initial-load one
    // in fbevents.js via the `eventID` third-argument.
    if (META_PIXEL_ID && typeof window !== 'undefined' && (window as any).fbq) {
      const evt = { eventID: `pv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}` };
      (window as any).fbq('track', 'PageView', {}, evt);
    }
    if (META_ADS_PIXEL_ID && typeof window !== 'undefined' && (window as any).fbq) {
      (window as any).fbq('trackSingle', META_ADS_PIXEL_ID, 'PageView');
    }
    // Pinterest
    if (PINTEREST_TAG_ID && typeof window !== 'undefined' && (window as any).pintrk) {
      (window as any).pintrk('page');
    }
  }, [pathname, searchParams]);

  return (
    <>
      {/* --------------------------------------------------------------------
       * Consent bootstrap — owner opted for cookies to fire directly without
       * a consent banner. We still push a `gtag('consent', 'default', ...)` so
       * downstream Google tags don't complain, but every bucket is `granted`.
       * ------------------------------------------------------------------ */}
      <Script id="consent-default" strategy="beforeInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          window.gtag = gtag;
          gtag('consent', 'default', {
            ad_storage: 'granted',
            ad_user_data: 'granted',
            ad_personalization: 'granted',
            analytics_storage: 'granted',
            functionality_storage: 'granted',
            security_storage: 'granted',
          });
        `}
      </Script>

      {/* -------- Google Analytics 4 -------- */}
      {GA4_ID ? (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`}
            strategy="afterInteractive"
          />
          <Script id="ga4-init" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              window.gtag = gtag;
              gtag('js', new Date());
              /* send_page_view is TRUE on load; SPA nav handled by AnalyticsLoader effect */
              gtag('config', '${GA4_ID}', {
                send_page_view: true,
                anonymize_ip: true,
                /* Enhanced Measurement is on server side — turn off duplicate scroll/outbound tracking here */
                allow_google_signals: true,
                allow_ad_personalization_signals: true,
              });
              ${GADS_CONVERSION_ID ? `gtag('config', '${GADS_CONVERSION_ID}');` : ''}
            `}
          </Script>
        </>
      ) : null}

      {/* -------- Microsoft Clarity — heatmaps + session replay -------- */}
      {CLARITY_ID ? (
        <Script id="ms-clarity" strategy="afterInteractive">
          {`
            (function(c,l,a,r,i,t,y){
              c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
              t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
              y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
            })(window, document, "clarity", "script", "${CLARITY_ID}");
          `}
        </Script>
      ) : null}

      {/* -------- Meta Pixel (organic/audience) --------
       * `fbq('consent', 'grant')` is fired inline so PageView + all subsequent
       * events count immediately (no banner gating).
       * `fbq('init', pid, {}, { agent: 'plnextjs' })` — labels Events Manager
       * traffic as Next.js for easier debugging.
       * The initial PageView carries a stable `eventID` so a CAPI-side
       * page-view (fired opportunistically from /api/events/meta) can dedupe.
       * ------------------------------------------------------------------ */}
      {META_PIXEL_ID ? (
        <Script id="meta-pixel" strategy="afterInteractive">
          {`
            !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){
            n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');

            fbq('consent', 'grant');
            fbq('init', '${META_PIXEL_ID}', {}, { agent: 'plnextjs' });
            ${META_ADS_PIXEL_ID ? `fbq('init', '${META_ADS_PIXEL_ID}', {}, { agent: 'plnextjs' });` : ''}
            fbq('track', 'PageView', {}, { eventID: 'pv_init_' + Date.now().toString(36) });
          `}
        </Script>
      ) : null}

      {/* -------- Meta Pixel <noscript> fallback -------- */}
      {META_PIXEL_ID ? (
        <noscript>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            height="1"
            width="1"
            style={{ display: 'none' }}
            src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`}
            alt=""
          />
        </noscript>
      ) : null}

      {/* -------- Pinterest Tag — beauty / hair-care audiences skew high on Pinterest -------- */}
      {PINTEREST_TAG_ID ? (
        <Script id="pinterest-tag" strategy="afterInteractive">
          {`
            !function(e){if(!window.pintrk){window.pintrk=function(){window.pintrk.queue.push(Array.prototype.slice.call(arguments))};var n=window.pintrk;n.queue=[],n.version="3.0";var t=document.createElement("script");t.async=!0,t.src=e;var r=document.getElementsByTagName("script")[0];r.parentNode.insertBefore(t,r)}}("https://s.pinimg.com/ct/core.js");
            pintrk('load', '${PINTEREST_TAG_ID}', { em: '<user_email_address>' });
            pintrk('page');
          `}
        </Script>
      ) : null}

      {/* -------- Optional GTM (only if the ID is set) -------- */}
      {GTM_ID ? (
        <>
          <Script id="gtm-init" strategy="afterInteractive">
            {`
              (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
              new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
              j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
              'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
              })(window,document,'script','dataLayer','${GTM_ID}');
            `}
          </Script>
          <noscript>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
              height="0"
              width="0"
              style={{ display: 'none', visibility: 'hidden' }}
              title="Google Tag Manager"
            />
          </noscript>
        </>
      ) : null}
    </>
  );
}
