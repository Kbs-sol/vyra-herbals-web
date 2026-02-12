import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

function getBaseUrl() {
  const envOrigin = process.env.NEXT_PUBLIC_SITE_ORIGIN;
  if (envOrigin) return envOrigin;

  const hdrs = headers();
  const host = hdrs.get('x-forwarded-host') ?? hdrs.get('host');
  const protocol = hdrs.get('x-forwarded-proto') ?? 'http';

  if (!host) throw new Error('Unable to resolve host for blog request');
  return `${protocol}://${host}`;
}

async function fetchBlog(slug: string) {
  const url = new URL('/api/blogs', getBaseUrl());
  url.searchParams.set('slug', slug);

  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch blog');

  const json = await res.json();
  return json;
}

function RelatedList({ items }: { items: any[] }) {
  if (!items || items.length === 0) return null;
  return (
    <aside className="related-posts">
      <h3>Related Posts</h3>
      <div className="related-grid">
        {items.map((r) => (
          <a key={r.id} className="related-item" href={`/blogs/${r.handle}`}>
            {r.image_url ? <img src={r.image_url} alt={r.title} /> : <div className="thumb-placeholder" />}
            <div className="related-title">{r.title}</div>
          </a>
        ))}
      </div>
    </aside>
  );
}

export default async function BlogDetail({ params }: { params: { slug: string } }) {
  const slug = params.slug;
  const result = await fetchBlog(slug);

  if (!result.success || !result.data) {
    notFound();
  }

  const blog = result.data;
  const related = blog.related_posts_data || [];

  return (
    <main className="page container blog-detail-page">
      <article className="blog-detail">
        <div className="blog-detail__header">
          <span className="blog-hero__pill">Vyra Journal</span>
          <h1>{blog.title}</h1>
          <p className="meta">
            <span>{blog.author || 'Admin'}</span>
            <span className="meta-dot" aria-hidden />
            <span>{new Date(blog.created_at).toLocaleDateString()}</span>
          </p>
        </div>

        {blog.image_url && <img src={blog.image_url} alt={blog.title} />}

        <section className="content">
          {/* render markdown so headings, lists and points look consistent */}
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{blog.content || blog.excerpt || ''}</ReactMarkdown>
        </section>

        {/* Related posts section (admin-controlled) */}
        {related.length > 0 && <RelatedList items={related} />}
      </article>
    </main>
  );
}
