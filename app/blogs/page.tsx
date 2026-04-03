import Link from 'next/link';
import { headers } from 'next/headers';
import BlogFilters from '@/Components/Shared/BlogFilters';

async function getBaseUrl() {
  const envOrigin = process.env.NEXT_PUBLIC_SITE_ORIGIN;
  if (envOrigin) return envOrigin;

  const hdrs = await headers();
  const host = hdrs.get('x-forwarded-host') ?? hdrs.get('host');
  const protocol = hdrs.get('x-forwarded-proto') ?? 'http';

  if (!host) throw new Error('Unable to resolve host for blogs request');
  return `${protocol}://${host}`;
}

async function fetchBlogs(page = 1, limit = 12, category = '') {
  const url = new URL('/api/blogs', await getBaseUrl());
  url.searchParams.set('page', String(page));
  url.searchParams.set('limit', String(limit));
  if (category && category !== 'All') {
    url.searchParams.set('category', category);
  }

  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch blogs');

  const json = await res.json();
  return json;
}

export default async function BlogsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; category?: string }>;
}) {
  const resolvedParams = await searchParams;
  const page = parseInt(resolvedParams.page || '1');
  const category = resolvedParams.category || '';
  const data = await fetchBlogs(page, 12, category);
  const blogs = data.success ? data.data : [];

  return (
    <main className="blog-page">
      <section className="blog-home-header">
        <h1>Vyra Blogs</h1>
        <p>Know more about Fresh Ayurveda</p>
      </section>

      <BlogFilters />

      {blogs.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#666', marginTop: '40px' }}>No blog posts found for this category.</p>
      ) : (
        <div className="blog-grid">
          {blogs.map((b: any) => (
            <Link key={b.id} href={`/blogs/${b.handle}`} className="blog-card-link">
              <article className="blog-card">
                <div className="blog-card__image">
                  <img
                    src={b.image_url || '/assets/images/placeholder-blog.jpg'}
                    alt={b.title}
                    loading="lazy"
                  />
                </div>
                <div className="blog-card__meta">{b.category || ''}</div>
                <h2>{b.title}</h2>
                <p className="excerpt">{b.excerpt || 'Read our latest insights on Ayurvedic wellness and natural care.'}</p>
                <div className="blog-card__footer">
                  <span className="read-more">Read more</span>
                </div>
              </article>
            </Link>
          ))}
        </div>
      )}

      {data.pagination?.totalPages > 1 && (
        <div className="blog-pagination mt-5 d-flex justify-content-center gap-2">
          {/* simple pagination could go here */}
        </div>
      )}
    </main>
  );
}
