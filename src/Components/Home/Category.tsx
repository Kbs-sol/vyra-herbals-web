'use client';

import React from "react";
import { FaArrowRight } from "react-icons/fa6";
import Link from "next/link";
import styled from "styled-components";
import { useEffect, useState, useRef } from "react";
import { Category as CategoryType } from "@/types";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { CategorySkeleton } from "../Common/SkeletonComponents";

const Category = () => {
  const [categories, setCategories] = useState<CategoryType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const transformRef = useRef<number>(0); // used for transform fallback when native scroll isn't available

  const scroll = (direction: 'left' | 'right') => {
    // prefer the ref, fallback to querying the DOM to be resilient
    const el = scrollRef.current || document.querySelector('.category-scroll-container') as HTMLElement | null;
    console.log('[Category] scroll() called — direction:', direction, 'ref:', !!scrollRef.current, 'el-found:', !!el);
    if (!el) {
      console.warn('[Category] scroll() — no scroll container found');
      return;
    }

    const scrollAmount = Math.round(el.clientWidth * 0.8);
    const current = el.scrollLeft;
    const max = el.scrollWidth - el.clientWidth;
    const target = direction === 'left' ? Math.max(0, current - scrollAmount) : Math.min(max, current + scrollAmount);

    console.log('[Category] scroll parameters — clientWidth:', el.clientWidth, 'scrollWidth:', el.scrollWidth, 'current:', current, 'max:', max, 'target:', target);

    // If there's no overflow, attempt to enforce inline layout (global CSS may be preventing overflow)
    if (max <= 0) {
      console.warn('[Category] detected no horizontal overflow (max=0) — enforcing inline layout before scrolling');
      const list = el.querySelector('.category-list') as HTMLElement | null;
      if (list) {
        try {
          list.style.setProperty('flex-wrap', 'nowrap', 'important');
          list.style.setProperty('white-space', 'nowrap', 'important');
          Array.from(list.children).forEach((ch: Element, idx) => {
            const e = ch as HTMLElement;
            e.style.setProperty('flex', '0 0 220px', 'important');
            e.style.setProperty('min-width', '151px', 'important');
            const cs = window.getComputedStyle(e);
            console.log('[Category] enforcement (scroll) child', idx, 'offsetWidth:', e.offsetWidth, 'computedWidth:', cs.width, 'flexBasis:', cs.flexBasis, 'priority-flex:', e.style.getPropertyPriority('flex'));
          });

          // ensure inner list expands to children total width so native scroll becomes available
          try {
            const childrenArr = Array.from(list.children) as HTMLElement[];
            const total = childrenArr.reduce((s, c) => s + c.offsetWidth, 0) + Math.max(0, (childrenArr.length - 1) * 20);
            list.style.setProperty('min-width', `${total}px`, 'important');
            list.style.setProperty('width', `${total}px`, 'important');
            console.log('[Category] enforcement (scroll) set list width ->', total);
          } catch (err) {
            console.error('[Category] failed to expand list width during enforcement', err);
          }
        } catch (err) {
          console.error('[Category] enforcement inside scroll failed', err);
        }
      }
      // recompute sizes after enforcement
      const newMax = el.scrollWidth - el.clientWidth;
      console.log('[Category] after enforcement — clientWidth:', el.clientWidth, 'scrollWidth:', el.scrollWidth, 'newMax:', newMax);
      if (newMax <= 0) {
        console.warn('[Category] still nothing to scroll after enforcement — using transform fallback');
        // final visual fallback: translate the inner list as a carousel when native scrolling is not possible
        const listEl = el.querySelector('.category-list') as HTMLElement | null;
        if (!listEl) {
          console.error('[Category] transform fallback failed — .category-list not found');
          return;
        }

        // compute total width of children
        const childrenArr = Array.from(listEl.children) as HTMLElement[];
        const totalWidth = childrenArr.reduce((sum, c) => sum + c.offsetWidth, 0) + Math.max(0, (childrenArr.length - 1) * 20);
        const visibleWidth = el.clientWidth;
        const minTranslate = Math.min(0, visibleWidth - totalWidth); // negative or 0

        const current = transformRef.current || 0; // negative or 0
        const delta = Math.round(visibleWidth * 0.8) * (direction === 'left' ? 1 : -1);
        let next = current + delta;
        if (next > 0) next = 0;
        if (next < minTranslate) next = minTranslate;
        transformRef.current = next;

        console.log('[Category] transform fallback — totalWidth:', totalWidth, 'visibleWidth:', visibleWidth, 'minTranslate:', minTranslate, 'current:', current, 'next:', next);
        listEl.style.setProperty('transition', 'transform 400ms cubic-bezier(0.4,0,0.2,1)', 'important');
        listEl.style.setProperty('transform', `translateX(${next}px)`, 'important');
        return;
      }
    }

    // try smooth scroll, then verify it took effect; fallback to immediate assignment if it didn't
    try {
      el.scrollTo({ left: target, behavior: 'smooth' as ScrollBehavior });
    } catch (err) {
      console.error('[Category] scroll() - scrollTo threw, falling back to direct assignment', err);
      el.scrollLeft = target;
      return;
    }

    // safety-check: if smooth scroll doesn't change value (some environments), force it after a short delay
    const verifyAfter = 300; // ms
    const before = el.scrollLeft;
    setTimeout(() => {
      const after = el.scrollLeft;
      if (Math.abs(after - before) < 2) {
        console.warn('[Category] smooth scroll had no effect — applying immediate fallback');
        el.scrollLeft = target;
      } else {
        console.log('[Category] smooth scroll in progress/complete — new scrollLeft:', after);
      }
    }, verifyAfter);
  };

  useEffect(() => {
    const CATEGORY_ORDER = [
      "Hair Oil",
      "Shampoo",
      "Scalp Massager",
      "Herbal Hair Mask Powder",
      "Neem Combs",
      "Rosemary Leaves",
      "Combo's",
      "Kits"
    ];

    const fetchCategories = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tbl_name: 'categories' })
        });
        const data = await response.json();
        if (Array.isArray(data)) {
          const sortedCategories = [...data].sort((a, b) => {
            const indexA = CATEGORY_ORDER.indexOf(a.name);
            const indexB = CATEGORY_ORDER.indexOf(b.name);
            if (indexA === -1 && indexB === -1) return a.name.localeCompare(b.name);
            if (indexA === -1) return 1;
            if (indexB === -1) return -1;
            return indexA - indexB;
          });
          setCategories(sortedCategories);
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    // diagnostic log after categories load to show whether the container actually overflows
    if (categories.length) {
      const el = scrollRef.current || document.querySelector('.category-scroll-container') as HTMLElement | null;
      if (el) {
        console.log('[Category] categories loaded:', categories.length, 'container clientWidth:', el.clientWidth, 'scrollWidth:', el.scrollWidth);

        // ENFORCE: apply inline styles to prevent global CSS from forcing wrap/width
        const list = el.querySelector('.category-list') as HTMLElement | null;
        if (list) {
          try {
            list.style.flexWrap = 'nowrap';
            list.style.whiteSpace = 'nowrap';
            const children = Array.from(list.children) as HTMLElement[];
            children.forEach((ch, idx) => {
              const elChild = ch as HTMLElement;
              elChild.style.setProperty('flex', '0 0 220px', 'important');
              elChild.style.setProperty('min-width', '151px', 'important');
              elChild.style.setProperty('width', 'auto', 'important');
              elChild.style.setProperty('box-sizing', 'border-box', 'important');
              const computed = window.getComputedStyle(elChild);
              console.log('[Category] child enforced', idx, 'offsetWidth:', elChild.offsetWidth, 'computedWidth:', computed.width, 'flex-basis:', computed.flexBasis, 'priority-flex:', elChild.style.getPropertyPriority('flex'));
            });

            // compute total width of children (include gaps) and expand the inner list so native scrolling works
            const totalWidth = (children.reduce((sum, c) => sum + (c as HTMLElement).offsetWidth, 0) + Math.max(0, (children.length - 1) * 20));
            try {
              list.style.setProperty('min-width', `${totalWidth}px`, 'important');
              list.style.setProperty('width', `${totalWidth}px`, 'important');
              console.log('[Category] set .category-list width ->', totalWidth);
            } catch (err) {
              console.error('[Category] failed to set .category-list width', err);
            }

            const firstChild = children[0];
            const cs = firstChild ? window.getComputedStyle(firstChild) : null;
            console.log('[Category] inline style enforced on list and children — firstChild offsetWidth:', firstChild?.offsetWidth, 'computed flex-basis:', cs?.flexBasis, 'firstChild style priority (flex):', firstChild?.style.getPropertyPriority('flex'));
          } catch (err) {
            console.error('[Category] failed to enforce inline layout styles', err);
          }

          // re-log container sizes after enforcement
          console.log('[Category] after enforcement clientWidth:', el.clientWidth, 'scrollWidth:', el.scrollWidth);
        } else {
          console.warn('[Category] category-list element not found inside container');
        }
      } else {
        console.warn('[Category] categories loaded but container not found');
      }
    }
  }, [categories]);

  const getCategoryImages = (slug: string, name: string) => {
    const s = slug?.toLowerCase() || name?.toLowerCase() || "";
    if (s.includes("hair-oil") || s.includes("hair oil")) {
      return { main: "/assets/images/cat/oil.jpg", hover: "/home-hair-oil.jpg" };
    }
    if (s.includes("shampoo")) {
      return { main: "/assets/images/cat/shampoo.jpg", hover: "/home-shampoo.jpg" };
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
                          <img src={cat.image_url || imgs.main} alt={cat.name} />
                          <img src={cat.image_url || imgs.hover} alt={cat.name} />
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
      gap: 8px;
      color: #333;
      
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
