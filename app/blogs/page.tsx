import Link from 'next/link';

async function fetchBlogs(page = 1, limit = 10) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_ORIGIN || ''}/api/blogs?page=${page}&limit=${limit}`, { cache: 'no-store' });
  const json = await res.json();
  return json;
}

export default async function BlogsPage() {
  const data = await fetchBlogs(1, 10);
  const blogs = data.success ? data.data : [];

  return (
    <main className="page container">
      <h1>Blog</h1>
      <div className="blog-list">
        {blogs.length === 0 ? (
          <p>No blog posts yet.</p>
        ) : (
          blogs.map((b: any) => (
            <article key={b.id} className="blog-item">
              <h2>
                <Link href={`/blogs/${b.handle}`}>{b.title}</Link>
              </h2>
              <p className="excerpt">{b.excerpt}</p>
              <p className="meta">{b.author || 'Admin'} • {new Date(b.created_at).toLocaleDateString()}</p>
            </article>
          ))
        )}
      </div>
    </main>
  );
}
