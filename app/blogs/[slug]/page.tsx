import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Link from 'next/link';
import {
  blogPostingJsonLd,
  breadcrumbJsonLd,
  buildBlogMetadata,
  FOUNDER,
  SITE_URL,
  type SeoBlogPost,
} from '@/utils/seo';
import JsonLd from '@/Components/Shared/JsonLd';
import '../../../public/assets/css/custom/blogs_redesign.css';

async function getBaseUrl() {
  const envOrigin = process.env.NEXT_PUBLIC_SITE_ORIGIN;
  if (envOrigin) return envOrigin;

  const hdrs = await headers();
  const host = hdrs.get('x-forwarded-host') ?? hdrs.get('host');
  const protocol = hdrs.get('x-forwarded-proto') ?? 'http';

  if (!host) throw new Error('Unable to resolve host for blog request');
  return `${protocol}://${host}`;
}

async function fetchBlog(slug: string) {
  const url = new URL('/api/blogs', await getBaseUrl());
  url.searchParams.set('slug', slug);

  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch blog');

  const json = await res.json();
  return json;
}

async function fetchRecentBlogs(limit = 3) {
  const url = new URL('/api/blogs', await getBaseUrl());
  url.searchParams.set('limit', String(limit));

  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) return [];

  const json = await res.json();
  return json.success ? json.data : [];
}

function LearnMoreSection({ items }: { items: any[] }) {
  if (!items || items.length === 0) return null;
  return (
    <section className="learn-more-section">
      <h3>Learn more</h3>
      <div className="learn-more-grid">
        {items.map((r) => (
          <Link key={r.id} className="blog-card-vertical" href={`/blogs/${r.handle}`}>
            <div className="img-wrap">
              <img src={r.image_url || '/assets/images/placeholder-blog.jpg'} alt={r.title} loading="lazy" />
            </div>
            <h4>{r.title}</h4>
            <span className="read-link">Read blog</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  try {
    const result = await fetchBlog(slug);
    if (result?.success && result?.data) {
      return buildBlogMetadata({ ...result.data, handle: result.data.handle || slug } as SeoBlogPost);
    }
  } catch {
    /* fall through to default */
  }
  return {
    title: 'Blog — Vyra Herbals',
    description: 'Natural, handmade herbal hair-care insights and how-to guides from Vyra Herbals.',
    alternates: { canonical: `${SITE_URL}/blogs/${encodeURIComponent(slug)}` },
  };
}

export default async function BlogDetail({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params;
  const slug = resolvedParams.slug;
  const result = await fetchBlog(slug);

  if (!result.success || !result.data) {
    notFound();
  }

  const blog = result.data;
  // Founder byline is the E-E-A-T signal — the audit calls this out as one of
  // the top wins we can layer on top of existing content.
  const authorName = blog.author || FOUNDER.name;

  const jsonLd = [
    blogPostingJsonLd({ ...blog, handle: blog.handle || slug, author: authorName } as SeoBlogPost),
    breadcrumbJsonLd([
      { name: 'Home', url: '/' },
      { name: 'Blog', url: '/blogs' },
      { name: blog.title, url: `/blogs/${blog.handle || slug}` },
    ]),
  ];
  // If related posts are not manually set, fetch the most recent ones for "Learn More"
  let learnMoreItems = blog.related_posts_data || [];
  if (learnMoreItems.length === 0) {
    learnMoreItems = await fetchRecentBlogs(3);
    // Filter out the current blog
    learnMoreItems = learnMoreItems.filter((item: any) => item.id !== blog.id).slice(0, 3);
  }

  return (
    <main className="blogs-container pt-4 pb-4">
      <JsonLd data={jsonLd} />
      <div className="back-btn-wrap">
        <Link href="/blogs" className="back-btn">
          <span>←</span> BACK
        </Link>
      </div>

      <article className="blog-detail-redesign">
        <header className="blog-detail-header-redesign">
          <div className="blog-detail-image-wrap">
            <img
              src={blog.image_url || '/assets/images/placeholder-blog.jpg'}
              alt={blog.title}
            />
          </div>

          <div className="blog-detail-info">
            <h1>{blog.title}</h1>
            <p className="subtitle">{blog.excerpt || 'Natural herbal hair-care insights for your wellness journey.'}</p>
            <p className="author">By {authorName}</p>
          </div>
        </header>

        <section className="blog-content content pt-4">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{blog.content || blog.excerpt || ''}</ReactMarkdown>
        </section>

        <LearnMoreSection items={learnMoreItems} />
      </article>
    </main>
  );
}
