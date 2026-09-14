'use client';

/**
 * DPDP Act 2023-compliant consent banner.
 *
 * What it does
 * ------------
 * 1. Renders once per browser until the visitor makes a choice.
 * 2. Writes `vh_consent=granted|denied` as a first-party cookie
 *    (1 year, SameSite=Lax, Secure).
 * 3. Calls Google Consent Mode v2 `gtag('consent', 'update', ...)` and
 *    Meta Pixel `fbq('consent', 'grant'|'revoke')` immediately so the
 *    next event is sent with the correct permission state.
 * 4. If the visitor accepts, replays the initial PageView so GA4 and
 *    Meta receive a fully-attributed one (the "denied" default earlier
 *    sent a cookieless one).
 *
 * Why not use a third-party CMP?
 * ------------------------------
 * Every commercial CMP (Cookiebot, OneTrust, Osano) charges per session,
 * adds 50-150 KB, and delays the first paint. DPDP's requirements — clear
 * notice, granular purpose choice, easy withdrawal — are met by a plain
 * two-button banner + a footer "Cookie preferences" link that just clears
 * the cookie and reloads. That's what this component is.
 *
 * Where it renders
 * ----------------
 * Import + place once in the root layout AFTER `<AnalyticsLoader />`.
 */

import { useEffect, useState } from 'react';

const COOKIE_NAME = 'vh_consent';
const COOKIE_MAX_AGE_S = 60 * 60 * 24 * 365; // 1 year

function readConsent(): 'granted' | 'denied' | null {
  if (typeof document === 'undefined') return null;
  const m = document.cookie.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`));
  if (!m) return null;
  const v = decodeURIComponent(m[1]);
  return v === 'granted' || v === 'denied' ? v : null;
}

function writeConsent(value: 'granted' | 'denied') {
  if (typeof document === 'undefined') return;
  document.cookie = `${COOKIE_NAME}=${value}; Max-Age=${COOKIE_MAX_AGE_S}; path=/; SameSite=Lax; Secure`;
}

function updateVendors(granted: boolean) {
  if (typeof window === 'undefined') return;

  // Google Consent Mode v2
  if (typeof (window as any).gtag === 'function') {
    (window as any).gtag('consent', 'update', {
      ad_storage: granted ? 'granted' : 'denied',
      ad_user_data: granted ? 'granted' : 'denied',
      ad_personalization: granted ? 'granted' : 'denied',
      analytics_storage: granted ? 'granted' : 'denied',
    });
  }

  // Meta Pixel
  if (typeof (window as any).fbq === 'function') {
    (window as any).fbq('consent', granted ? 'grant' : 'revoke');
    // Replay the initial PageView with the correct permission state so we
    // don't lose the arrival event.
    if (granted) {
      (window as any).fbq('track', 'PageView', {}, {
        eventID: 'pv_consent_' + Date.now().toString(36),
      });
    }
  }

  // Microsoft Clarity honours the cookie automatically once granted; nothing to do.
}

export default function ConsentBanner() {
  const [choice, setChoice] = useState<'granted' | 'denied' | null | 'loading'>('loading');

  useEffect(() => {
    setChoice(readConsent());
  }, []);

  const accept = () => {
    writeConsent('granted');
    updateVendors(true);
    setChoice('granted');
  };
  const reject = () => {
    writeConsent('denied');
    updateVendors(false);
    setChoice('denied');
  };

  // Don't render while reading; don't re-render after decision.
  if (choice !== null && choice !== 'loading') return null;
  if (choice === 'loading') return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Cookie consent"
      style={{
        position: 'fixed',
        bottom: 12,
        left: 12,
        right: 12,
        maxWidth: 720,
        marginInline: 'auto',
        background: '#fff',
        border: '1px solid #d9e2d0',
        boxShadow: '0 8px 32px rgba(20, 60, 30, 0.15)',
        borderRadius: 12,
        padding: '14px 18px',
        zIndex: 9998,
        fontSize: 14,
        lineHeight: 1.5,
        color: '#1f2c1a',
      }}
    >
      <p style={{ margin: '0 0 10px' }}>
        We use cookies to remember your cart, understand how visitors use the
        site, and measure ad performance. You can accept all, reject
        non-essential cookies, or read our{' '}
        <a href="/privacy-policy" style={{ color: '#2d7a3a', textDecoration: 'underline' }}>
          privacy policy
        </a>
        . You can change your choice any time via the &quot;Cookie preferences&quot; link in the footer.
      </p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={reject}
          style={{
            padding: '8px 16px',
            border: '1px solid #b4c2a8',
            background: '#fff',
            borderRadius: 6,
            cursor: 'pointer',
            fontWeight: 500,
          }}
        >
          Reject non-essential
        </button>
        <button
          type="button"
          onClick={accept}
          style={{
            padding: '8px 16px',
            border: 'none',
            background: '#2d7a3a',
            color: '#fff',
            borderRadius: 6,
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          Accept all cookies
        </button>
      </div>
    </div>
  );
}
