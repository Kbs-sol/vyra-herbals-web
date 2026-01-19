import { headers } from 'next/headers';
import { notFound } from 'next/navigation';

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

export default async function BlogDetail({ params }: { params: { slug: string } }) {
  const slug = params.slug;
  const result = await fetchBlog(slug);

  if (!result.success || !result.data) {
    notFound();
  }

  const blog = result.data;

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
          <div dangerouslySetInnerHTML={{ __html: blog.content || blog.excerpt || '' }} />
        </section>
      </article>
    </main>
  );
}
