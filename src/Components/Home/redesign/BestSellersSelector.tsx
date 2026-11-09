"use client";

import React, { useState } from "react";
import Link from "next/link";
import styled from "styled-components";
import { ShoppingCart, Check, Star } from "lucide-react";
import { useCart } from "../../Contexts/CartContext";
import { addToCart as trackAddToCart } from "../../../utils/analytics";
import { BRAND, BREAKPOINTS, formatINR } from "./brand";
import { useCatalogue, CatalogueProduct } from "./useCatalogue";
import { useOrderCounts, orderCountLabel } from "../../Common/useOrderCounts";

interface Variant {
  id: number;
  label: string;
}
interface Family {
  key: string; // matches variantFamilies key (for live order counts)
  name: string;
  blurb: string;
  variants: Variant[];
  defaultIndex: number;
}

const BEST_SELLERS: Family[] = [
  {
    key: "hair-oil",
    name: "Herbal Hair Oil",
    blurb: "Cold-infused whole herbs in virgin botanical oils for root nourishment.",
    variants: [
      { id: 1, label: "100ml" },
      { id: 2, label: "200ml" },
      { id: 3, label: "500ml" },
    ],
    defaultIndex: 1,
  },
  {
    key: "shampoo",
    name: "Herbal Shampoo",
    blurb: "Sulfate and paraben free cleanse that respects your scalp.",
    variants: [
      { id: 4, label: "200ml" },
      { id: 5, label: "500ml" },
    ],
    defaultIndex: 0,
  },
  {
    key: "hair-mask",
    name: "Herbal Hair Mask Powder",
    blurb: "A conditioning herb blend you mix fresh before each use.",
    variants: [{ id: 9, label: "Single pack" }],
    defaultIndex: 0,
  },
  {
    key: "neem-comb",
    name: "Neem Wood Comb",
    blurb: "Gentle, low-snag detangling from the ends upward.",
    variants: [
      { id: 6, label: "Half" },
      { id: 7, label: "Full" },
      { id: 14, label: "Pack of 2" },
    ],
    defaultIndex: 1,
  },
];

const KITS: Family[] = [
  {
    key: "kit-hair-growth",
    name: "Hair Growth Kit",
    blurb: "Oil, shampoo and scalp tool to support stronger, fuller-looking hair.",
    variants: [
      { id: 26, label: "Mini" },
      { id: 27, label: "Complete" },
    ],
    defaultIndex: 1,
  },
  {
    key: "kit-hair-care",
    name: "Hair Care Kit",
    blurb: "A balanced everyday routine in one box: wash, oil and detangle.",
    variants: [
      { id: 22, label: "Mini" },
      { id: 23, label: "Complete" },
    ],
    defaultIndex: 1,
  },
  {
    key: "kit-scalp-care",
    name: "Scalp Care Kit",
    blurb: "Focused care for a clean, calm, well-nourished scalp.",
    variants: [
      { id: 24, label: "Mini" },
      { id: 25, label: "Complete" },
    ],
    defaultIndex: 1,
  },
  {
    key: "kit-all-in-one",
    name: "All-in-One Hair Growth Kit",
    blurb: "Everything we make for hair, together at the best value.",
    variants: [{ id: 28, label: "Complete set" }],
    defaultIndex: 0,
  },
];

const ALL_IDS = [...BEST_SELLERS, ...KITS].flatMap((f) => f.variants.map((v) => v.id));

