import { jsonLdString } from '@/utils/seo';

/**
 * Inline structured-data emitter.
 *
 * Renders as a plain `<script type="application/ld+json">` inside SSR HTML —
 * i.e. it is visible to Google's first-pass crawler without waiting for
 * client hydration, which is the whole point.
 *
 * Pass a single object or an array; arrays are emitted as one script per entry
 * so a malformed node can't invalidate the others.
 */
export default function JsonLd({ data }: { data: unknown | unknown[] }) {
  const items = Array.isArray(data) ? data : [data];
  return (
    <>
      {items.filter(Boolean).map((item, i) => (
        <script
          key={i}
          type="application/ld+json"
          // Content is JSON-only — serialised through jsonLdString which
          // escapes `<` to keep XSS via review/blog text off the table.
          dangerouslySetInnerHTML={{ __html: jsonLdString(item) }}
        />
      ))}
    </>
  );
}
