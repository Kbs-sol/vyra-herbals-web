'use client';

import React from "react";
import { FaArrowRight } from "react-icons/fa6";
import Link from "next/link";
import styled from "styled-components";
import { useEffect, useState, useRef } from "react";
import { Category as CategoryType } from "@/types";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { CategorySkeleton } from "../Common/SkeletonComponents";

const HARDCODED_CATEGORIES = [
  { 
    id: 1, 
    name: "Hair Oil", 
    slug: "hair-oil", 
    image_url: "/category-images/Hair Oil.png",
    hover_url: "https://obbohecegyagnqufelpx.supabase.co/storage/v1/object/public/images/hair-oil-100ml/1769794807906-zgf6vtn.jpg"
  },
  { 
    id: 2, 
    name: "Shampoo", 
    slug: "shampoo", 
    image_url: "/category-images/Shampo.jpeg",
    hover_url: "https://obbohecegyagnqufelpx.supabase.co/storage/v1/object/public/images/herbal-shampoo-200ml/1769795134812-b9j9hng.jpg"
  },
  { 
    id: 3, 
    name: "Scalp Massager", 
    slug: "scalp-massager", 
    image_url: "/category-images/scalp.jpg",
    hover_url: "https://obbohecegyagnqufelpx.supabase.co/storage/v1/object/public/images/scalp-massager/1771935718696-hz94vln.jpg"
  },
  { 
    id: 4, 
    name: "Herbal Hair Mask Powder", 
    slug: "herbal-hair-mask-powder", 
    image_url: "/category-images/Hair Mask.jpeg",
    hover_url: "https://obbohecegyagnqufelpx.supabase.co/storage/v1/object/public/images/herbal-hair-mask-powder/1771663039180-wsclkdq.jpeg"
  },
  { 
    id: 5, 
    name: "Neem Combs", 
    slug: "neem-combs", 
    image_url: "/assets/images/cat/coomb.jpg",
    hover_url: "https://obbohecegyagnqufelpx.supabase.co/storage/v1/object/public/images/neem-combs-combo-2/1769797623158-lx3krar.jpg"
  },
  { 
    id: 6, 
    name: "Rosemary Leaves", 
    slug: "rosemary-leaves", 
    image_url: "/category-images/Rosemary Leaves.jpeg",
    hover_url: "https://obbohecegyagnqufelpx.supabase.co/storage/v1/object/public/images/rosemary-leaves/1771662946547-x0yeozh.jpeg"
  },
];