const FamilyCard = ({ family, catalogue }: { family: Family; catalogue: CatalogueProduct[] }) => {
  const { addItemToCart, cartItems } = useCart();
  const counts = useOrderCounts();
  const social = orderCountLabel(counts?.families?.[family.key]);
  const [idx, setIdx] = useState(family.defaultIndex);
  const [busy, setBusy] = useState(false);

  const variant = family.variants[idx];
  const product = catalogue.find((p) => Number(p.id) === variant.id);
  if (!product) return null;

  const price = Number(product.price || 0);
  const mrp = Number(product.regular_price || 0);
  const off = mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;
  const inCart = cartItems.some((i: any) => Number(i?.id) === variant.id);

  const add = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await addItemToCart(product.id, 1, product);
      trackAddToCart({
        item_id: product.id,
        item_name: product.title,
        item_category: product.category || undefined,
        item_brand: "Vyra Herbals",
        item_variant: variant.label,
        price,
        quantity: 1,
        currency: "INR",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className="bs-card">
      <Link href={`/product/${product.handle}`} className="bs-media" aria-label={`View ${product.title}`}>
        {off > 0 && <span className="bs-off">{off}% OFF</span>}
        {product.image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.image_url} alt={product.title} width={320} height={320} loading="lazy" />
        )}
      </Link>
      <div className="bs-body">
        <h3>
          <Link href={`/product/${product.handle}`}>{family.name}</Link>
        </h3>
        <p className="bs-blurb">{family.blurb}</p>

        {family.variants.length > 1 && (
          <div className="chips" role="radiogroup" aria-label={`${family.name} size`}>
            {family.variants.map((v, i) => (
              <button
                key={v.id}
                type="button"
                role="radio"
                aria-checked={i === idx}
                className={`chip${i === idx ? " is-on" : ""}`}
                onClick={() => setIdx(i)}
              >
                {v.label}
              </button>
            ))}
          </div>
        )}

        {social && <p className="bs-social">{social}</p>}

        <div className="bs-price" aria-live="polite">
          <strong>{formatINR(price)}</strong>
          {mrp > price && <s>{formatINR(mrp)}</s>}
        </div>

        {inCart ? (
          <Link href="/cart" className="bs-add is-in">
            <Check size={18} strokeWidth={2.5} aria-hidden="true" /> In cart, view cart
          </Link>
        ) : (
          <button type="button" className="bs-add" onClick={add} disabled={busy}>
            <ShoppingCart size={18} strokeWidth={2} aria-hidden="true" />
            {busy ? "Adding..." : "Add to Cart"}
          </button>
        )}
      </div>
    </li>
  );
};

const BestSellersSelector = () => {
  const catalogue = useCatalogue(ALL_IDS);
  const [tab, setTab] = useState<"best" | "kits">("best");
  const list = tab === "best" ? BEST_SELLERS : KITS;
  return (
    <Section id="bestSellers" aria-labelledby="bs-heading">
      <div className="container">
        <header className="head">
          <span className="eyebrow">
            <Star size={13} strokeWidth={2} aria-hidden="true" /> Customer favourites
          </span>
          <h2 id="bs-heading">Best sellers and recommended kits</h2>
          <p>Pick a size, see the price instantly, add to cart in one tap.</p>
        </header>

        <div className="bs-tabs" role="tablist" aria-label="Product groups">
          <button
            type="button"
            role="tab"
            id="bs-tab-best"
            aria-selected={tab === "best"}
            aria-controls="bs-panel"
            className={tab === "best" ? "is-on" : ""}
            onClick={() => setTab("best")}
          >
            Best Sellers
          </button>
          <button
            type="button"
            role="tab"
            id="bs-tab-kits"
            aria-selected={tab === "kits"}
            aria-controls="bs-panel"
            className={tab === "kits" ? "is-on" : ""}
            onClick={() => setTab("kits")}
          >
            Recommended Kits
          </button>
        </div>

        <ul className="bs-grid" id="bs-panel" role="tabpanel" aria-labelledby={`bs-tab-${tab}`}>
          {list.map((f) => (
            <FamilyCard key={f.key} family={f} catalogue={catalogue} />
          ))}
        </ul>

        <div className="bs-more">
          <Link href={tab === "best" ? "/category/hair-oil" : "/category/kits"}>
            {tab === "best" ? "Shop all products" : "See all kits and combos"}
          </Link>
        </div>
      </div>
    </Section>
  );
};

export default BestSellersSelector;

