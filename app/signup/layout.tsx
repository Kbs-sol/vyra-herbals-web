import type { Metadata, Viewport } from 'next';

/**
 * Utility route — MUST NOT be in Google's index. Cart, checkout, login and
 * profile pages either contain personal data, duplicate content across
 * customers, or can never rank for a commercial query. Before this file
 * existed `robots.txt` only disallowed `/api/` and `/admin/`, so GSC was
 * seeing 88 impressions/month on /cart, 43 on /search, 24 on /login — all
 * wasted crawl budget.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: true, nocache: true },
};

export default function UtilityLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
