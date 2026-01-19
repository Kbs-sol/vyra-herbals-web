import { notFound } from 'next/navigation';

async function fetchBlog(slug: string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_ORIGIN || ''}/api/blogs?slug=${slug}`, { cache: 'no-store' });
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
    <main className="page container">
      <article className="blog-detail">
        <h1>{blog.title}</h1>
        <p className="meta">{blog.author || 'Admin'} • {new Date(blog.created_at).toLocaleDateString()}</p>
        {blog.image_url && <img src={blog.image_url} alt={blog.title} style={{ maxWidth: '100%', height: 'auto' }} />}
        <section className="content">
          {/* If the content is HTML, render; if markdown, apps can transform it later */}
          <div dangerouslySetInnerHTML={{ __html: blog.content || blog.excerpt || '' }} />
        </section>
      </article>
    </main>
  );
}
