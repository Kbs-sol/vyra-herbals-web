"use client";

import React from "react";
import Link from "next/link";
import styled from "styled-components";
import { ArrowRight, Leaf, ShieldCheck, Truck, Sprout } from "lucide-react";
import { openConcernSelector } from "./ConcernSheet";
import { BRAND, BREAKPOINTS } from "./brand";

const EditorialHero = () => (
  <Hero aria-labelledby="hero-heading">
    <div className="container hero-inner">
      <div className="hero-copy">
        <span className="hero-eyebrow">
          <Leaf size={14} strokeWidth={1.75} aria-hidden="true" /> Vyra Herbals
        </span>
        <h1 id="hero-heading">100% Natural Herbal Hair Care</h1>
        <p>
          Chemical-free and handmade in India with 20+ cold-infused whole herbs and virgin
          botanical oils for hair fall, thinning, dandruff and dryness.
        </p>
        <div className="hero-cta">
          <button type="button" className="btn-primary" onClick={openConcernSelector}>
            What&apos;s Your Hair Concern? <ArrowRight size={18} strokeWidth={2} aria-hidden="true" />
          </button>
          <Link href="/search?searchtext=all" className="btn-secondary">
            Shop All Products
          </Link>
        </div>
        <ul className="hero-points" aria-label="Why Vyra">
          <li><Sprout size={16} strokeWidth={1.75} aria-hidden="true" /> Chemical-free</li>
          <li><Leaf size={16} strokeWidth={1.75} aria-hidden="true" /> Handmade in India</li>
          <li><Truck size={16} strokeWidth={1.75} aria-hidden="true" /> Free shipping</li>
          <li><ShieldCheck size={16} strokeWidth={1.75} aria-hidden="true" /> Secure checkout</li>
        </ul>
      </div>
      <div className="hero-media">
        <picture>
          <source media="(max-width: 768px)" srcSet="/assets/images/vyra-meadow-mobile.jpg" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assets/images/vyra-meadow-desktop.jpg"
            alt="Vyra Herbals hair oil bottle surrounded by whole herbs, hibiscus, aloe, coconut and amla on a green meadow"
            width={1024}
            height={499}
            fetchPriority="high"
            decoding="async"
          />
        </picture>
      </div>
    </div>
  </Hero>
);

export default EditorialHero;

const Hero = styled.section`
  background: ${BRAND.linen};
  font-family: ${BRAND.body};
  padding: 48px 0 56px;

  .hero-inner {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1.1fr);
    gap: 48px;
    align-items: center;
  }
  .hero-eyebrow {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    font-weight: 700;
    color: ${BRAND.sage};
    margin-bottom: 16px;
  }
  h1 {
    font-family: ${BRAND.heading};
    font-weight: 600;
    font-size: clamp(38px, 5.6vw, 68px);
    line-height: 1.04;
    color: ${BRAND.forest};
    margin: 0 0 18px;
    letter-spacing: -0.01em;
  }
  .hero-copy p {
    font-size: clamp(15px, 1.4vw, 18px);
    line-height: 1.7;
    color: ${BRAND.charcoal};
    max-width: 540px;
    margin: 0 0 28px;
  }
  .hero-cta {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
  }
  .btn-primary,
  .btn-secondary {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    min-height: 52px;
    padding: 0 26px;
    border-radius: 999px;
    font-weight: 700;
    font-size: 14px;
    letter-spacing: 0.04em;
    text-decoration: none;
    transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease, color 0.2s ease;
  }
  button.btn-primary {
    cursor: pointer;
    font-family: inherit;
  }
  .hero-points {
    list-style: none;
    margin: 22px 0 0;
    padding: 0;
    display: flex;
    flex-wrap: wrap;
    gap: 8px 18px;
    color: ${BRAND.forest};
    font-size: 13px;
    font-weight: 600;
  }
  .hero-points li {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  .btn-primary {
    background: ${BRAND.forest};
    color: ${BRAND.white};
    border: 1.5px solid ${BRAND.forest};
  }
  .btn-primary:hover {
    background: ${BRAND.forestDeep};
    transform: translateY(-2px);
    box-shadow: 0 12px 26px rgba(27, 59, 43, 0.28);
  }
  .btn-primary:hover svg {
    transform: translateX(3px);
  }
  .btn-primary svg {
    transition: transform 0.2s ease;
  }
  .btn-secondary {
    background: transparent;
    color: ${BRAND.forest};
    border: 1.5px solid ${BRAND.forest};
  }
  .btn-secondary:hover {
    background: ${BRAND.forest};
    color: ${BRAND.white};
    transform: translateY(-2px);
  }
  .btn-primary:focus-visible,
  .btn-secondary:focus-visible {
    outline: 3px solid ${BRAND.sage};
    outline-offset: 3px;
  }
  .hero-media img {
    display: block;
    width: 100%;
    height: auto;
    border-radius: 24px;
    box-shadow: 0 24px 60px rgba(27, 59, 43, 0.18);
    aspect-ratio: 1024 / 499;
    object-fit: cover;
    object-position: 78% 50%;
  }

  @media (max-width: ${BREAKPOINTS.tablet}) {
    padding: 36px 0 44px;
    .hero-inner {
      grid-template-columns: 1fr;
      gap: 28px;
    }
    .hero-copy {
      text-align: center;
    }
    .hero-copy p {
      margin-inline: auto;
    }
    .hero-cta {
      justify-content: center;
    }
    .hero-points {
      justify-content: center;
    }
  }
  @media (max-width: ${BREAKPOINTS.mobile}) {
    .hero-media img {
      aspect-ratio: 1 / 1;
      border-radius: 18px;
      object-position: 50% 50%;
    }
    .hero-cta a {
      flex: 1 1 100%;
    }
  }
`;
