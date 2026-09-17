import Link from 'next/link';
import { headers } from 'next/headers';
import { Badge } from 'react-bootstrap';
import '@/../public/assets/css/custom/blog-listing.css';

async function getBaseUrl() {
  const envOrigin = process.env.NEXT_PUBLIC_SITE_ORIGIN;
  if (envOrigin) return envOrigin;

  const hdrs = await headers();
  const host = hdrs.get('x-forwarded-host') ?? hdrs.get('host');
  const protocol = hdrs.get('x-forwarded-proto') ?? 'http';

  if (!host) throw new Error('Unable to resolve host for blogs request');
  return `${protocol}://${host}`;
}

async function fetchBlogs(page = 1, limit = 12) {
  const url = new URL('/api/blogs', await getBaseUrl());
  url.searchParams.set('page', String(page));
  url.searchParams.set('limit', String(limit));

  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch blogs');

  const json = await res.json();
  return json;
}

export default async function BlogsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const resolvedParams = await searchParams;
  const page = parseInt(resolvedParams.page || '1');
  const data = await fetchBlogs(page, 12);
  const blogs = data.success ? data.data : [];

  return (
    <main className="blog-page">
      <section className="blog-hero">
        <div className="container">
          <div className="hero-content">
            <Badge pill bg="success" className="mb-3 px-3 py-2">Our Journal</Badge>
            <h1 className="display-4 fw-bold">Natural Herbal Hair Care <br/>Guides & Wellness Insights</h1>
            <p className="lead text-muted">Explore the ancient secrets of beauty and health, <br/>curated for the modern lifestyle.</p>
          </div>
        </div>
      </section>

      <section className="blog-section py-5">
        <div className="container">
          {blogs.length === 0 ? (
            <div className="text-center py-5">
               <img src="/assets/images/empty-blog.svg" alt="No blogs" style={{ width: '200px', opacity: 0.5 }} className="mb-4" />
               <h3 className="text-muted">No stories found just yet.</h3>
               <p>We are currently brewing some herbal wisdom for you!</p>
            </div>
          ) : (
            <div className="blog-grid">
              {blogs.map((b: any) => (
                <Link key={b.id} href={`/blogs/${b.handle}`} className="blog-card-link">
                  <article className="blog-card">
                    <div className="blog-card__image-container">
                      <img
                        src={b.image_url || '/assets/images/placeholder-blog.jpg'}
                        alt={b.title}
                        loading="lazy"
                        className="blog-card__image"
                      />
                      <div className="blog-card__category">{b.category || 'Wellness'}</div>
                    </div>
                    <div className="blog-card__body">
                      <div className="blog-details">
                        <span className="blog-date">{new Date(b.created_at || Date.now()).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                      </div>
                      <h3 className="blog-card__title">{b.title}</h3>
                      <p className="blog-card__excerpt">{b.excerpt || 'Discover how 100% natural handmade herbal rituals — rooted in India\'s traditional hair-care wisdom — transform your daily self-care routine.'}</p>
                      <div className="blog-card__footer">
                        <span className="read-more-btn">Read Story</span>
                        <div className="arrow-icon">→</div>
                      </div>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {data.pagination?.totalPages > 1 && (
        <div className="blog-pagination mt-5 d-flex justify-content-center gap-2">
          {/* simple pagination could go here */}
        </div>
      )}
    </main>
  );
}
