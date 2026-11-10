"use client";

import React from "react";
import Link from "next/link";
import styled from "styled-components";
import { ArrowRight } from "lucide-react";
import { BRAND, BREAKPOINTS } from "./brand";

const CATEGORIES = [
  { name: "Herbal Hair Oils", slug: "hair-oil", image: "/category-images/Hair Oil.webp", note: "Cold-infused, 100ml to 500ml" },
  { name: "Herbal Shampoos", slug: "shampoo", image: "/category-images/Shampo.webp", note: "Sulfate and paraben free" },
  { name: "Hair Masks", slug: "herbal-hair-mask-powder", image: "/category-images/Hair Mask.webp", note: "Mix fresh, conditioning powder" },
  { name: "Botanical Accessories", slug: "neem-combs", image: "/assets/images/cat/coomb.webp", note: "Neem combs and scalp massagers" },
  { name: "Value Combos", slug: "combo-s", image: "https://obbohecegyagnqufelpx.supabase.co/storage/v1/object/public/images/oil-100ml-shampoo-200ml-combo/1769795539392-gnur19u.jpg", note: "Complete routines, better price" },
];

const ShopByCategory = () => (
  <Section id="shop-by-category" aria-labelledby="cat-heading">
    <div className="container">
      <header className="head">
        <span className="eyebrow">Shop by category</span>
        <h2 id="cat-heading">Find exactly what your hair needs</h2>
      </header>
      <ul className="cat-grid">
        {CATEGORIES.map((c) => (
          <li key={c.slug}>
            <Link href={`/category/${c.slug}`} className="cat-card">
              <span className="cat-img">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={c.image} alt="" width={240} height={240} loading="lazy" />
              </span>
              <span className="cat-name">{c.name}</span>
              <span className="cat-note">{c.note}</span>
              <span className="cat-go" aria-hidden="true">
                <ArrowRight size={16} strokeWidth={2} />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  </Section>
);

export default ShopByCategory;

const Section = styled.section`
  background: ${BRAND.white};
  padding: 72px 0;
  font-family: ${BRAND.body};

  .head {
    text-align: center;
    margin-bottom: 32px;
  }
  .eyebrow {
    display: inline-block;
    font-size: 12px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    font-weight: 700;
    color: ${BRAND.sage};
    margin-bottom: 8px;
  }
  h2 {
    font-family: ${BRAND.heading};
    font-size: clamp(28px, 3.8vw, 42px);
    color: ${BRAND.forest};
    margin: 0;
    font-weight: 600;
  }
  .cat-grid {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 16px;
  }
  .cat-card {
    position: relative;
    display: flex;
    flex-direction: column;
    height: 100%;
    padding: 14px 14px 18px;
    background: ${BRAND.linen};
    border: 1px solid ${BRAND.line};
    border-radius: 18px;
    text-decoration: none;
    color: ${BRAND.forest};
    transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
  }
  .cat-card:hover {
    transform: translateY(-4px);
    border-color: ${BRAND.sage};
    box-shadow: 0 14px 30px rgba(27, 59, 43, 0.12);
  }
  .cat-card:focus-visible {
    outline: 3px solid ${BRAND.sage};
    outline-offset: 3px;
  }
  .cat-img {
    display: block;
    aspect-ratio: 1 / 1;
    border-radius: 12px;
    overflow: hidden;
    background: ${BRAND.sageSoft};
    margin-bottom: 14px;
  }
  .cat-img img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.4s ease;
  }
  .cat-card:hover .cat-img img {
    transform: scale(1.05);
  }
  .cat-name {
    font-family: ${BRAND.heading};
    font-size: 22px;
    font-weight: 600;
    line-height: 1.15;
  }
  .cat-note {
    font-size: 12.5px;
    color: ${BRAND.muted};
    margin-top: 4px;
    padding-right: 36px;
  }
  .cat-go {
    position: absolute;
    right: 14px;
    bottom: 14px;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: ${BRAND.forest};
    color: ${BRAND.white};
    display: inline-flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.2s ease;
  }
  .cat-card:hover .cat-go {
    transform: translateX(3px);
  }

  @media (max-width: ${BREAKPOINTS.tablet}) {
    padding: 56px 0;
    .cat-grid {
      grid-template-columns: repeat(3, 1fr);
    }
  }
  @media (max-width: ${BREAKPOINTS.mobile}) {
    padding: 44px 0;
    .cat-grid {
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
    }
    .cat-name {
      font-size: 19px;
    }
    .cat-card {
      padding: 10px 10px 16px;
    }
  }
`;
