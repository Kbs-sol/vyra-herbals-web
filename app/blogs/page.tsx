import Link from 'next/link';
import { headers } from 'next/headers';

function getBaseUrl() {
  const envOrigin = process.env.NEXT_PUBLIC_SITE_ORIGIN;
  if (envOrigin) return envOrigin;

  const hdrs = headers();
  const host = hdrs.get('x-forwarded-host') ?? hdrs.get('host');
  const protocol = hdrs.get('x-forwarded-proto') ?? 'http';

  if (!host) throw new Error('Unable to resolve host for blogs request');
  return `${protocol}://${host}`;
}

async function fetchBlogs(page = 1, limit = 10) {
  const url = new URL('/api/blogs', getBaseUrl());
  url.searchParams.set('page', String(page));
  url.searchParams.set('limit', String(limit));

  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch blogs');

  const json = await res.json();
  return json;
}

export default async function BlogsPage() {
  const data = await fetchBlogs(1, 10);
  const blogs = data.success ? data.data : [];

  return (
    <main className="page container blog-page">
      <section className="blog-hero">
        <span className="blog-hero__pill">Vyra Journal</span>
        <h1>Fresh stories on hair, skin, and wellness</h1>
        <p>Read concise notes from the Vyra team—how we formulate, the rituals we trust, and the community voices we love to highlight.</p>
      </section>

      <div className="blog-grid">
        {blogs.length === 0 ? (
          <p className="blog-empty">No blog posts yet.</p>
        ) : (
          blogs.map((b: any) => (
            <Link key={b.id} href={`/blogs/${b.handle}`} className="blog-card-link">
              <article className="blog-card">
                {b.image_url && (
                  <div className="blog-card__image">
                    <img src={b.image_url} alt={b.title} />
                  </div>
                )}

                <div className="blog-card__meta">
                  <span>{b.author || 'Admin'}</span>
                  <span className="meta-dot" aria-hidden />
                  <span>{new Date(b.created_at).toLocaleDateString()}</span>
                </div>

                <h2>{b.title}</h2>

                <p className="excerpt">{b.excerpt}</p>

                <div className="blog-card__footer">
                  <span className="read-more">Read article →</span>
                </div>
              </article>
            </Link>
          ))
        )}
      </div>
    </main>
  );
}
