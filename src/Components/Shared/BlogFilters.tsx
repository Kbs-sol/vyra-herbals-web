'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef } from 'react';

const CATEGORIES = [
  'All', 'Skin', 'Hair', 'Baby', 'Monsoon', 'Winter', 'Summer', 
  'Moisturisation', 'Concerns', 'Cellular Talks', 'Trend'
];

export default function BlogFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeCategory = searchParams?.get('category') || 'All';
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleCategoryClick = (category: string) => {
    const params = new URLSearchParams(searchParams?.toString() || '');
    if (category === 'All') {
      params.delete('category');
    } else {
      params.set('category', category);
    }
    router.push(`/blogs?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="blog-filters-wrapper">
      <div className="blog-filters" ref={scrollRef}>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            className={`filter-btn ${activeCategory === cat ? 'active' : ''}`}
            onClick={() => handleCategoryClick(cat)}
          >
            {cat}
          </button>
        ))}
      </div>
      <style jsx>{`
        .blog-filters-wrapper {
          position: relative;
          margin-bottom: 40px;
        }
        .blog-filters {
          display: flex;
          gap: 12px;
          overflow-x: auto;
          padding: 10px 0;
          scrollbar-width: none; /* Firefox */
          -ms-overflow-style: none;  /* IE and Edge */
          justify-content: center;
        }
        .blog-filters::-webkit-scrollbar {
          display: none; /* Chrome, Safari and Opera */
        }
        @media (max-width: 768px) {
          .blog-filters {
            justify-content: flex-start;
            padding: 10px 20px;
          }
        }
      `}</style>
    </div>
  );
}
