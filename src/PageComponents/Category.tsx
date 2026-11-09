"use client";
import React, { useState, useEffect } from "react";
import type { Product } from "@/types";


import { IoMdHome } from "react-icons/io";

import Link from "next/link";
import { useParams } from "next/navigation";
import { API_PATH } from "../constants";
import SEOComponent from "../Components/Shared/SEOComponent";
import styled from "styled-components";
import { SlidersHorizontal, PackageSearch } from "lucide-react";
import FamilyProductCard from "../Components/Shared/FamilyProductCard";
import { groupProductsIntoFamilies } from "../utils/variantFamilies";
import { COLLECTIONS, getCollection } from "../utils/collections";

const Category = () => {
  const params = useParams();
  const categoryName = String(params?.categoryName ?? '');
  const [categoryData, setCategoryData] = useState<Product[]>([]);
  const [filteredData, setFilteredData] = useState<Product[]>([]);
  const [sortBy, setSortBy] = useState('price-low-high');
  const [priceRange, setPriceRange] = useState([0, 10000]);
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(10000);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const collection = getCollection(categoryName.toLowerCase());

  useEffect(() => {
    setLoading(true);
    setFailed(false);
    // Fetch category data from API
    fetch(`${API_PATH}/products/by-category`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        category_name: categoryName.toLowerCase().replace(/\s+/g, "-"),
      }),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to fetch category data");
        }
        return response.json();
      })
      .then((data) => {
        setCategoryData(data.products || []);
        // Set initial price range based on products
        if (data.products && data.products.length > 0) {
          const prices = data.products.map(p => parseInt(p.price) || 0);
          const min = Math.min(...prices);
          const max = Math.max(...prices);
          setMinPrice(min);
          setMaxPrice(max);
          setPriceRange([min, max]);
        }
      })
      .catch((error) => {
        console.error("Error fetching category data:", error);
        setFailed(true);
      })
      .finally(() => setLoading(false));
  }, [categoryName]);

  // Apply filters and sorting
  useEffect(() => {
    let filtered = [...categoryData];

    // Apply price range filter
    filtered = filtered.filter((product) => {
      const price = Number(product.price) || 0;
      return price >= priceRange[0] && price <= priceRange[1];
    });

    // Apply sorting
    switch (sortBy) {
      case 'price-low-high':
        filtered.sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0));
        break;
      case 'price-high-low':
        filtered.sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0));
        break;
      case 'rating':
        filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case 'newest':
        filtered.sort(
          (a, b) =>
            new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()
        );
        break;
      default:
        break;
    }

    setFilteredData(filtered);
  }, [categoryData, sortBy, priceRange]);

  const families = React.useMemo(() => groupProductsIntoFamilies(filteredData), [filteredData]);

  return (
    <>
      <SEOComponent title={`${collection?.title || categoryName} category results`} />

      <section className="bredcum_out">
        <div className="container">
          <div className="breadcrumbs">
            <ul className="items d-flex">
              <li className="item home">
                <Link href="/" title="Go to Home Page">
                  <IoMdHome />
                </Link>
              </li>
              <li>/</li>
              <li className="item cms_page">
                <strong>{collection?.label || "Shop"}</strong>
              </li>
            </ul>
          </div>
        </div>
      </section>

      <Page>
        <div className="container">
          <header className="cat-head">
            <h2>{collection?.title || categoryName.replace(/-/g, " ")}</h2>
            {collection && <p>{collection.description}</p>}
          </header>

          {/* Collection switcher */}
          <nav className="cat-switch" aria-label="Collections">
            {COLLECTIONS.map((c) => (
              <Link
                key={c.slug}
                href={`/category/${c.slug}`}
                className={c.slug === categoryName.toLowerCase() ? "is-on" : ""}
                aria-current={c.slug === categoryName.toLowerCase() ? "page" : undefined}
              >
                {c.label}
              </Link>
            ))}
          </nav>

          {/* Sort + filters */}
          <div className="cat-toolbar">
            <span className="cat-count" aria-live="polite">
              {loading ? "Loading..." : `${families.length} product${families.length === 1 ? "" : "s"}`}
            </span>
            <label className="cat-sort">
              <span className="sr-only">Sort by</span>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} aria-label="Sort products">
                <option value="price-low-high">Price: Low to High</option>
                <option value="price-high-low">Price: High to Low</option>
                <option value="rating">Highest Rated</option>
                <option value="newest">Newest First</option>
              </select>
            </label>
            {maxPrice > minPrice && (
              <button
                type="button"
                className={`cat-filter-btn${filtersOpen ? " is-on" : ""}`}
                aria-expanded={filtersOpen}
                aria-controls="cat-price-panel"
                onClick={() => setFiltersOpen((o) => !o)}
              >
                <SlidersHorizontal size={16} aria-hidden="true" /> Price
              </button>
            )}
          </div>

          {filtersOpen && (
            <div id="cat-price-panel" className="cat-price">
              <label>
                Min
                <input
                  type="number"
                  inputMode="numeric"
                  min={minPrice}
                  max={maxPrice}
                  value={priceRange[0]}
                  onChange={(e) => setPriceRange([Math.max(minPrice, parseInt(e.target.value) || 0), priceRange[1]])}
                />
              </label>
              <label>
                Max
                <input
                  type="number"
                  inputMode="numeric"
                  min={minPrice}
                  max={maxPrice}
                  value={priceRange[1]}
                  onChange={(e) => setPriceRange([priceRange[0], Math.min(maxPrice, parseInt(e.target.value) || maxPrice)])}
                />
              </label>
              <button
                type="button"
                onClick={() => {
                  setSortBy("price-low-high");
                  setPriceRange([minPrice, maxPrice]);
                }}
              >
                Reset
              </button>
            </div>
          )}

          {/* Grid */}
          {loading ? (
            <ul className="cat-grid" aria-busy="true" aria-label="Loading products">
              {[1, 2, 3, 4].map((k) => (
                <li key={k} className="cat-skel">
                  <span className="sk-img" />
                  <span className="sk-line" />
                  <span className="sk-line short" />
                </li>
              ))}
            </ul>
          ) : failed ? (
            <div className="cat-empty" role="alert">
              <PackageSearch size={40} strokeWidth={1.5} aria-hidden="true" />
              <p>We could not load these products. Please check your connection and try again.</p>
              <button type="button" onClick={() => window.location.reload()}>Try again</button>
            </div>
          ) : families.length === 0 ? (
            <div className="cat-empty">
              <PackageSearch size={40} strokeWidth={1.5} aria-hidden="true" />
              <p>{categoryData.length === 0 ? "No products here yet." : "No products match this price range."}</p>
              {categoryData.length > 0 ? (
                <button type="button" onClick={() => setPriceRange([minPrice, maxPrice])}>Clear price filter</button>
              ) : (
                <Link href="/#bestSellers">See our best sellers</Link>
              )}
            </div>
          ) : (
            <ul className="cat-grid">
              {families.map((g) => (
                <FamilyProductCard key={g.key} group={g} />
              ))}
            </ul>
          )}
        </div>
      </Page>
    </>
  );
};

