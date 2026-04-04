import Link from 'next/link';
import { headers } from 'next/headers';
import { Badge } from 'react-bootstrap';

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
            <h1 className="display-4 fw-bold">Ayurvedic Wisdom & <br/>Wellness Insights</h1>
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
                      <p className="blog-card__excerpt">{b.excerpt || 'Discover the profound benefits of Ayurvedic rituals and how they can transform your daily self-care routine.'}</p>
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

      <style jsx>{`
        .blog-hero {
          padding: 6rem 0 4rem;
          background: linear-gradient(180deg, #f9fbf9 0%, #ffffff 100%);
          text-align: center;
        }
        .hero-content h1 {
          color: #1a1a1a;
          margin-bottom: 1.5rem;
          line-height: 1.1;
        }
        .blog-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
          gap: 2.5rem;
        }
        .blog-card {
          background: #fff;
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 10px 30px rgba(0,0,0,0.05);
          transition: all 0.4s cubic-bezier(0.165, 0.84, 0.44, 1);
          height: 100%;
          display: flex;
          flex-direction: column;
          border: 1px solid #f0f0f0;
        }
        .blog-card:hover {
          transform: translateY(-10px);
          box-shadow: 0 20px 40px rgba(0,0,0,0.1);
          border-color: var(--primary);
        }
        .blog-card__image-container {
          position: relative;
          height: 240px;
          overflow: hidden;
        }
        .blog-card__image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.6s ease;
        }
        .blog-card:hover .blog-card__image {
          transform: scale(1.05);
        }
        .blog-card__category {
          position: absolute;
          top: 1.5rem;
          left: 1.5rem;
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(4px);
          padding: 0.4rem 1.2rem;
          border-radius: 2rem;
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--primary);
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .blog-card__body {
          padding: 2rem;
          display: flex;
          flex-direction: column;
          flex-grow: 1;
        }
        .blog-details {
          margin-bottom: 0.8rem;
        }
        .blog-date {
          font-size: 0.8rem;
          color: #888;
          font-weight: 500;
        }
        .blog-card__title {
          font-size: 1.4rem;
          font-weight: 700;
          color: #1a1a1a;
          margin-bottom: 1rem;
          line-height: 1.4;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .blog-card__excerpt {
          color: #666;
          font-size: 0.95rem;
          line-height: 1.6;
          margin-bottom: 2rem;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .blog-card__footer {
          margin-top: auto;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 1.5rem;
          border-top: 1px solid #f5f5f5;
        }
        .read-more-btn {
          font-size: 0.9rem;
          font-weight: 700;
          color: #1a1a1a;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .arrow-icon {
          font-size: 1.2rem;
          transition: transform 0.3s ease;
        }
        .blog-card:hover .arrow-icon {
          transform: translateX(8px);
          color: var(--primary);
        }

        @media (max-width: 768px) {
          .blog-grid {
            grid-template-columns: 1fr;
          }
          .blog-hero {
            padding: 4rem 1rem 2rem;
          }
          .hero-content h1 {
            font-size: 2.2rem;
          }
        }
      `}</style>

      {data.pagination?.totalPages > 1 && (
        <div className="blog-pagination mt-5 d-flex justify-content-center gap-2">
          {/* simple pagination could go here */}
        </div>
      )}
    </main>
  );
}