const Category = () => {
  const [categories] = useState<CategoryType[]>(HARDCODED_CATEGORIES);
  const [isLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const transformRef = useRef<number>(0);

  const scroll = (direction: 'left' | 'right') => {
    // prefer the ref, fallback to querying the DOM to be resilient
    const el = scrollRef.current || document.querySelector('.category-scroll-container') as HTMLElement | null;
    if (!el) return;

    const scrollAmount = Math.round(el.clientWidth * 0.8);
    const current = el.scrollLeft;
    const max = el.scrollWidth - el.clientWidth;
    const target = direction === 'left' ? Math.max(0, current - scrollAmount) : Math.min(max, current + scrollAmount);

    try {
      el.scrollTo({ left: target, behavior: 'smooth' as ScrollBehavior });
    } catch (err) {
      el.scrollLeft = target;
    }
  };

  useEffect(() => {
    // ENFORCE: apply inline styles to prevent global CSS from forcing wrap/width
    const el = scrollRef.current || document.querySelector('.category-scroll-container') as HTMLElement | null;
    if (el) {
      const list = el.querySelector('.category-list') as HTMLElement | null;
      if (list) {
        try {
          list.style.flexWrap = 'nowrap';
          list.style.whiteSpace = 'nowrap';
          const children = Array.from(list.children) as HTMLElement[];
          children.forEach((ch) => {
            const elChild = ch as HTMLElement;
            elChild.style.setProperty('flex', '0 0 220px', 'important');
            elChild.style.setProperty('min-width', '151px', 'important');
            elChild.style.setProperty('width', 'auto', 'important');
            elChild.style.setProperty('box-sizing', 'border-box', 'important');
          });

          const totalWidth = (children.reduce((sum, c) => sum + (c as HTMLElement).offsetWidth, 0) + Math.max(0, (children.length - 1) * 20));
          list.style.setProperty('min-width', `${totalWidth}px`, 'important');
          list.style.setProperty('width', `${totalWidth}px`, 'important');
        } catch (err) {
          console.error('[Category] failed to enforce inline layout styles', err);
        }
      }
    }
  }, [categories]);

  const getCategoryImages = (slug: string, name: string) => {
    const s = slug?.toLowerCase() || name?.toLowerCase() || "";
    if (s.includes("hair-oil") || s.includes("hair oil")) {
      return { main: "/category-images/Hair Oil.png", hover: "/home-hair-oil.jpg" };
    }
    if (s.includes("shampoo")) {
      return { main: "/category-images/Shampo.jpeg", hover: "/home-shampoo.jpg" };
    }
    if (s.includes("mask") || s.includes("powder")) {
      return { main: "/category-images/Hair Mask.jpeg", hover: "/assets/images/cat/oil.jpg" };
    }
    if (s.includes("rosemary")) {
      return { main: "/category-images/Rosemary Leaves.jpeg", hover: "/assets/images/cat/oil.jpg" };
    }
    if (s.includes("comb") || s.includes("neem")) {
      return { main: "/assets/images/cat/coomb.jpg", hover: "/home-neem-comb.jpg" };
    }
    if (s.includes("massager") || s.includes("scalp")) {
      return { main: "/assets/images/cat/scalp.jpg", hover: "/home-scalp-massager.jpg" };
    }
    return { main: "/assets/images/cat/oil.jpg", hover: "/assets/images/cat/oil.jpg" };
  };

  return (
    <StyledCategories className="section category-part">
      <div className="container">
        <div className="row">
          <div className="col-12">
            <div className="section-heading mb-3">
              <h2>shop by categories</h2>
            </div>
          </div>
        </div>
        <div className="row pos-relative align-items-center">
          <button
            className="nav-btn prev"
            onClick={() => { console.log('[Category] Prev clicked'); scroll('left'); }}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); console.log('[Category] Prev key activated', e.key); scroll('left'); } }}
            aria-label="Previous"
          >
            <FaChevronLeft />
          </button>

          <div className="col-lg-12">
            <div className="category-scroll-container" ref={scrollRef}>
              <div className="category-list d-flex flex-nowrap">
                {isLoading ? (
                  Array(6).fill(0).map((_, i) => <CategorySkeleton key={i} />)
                ) : categories.map((cat, index) => {
                  const imgs = getCategoryImages(cat.slug || "", cat.name || "");
                  return (
                    <div
                      className="category-wrap"
                      key={cat.id || index}
                      style={{ flex: '0 0 220px', minWidth: '151px', width: 'auto' }}
                    >
                      <Link href={`/category/${cat.slug || cat.handle || ""}`}>
                        <div className="category-media">
                          <img src={cat.image_url} alt={cat.name} />
                          <img src={cat.hover_url} alt={cat.name} />
                        </div>
                        <div className="category-meta">
                          <h4>
                            {cat.name === "Herbal Hair Mask Powder" ? "Hair Mask Powder" : cat.name}
                            <FaArrowRight />
                          </h4>
                        </div>
                      </Link>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <button
            className="nav-btn next"
            onClick={() => { console.log('[Category] Next clicked'); scroll('right'); }}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); console.log('[Category] Next key activated', e.key); scroll('right'); } }}
            aria-label="Next"
          >
            <FaChevronRight />
          </button>
        </div>
      </div>
    </StyledCategories>
  );
};

export default Category;