export default Category;

const Page = styled.section`
  padding: 8px 0 56px;
  font-family: var(--font-opensans), 'Open Sans', system-ui, sans-serif;
  color: #1f2421;

  .sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; }
  .cat-head { text-align: center; margin: 8px 0 18px; }
  .cat-head h2 {
    font-family: var(--font-cormorant), 'Cormorant Garamond', Georgia, serif;
    font-size: clamp(30px, 4.4vw, 46px); font-weight: 600; color: #1b3b2b; margin: 0 0 6px; text-transform: capitalize;
  }
  .cat-head p { margin: 0 auto; max-width: 560px; color: #5b655f; font-size: 15px; line-height: 1.55; }

  .cat-switch {
    display: flex; gap: 8px; overflow-x: auto; padding: 4px 2px 10px; margin-bottom: 6px;
    justify-content: center; scrollbar-width: none;
  }
  .cat-switch::-webkit-scrollbar { display: none; }
  .cat-switch a {
    flex: 0 0 auto; display: inline-flex; align-items: center; min-height: 40px; padding: 0 18px; border-radius: 999px;
    border: 1px solid rgba(27, 59, 43, 0.18); background: #faf7f2; color: #1b3b2b; font-weight: 600; font-size: 13.5px; text-decoration: none;
  }
  .cat-switch a.is-on { background: #1b3b2b; color: #fff; border-color: #1b3b2b; }

  .cat-toolbar {
    position: sticky; top: 0; z-index: 20; display: flex; align-items: center; gap: 10px;
    padding: 10px 0; background: rgba(255, 255, 255, 0.96); backdrop-filter: blur(6px);
    border-bottom: 1px solid rgba(27, 59, 43, 0.08); margin-bottom: 16px;
  }
  .cat-count { font-size: 13.5px; font-weight: 600; color: #5b655f; margin-right: auto; }
  .cat-sort select, .cat-price input {
    min-height: 44px; padding: 0 12px; border: 1px solid rgba(27, 59, 43, 0.22); border-radius: 10px; background: #fff;
    font-size: 14px; color: #1b3b2b;
  }
  .cat-filter-btn {
    display: inline-flex; align-items: center; gap: 6px; min-height: 44px; padding: 0 14px; border-radius: 10px;
    border: 1px solid rgba(27, 59, 43, 0.22); background: #fff; color: #1b3b2b; font-weight: 600; font-size: 14px;
  }
  .cat-filter-btn.is-on { background: #e6eee8; }
  .cat-price {
    display: flex; flex-wrap: wrap; align-items: flex-end; gap: 12px; padding: 12px 14px; margin-bottom: 16px;
    background: #faf7f2; border: 1px solid rgba(27, 59, 43, 0.12); border-radius: 12px;
  }
  .cat-price label { display: flex; flex-direction: column; gap: 4px; font-size: 12px; font-weight: 700; color: #5b655f; }
  .cat-price input { width: 110px; }
  .cat-price button { min-height: 44px; padding: 0 16px; border-radius: 10px; border: 0; background: #1b3b2b; color: #fff; font-weight: 600; }

  .cat-grid { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(4, 1fr); gap: 18px; }
  .cat-skel { background: #fff; border: 1px solid rgba(27, 59, 43, 0.1); border-radius: 18px; padding: 0 0 14px; overflow: hidden; }
  .sk-img, .sk-line { display: block; background: linear-gradient(90deg, #eef2ef 25%, #f7f9f7 50%, #eef2ef 75%); background-size: 200% 100%; animation: sk 1.3s infinite; }
  .sk-img { aspect-ratio: 1 / 1; }
  .sk-line { height: 14px; border-radius: 6px; margin: 14px 14px 0; }
  .sk-line.short { width: 40%; }
  @keyframes sk { to { background-position: -200% 0; } }

  .cat-empty { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 56px 16px; text-align: center; color: #5b655f; }
  .cat-empty button, .cat-empty a {
    display: inline-flex; align-items: center; min-height: 46px; padding: 0 22px; border-radius: 999px; border: 0;
    background: #1b3b2b; color: #fff; font-weight: 700; text-decoration: none;
  }

  @media (max-width: 992px) { .cat-grid { grid-template-columns: repeat(3, 1fr); } }
  @media (max-width: 768px) {
    .cat-grid { grid-template-columns: repeat(2, 1fr); gap: 12px; }
    .cat-switch { justify-content: flex-start; }
    .cat-toolbar { top: 0; }
  }
  @media (prefers-reduced-motion: reduce) { .sk-img, .sk-line { animation: none; } }
`;