const Section = styled.section`
  background: ${BRAND.linen};
  padding: 72px 0;
  font-family: ${BRAND.body};

  .head {
    text-align: center;
    margin-bottom: 32px;
  }
  .eyebrow {
    display: inline-flex;
    align-items: center;
    gap: 6px;
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
    margin: 0 0 8px;
    font-weight: 600;
  }
  .head p {
    margin: 0;
    color: ${BRAND.muted};
  }
  .bs-tabs {
    display: flex;
    justify-content: center;
    gap: 8px;
    margin: 0 auto 24px;
    padding: 4px;
    width: fit-content;
    max-width: 100%;
    background: ${BRAND.white};
    border: 1px solid ${BRAND.line};
    border-radius: 999px;
  }
  .bs-tabs button {
    min-height: 44px;
    padding: 0 22px;
    border: 0;
    border-radius: 999px;
    background: transparent;
    color: ${BRAND.forest};
    font-weight: 700;
    font-size: 14px;
    cursor: pointer;
    transition: background 0.2s ease, color 0.2s ease;
  }
  .bs-tabs button.is-on {
    background: ${BRAND.forest};
    color: ${BRAND.white};
  }
  .bs-social {
    margin: -6px 0 10px;
    font-size: 12px;
    font-weight: 600;
    color: ${BRAND.sage};
  }
  .bs-more {
    text-align: center;
    margin-top: 24px;
  }
  .bs-more a {
    display: inline-flex;
    align-items: center;
    min-height: 44px;
    color: ${BRAND.forest};
    font-weight: 700;
    text-decoration: underline;
  }
  .bs-grid {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 18px;
  }
  .bs-card {
    display: flex;
    flex-direction: column;
    background: ${BRAND.white};
    border: 1px solid ${BRAND.line};
    border-radius: 18px;
    overflow: hidden;
    transition: transform 0.25s ease, box-shadow 0.25s ease;
  }
  .bs-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 16px 34px rgba(27, 59, 43, 0.12);
  }
  .bs-media {
    position: relative;
    display: block;
    aspect-ratio: 1 / 1;
    background: ${BRAND.sageSoft};
    overflow: hidden;
  }
  .bs-media img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.4s ease;
  }
  .bs-card:hover .bs-media img {
    transform: scale(1.04);
  }
  .bs-off {
    position: absolute;
    top: 12px;
    left: 12px;
    z-index: 1;
    background: ${BRAND.forest};
    color: ${BRAND.white};
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.06em;
    padding: 5px 10px;
    border-radius: 999px;
  }
  .bs-body {
    display: flex;
    flex-direction: column;
    flex: 1;
    padding: 18px;
  }
  .bs-body h3 {
    font-family: ${BRAND.heading};
    font-size: 23px;
    font-weight: 600;
    margin: 0 0 6px;
    line-height: 1.15;
  }
  .bs-body h3 a {
    color: ${BRAND.forest};
    text-decoration: none;
  }
  .bs-blurb {
    font-size: 13px;
    color: ${BRAND.muted};
    line-height: 1.55;
    margin: 0 0 14px;
    flex: 1;
  }
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 14px;
  }
  .chip {
    min-height: 44px;
    min-width: 44px;
    padding: 0 14px;
    border-radius: 999px;
    border: 1.5px solid ${BRAND.line};
    background: ${BRAND.white};
    color: ${BRAND.forest};
    font-weight: 700;
    font-size: 13px;
    cursor: pointer;
    transition: background 0.2s ease, color 0.2s ease, border-color 0.2s ease;
  }
  .chip:hover {
    border-color: ${BRAND.sage};
  }
  .chip.is-on {
    background: ${BRAND.forest};
    color: ${BRAND.white};
    border-color: ${BRAND.forest};
  }
  .chip:focus-visible,
  .bs-add:focus-visible {
    outline: 3px solid ${BRAND.sage};
    outline-offset: 2px;
  }
  .bs-price {
    display: flex;
    align-items: baseline;
    gap: 10px;
    margin-bottom: 14px;
    color: ${BRAND.forest};
  }
  .bs-price strong {
    font-size: 24px;
  }
  .bs-price s {
    color: ${BRAND.muted};
    font-size: 14px;
  }
  .bs-add {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    min-height: 48px;
    width: 100%;
    border: 0;
    border-radius: 12px;
    background: ${BRAND.forest};
    color: ${BRAND.white};
    font-weight: 700;
    font-size: 14px;
    letter-spacing: 0.04em;
    text-decoration: none;
    cursor: pointer;
    transition: background 0.2s ease, transform 0.15s ease;
  }
  .bs-add:hover:not(:disabled) {
    background: ${BRAND.forestDeep};
  }
  .bs-add:active:not(:disabled) {
    transform: scale(0.98);
  }
  .bs-add:disabled {
    background: ${BRAND.sage};
  }
  .bs-add.is-in {
    background: ${BRAND.sageSoft};
    color: ${BRAND.forest};
  }

  @media (max-width: ${BREAKPOINTS.tablet}) {
    padding: 56px 0;
    .bs-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }
  @media (max-width: ${BREAKPOINTS.mobile}) {
    padding: 44px 0;
    .bs-grid {
      gap: 12px;
    }
    .bs-body {
      padding: 12px;
    }
    .bs-body h3 {
      font-size: 19px;
    }
    .bs-blurb {
      display: none;
    }
    .chip {
      padding: 0 10px;
      font-size: 12px;
    }
    .bs-add {
      font-size: 12.5px;
      letter-spacing: 0.02em;
    }
  }
`;