const StyledCategories = styled.section`
  &.category-part {
    padding: 1.5rem 0 0 !important; /* Fixed top padding, zero bottom */
    min-height: auto !important;
    height: auto !important;
    margin-bottom: 0 !important;
    overflow-x: hidden; /* clip any accidental horizontal overflow from children */

    /* Override external CSS conflicts */
    &.pt-2 {
      padding-top: 0 !important;
    }
    &.pb-2 {
      padding-bottom: 0 !important;
    }
    &.pt-4 {
      padding-top: 0 !important;
    }
    &.pb-4 {
      padding-bottom: 0 !important;
    }
  }

  .pos-relative {
    position: relative;
    padding: 0 45px;
  }

  /* Reduce side padding on smaller screens so the carousel can use more of the viewport */
  @media (max-width: 991px) {
    .pos-relative {
      padding: 0 14px;
    }
  }

  @media (max-width: 576px) {
    .pos-relative {
      padding: 0 10px;
    }
  }

  .nav-btn {
    position: absolute;
    top: 50%; /* Center vertically on the cards */
    transform: translateY(-50%);
    width: 44px;
    height: 44px;
    background: #fff;
    border: 1px solid #ddd;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    z-index: 2000; /* Ensure arrows sit above overlays and register clicks */
    color: var(--primary);
    transition: all 0.3s ease;
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    padding: 0;
    pointer-events: auto; /* Force clickability */

    &:hover {
      background: var(--primary);
      color: #fff;
      border-color: var(--primary);
    }

    &.prev {
      left: 0;
    }
    &.next {
      right: 0;
    }

    @media (max-width: 768px) {
      display: none;
    }
  }

  .category-scroll-container {
    overflow-x: auto !important;
    overflow-y: hidden !important;
    -webkit-overflow-scrolling: touch;
    max-width: 100%;
    box-sizing: border-box;
    height: fit-content;

    /* Hide scrollbars across all browsers */
    scrollbar-width: none !important; /* Firefox */
    -ms-overflow-style: none !important; /* IE + Edge */

    &::-webkit-scrollbar {
      display: none !important;
      width: 0 !important;
      height: 0 !important;
      background: transparent !important;
    }
    &::-webkit-scrollbar-track {
      display: none !important;
      background: transparent !important;
    }
    &::-webkit-scrollbar-thumb {
      display: none !important;
      background: transparent !important;
    }

    /* Force a single horizontal row and prevent external CSS from making items wrap */
    .category-list {
      display: flex !important;
      gap: 20px;
      padding: 0; /* Clear padding that causes height */
      margin: 0;
      height: fit-content; /* Only take the height needed */
      flex-wrap: nowrap !important; /* important to override global rules */
      white-space: nowrap; /* additional protection against wrapping */
      align-items: stretch;
      will-change: scroll-left;
      min-width: 0; /* prevent flex children from forcing parent/page overflow */
      overflow-y: hidden !important; /* Eliminate vertical bar */
      
      /* Hide scrollbars for the list itself */
      scrollbar-width: none !important;
      -ms-overflow-style: none !important;
      &::-webkit-scrollbar {
        display: none !important;
      }

      @media (min-width: 992px) {
        justify-content: flex-start;
      }
    }
  }

  .category-wrap {
    transition: transform 0.3s ease;
    /* strong override to prevent global stylesheet from forcing width:50% */
    flex: 0 0 220px !important; /* explicit fixed card width for predictable scrolling */
    width: auto !important;
    min-width: 151px !important; /* Ensure they don't get too small on mobile */
    height: fit-content; /* Only take the height needed */
    box-sizing: border-box;
    padding: 0 !important; /* remove extra padding from global styles to avoid overflow on narrow screens */

    @media (max-width: 991px) {
       flex: 0 0 160px !important; /* Smaller mobile width for better fit */
       min-width: 140px !important;
    }

    &:hover {
      transform: translateY(-5px);
    }
  }

  .category-media {
    position: relative;
    border-radius: 12px;
    overflow: hidden;
    aspect-ratio: 1/1;
    
    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
    }

    img:last-child {
      opacity: 0;
      position: absolute;
      left: 0;
      top: 0;
      transform: scale(1.1);
    }

    &:hover {
      img:first-child {
        opacity: 0;
        transform: scale(0.9);
      }
      img:last-child {
        opacity: 1;
        transform: scale(1);
      }
    }
  }

  .category-meta {
    margin-top: 15px;
    text-align: center;
    
    h4 {
      font-size: 1.1rem;
      font-weight: 600;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      color: #333;
      white-space: normal; /* Allow wrapping if needed, though unlikely for single words */
      text-align: center;
      
      @media (max-width: 576px) {
        font-size: 0.9rem;
        flex-wrap: wrap; /* Allow icon to wrap if absolutely necessary */
      }
      
      svg {
        font-size: 0.9rem;
        transition: transform 0.3s ease;
      }
    }
  }

  .category-wrap:hover .category-meta h4 svg {
    transform: translateX(5px);
  }
`;
