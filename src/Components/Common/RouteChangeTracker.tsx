'use client';

/**
 * RouteChangeTracker
 *
 * The Next.js App Router does not trigger a full page load between client
 * navigations. Without this component, GA4 / Meta Pixel / Microsoft Clarity
 * would only ever see the URL the user landed on — every subsequent page
 * they visit would be invisible.
 *
 * The component watches App Router navigation state and pushes a `page_view`
 * event to `window.dataLayer` after every route change. GTM tags for GA4
 * (`page_view`), Meta Pixel (`PageView`), and Clarity all listen on the
 * dataLayer, so a single push feeds every vendor at once.
 *
 * The Meta Pixel snippet and the GA4 `gtag` snippet are NOT loaded from the
 * app — both are configured inside GTM (container GTM-MHSG926J). See
 * `src/utils/analytics.ts` for the rationale.
 */

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { pageview } from '@/utils/analytics';

const RouteChangeTracker = () => {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!pathname) return;
    const query = searchParams?.toString();
    const url = query ? `${pathname}?${query}` : pathname;
    pageview(url);
  }, [pathname, searchParams]);

  return null;
};

export default RouteChangeTracker;
