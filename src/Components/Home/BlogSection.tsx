'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import styled from 'styled-components';
import { API_PATH } from '../../constants';

const BlogSection = () => {
    const [blogs, setBlogs] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchBlogs = async () => {
            try {
                const response = await fetch(`${API_PATH}/blogs?limit=3`);
                if (response.ok) {
                    const json = await response.json();
                    if (json.success) {
                        setBlogs(json.data || []);
                    }
                }
            } catch (error) {
                console.error('Error fetching blogs for homepage:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchBlogs();
    }, []);

    if (!isLoading && blogs.length === 0) return null;

    return (
        <StyledBlogSection className="section">
            <div className="container">
                <div className="section-header">
                    <div className="title-wrap">
                        <span className="subtitle">LATEST STORIES</span>
                        <h2 className="title">Natural Herbal Wisdom & Hair Care Tips</h2>
                    </div>
                    <Link href="/blogs" className="view-all">
                        View All Articles <span>→</span>
                    </Link>
                </div>

                <div className="blog-grid">
                    {isLoading ? (
                        Array(3).fill(0).map((_, i) => (
                            <div key={i} className="blog-card-skeleton">
                                <div className="skeleton-img"></div>
                                <div className="skeleton-content">
                                    <div className="skeleton-line"></div>
                                    <div className="skeleton-line short"></div>
                                </div>
                            </div>
                        ))
                    ) : (
                        blogs.map((blog) => (
                            <Link key={blog.id} href={`/blogs/${blog.handle}`} className="blog-card-link">
                                <article className="blog-card">
                                    <div className="card-image">
                                        <img src={blog.image_url || '/assets/images/placeholder-blog.jpg'} alt={blog.title} />
                                        <div className="category-tag">{blog.category || 'Wellness'}</div>
                                    </div>
                                    <div className="card-body">
                                        <div className="card-meta">
                                            {new Date(blog.created_at || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </div>
                                        <h3 className="card-title">{blog.title}</h3>
                                        <p className="card-excerpt">
                                            {blog.excerpt || 'Discover nature\'s profound healing power through our latest natural hair-care insights and handmade herbal wellness tips.'}
                                        </p>
                                        <div className="card-footer">
                                            <span className="read-more">Read Story</span>
                                        </div>
                                    </div>
                                </article>
                            </Link>
                        ))
                    )}
                </div>
            </div>
        </StyledBlogSection>
    );
};

export default BlogSection;

const StyledBlogSection = styled.section`
    padding: 6rem 0;
    background-color: #fff;

    .section-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        margin-bottom: 3.5rem;
    }

    .subtitle {
        display: block;
        font-size: 0.85rem;
        font-weight: 800;
        color: var(--primary);
        letter-spacing: 2px;
        margin-bottom: 0.8rem;
    }

    .title {
        font-size: 2.5rem;
        font-weight: 700;
        color: #1a1a1a;
        margin: 0;
    }

    .view-all {
        font-weight: 700;
        color: #1a1a1a;
        text-decoration: none;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        transition: all 0.3s;
        border-bottom: 2px solid transparent;
        padding-bottom: 4px;

        span {
            font-size: 1.2rem;
            transition: transform 0.3s;
        }

        &:hover {
            color: var(--primary);
            border-bottom-color: var(--primary);
            span { transform: translateX(5px); }
        }
    }

    .blog-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 2.5rem;
    }

    .blog-card {
        background: #fff;
        border-radius: 24px;
        overflow: hidden;
        transition: all 0.4s cubic-bezier(0.165, 0.84, 0.44, 1);
        height: 100%;
        display: flex;
        flex-direction: column;
        border: 1px solid #f0f0f0;

        &:hover {
            transform: translateY(-12px);
            box-shadow: 0 20px 40px rgba(0,0,0,0.08);
            border-color: var(--primary);
        }
    }

    .card-image {
        position: relative;
        height: 220px;
        overflow: hidden;

        img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            transition: transform 0.6s ease;
        }

        .category-tag {
            position: absolute;
            bottom: 1.2rem;
            left: 1.2rem;
            background: rgba(255, 255, 255, 0.95);
            padding: 0.4rem 1rem;
            border-radius: 2rem;
            font-size: 0.7rem;
            font-weight: 700;
            color: var(--primary);
            text-transform: uppercase;
        }
    }

    .blog-card:hover img {
        transform: scale(1.08);
    }

    .card-body {
        padding: 2rem;
        flex-grow: 1;
    }

    .card-meta {
        font-size: 0.8rem;
        color: #888;
        font-weight: 500;
        margin-bottom: 0.8rem;
    }

    .card-title {
        font-size: 1.35rem;
        font-weight: 700;
        color: #1a1a1a;
        margin-bottom: 1rem;
        line-height: 1.4;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
    }

    .card-excerpt {
        font-size: 0.95rem;
        color: #666;
        line-height: 1.6;
        margin-bottom: 1.5rem;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
    }

    .read-more {
        font-size: 0.9rem;
        font-weight: 700;
        color: var(--primary);
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }

    /* Skeleton */
    .blog-card-skeleton {
        background: #f8f9fa;
        height: 400px;
        border-radius: 24px;
        .skeleton-img {
            height: 220px;
            background: #eee;
        }
        .skeleton-content {
            padding: 2rem;
            .skeleton-line {
                height: 20px;
                background: #eee;
                margin-bottom: 1rem;
                width: 100%;
                &.short { width: 60%; }
            }
        }
    }

    @media (max-width: 991px) {
        .blog-grid {
            grid-template-columns: repeat(2, 1fr);
        }
        .title { font-size: 2rem; }
    }

    @media (max-width: 767px) {
        padding: 4rem 0;
        .blog-grid {
            grid-template-columns: 1fr;
        }
        .section-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 1.5rem;
        }
    }
`;
