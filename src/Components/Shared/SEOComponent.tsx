/**
 * Legacy SEO component — INTENTIONALLY A NO-OP.
 *
 * Previously wrapped `react-helmet` to inject <title> / <meta> tags after
 * client-side hydration. That approach was the SEO audit's #1 CRITICAL
 * finding: crawlers see the raw HTML *before* JS runs, so the client-injected
 * tags never made it into the first crawl. Every page shipped Google the
 * same generic root-layout title.
 *
 * The replacement is `export async function generateMetadata` at the route
 * level — see `app/product/[productHandle]/page.tsx` etc. Those files run on
 * the server and populate <head> in the pre-hydration HTML.
 *
 * This shim exists so we can leave the ~8 call-sites in PageComponents
 * unchanged. It renders nothing. Delete once every caller has migrated.
 */

// Kept the props shape identical to the old component so existing calls compile.
interface Props {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: string;
}

const SEOComponent: React.FC<Props> = () => null;
export default SEOComponent;
