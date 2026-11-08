"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import styled from "styled-components";
import {
  TrendingDown,
  Zap,
  Shield,
  Droplet,
  ShoppingCart,
  Check,
  Moon,
  Sun,
  Feather,
  Leaf,
  Clock,
} from "lucide-react";
import { useCart } from "../../Contexts/CartContext";
import { addToCart as trackAddToCart } from "../../../utils/analytics";
import { BRAND, BREAKPOINTS, CONCERNS, ROUTINE_STEPS, formatINR, ConcernDef } from "./brand";
import { useCatalogue } from "./useCatalogue";

const CONCERN_ICONS = { TrendingDown, Zap, Shield, Droplet } as const;
const ROUTINE_ICONS = [Moon, Sun, Feather] as const;

const ALL_IDS = Array.from(new Set(CONCERNS.flatMap((c) => c.productIds)));

const ConcernRoutineBuilder = () => {
  const { addItemToCart } = useCart();
  const [activeKey, setActiveKey] = useState<ConcernDef["key"]>(CONCERNS[0].key);
  const [unchecked, setUnchecked] = useState<Record<number, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [added, setAdded] = useState(false);

  const concern = CONCERNS.find((c) => c.key === activeKey) ?? CONCERNS[0];
  const catalogue = useCatalogue(ALL_IDS);

  const products = useMemo(
    () =>
      concern.productIds
        .map((id) => catalogue.find((p) => Number(p.id) === id))
        .filter(Boolean) as typeof catalogue,
    [concern, catalogue]
  );

  const selected = products.filter((p) => !unchecked[p.id]);
  const total = selected.reduce((sum, p) => sum + Number(p.price || 0), 0);
  const mrpTotal = selected.reduce((sum, p) => sum + Number(p.regular_price || p.price || 0), 0);
  const savings = Math.max(0, mrpTotal - total);

  // Reset the "added" confirmation whenever the shopper changes anything.
  useEffect(() => {
    setAdded(false);
  }, [activeKey, unchecked]);

  const switchConcern = (key: ConcernDef["key"]) => {
    setActiveKey(key);
    setUnchecked({});
  };

  const toggle = (id: number) => setUnchecked((u) => ({ ...u, [id]: !u[id] }));

  const addAll = async () => {
    if (!selected.length || busy) return;
    setBusy(true);
    try {
      for (const p of selected) {
        await addItemToCart(p.id, 1, p);
        trackAddToCart({
          item_id: p.id,
          item_name: p.title,
          item_category: p.category || undefined,
          item_brand: "Vyra Herbals",
          price: Number(p.price || 0),
          quantity: 1,
          currency: "INR",
        });
      }
      setAdded(true);
    } finally {
      setBusy(false);
    }
  };

  const onTabKey = (e: React.KeyboardEvent, index: number) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const next =
      (index + (e.key === "ArrowRight" ? 1 : -1) + CONCERNS.length) % CONCERNS.length;
    switchConcern(CONCERNS[next].key);
    document.getElementById(`concern-tab-${CONCERNS[next].key}`)?.focus();
  };

  return (
    <Section id="concern-builder" aria-labelledby="builder-heading">
      <div className="container">
        <header className="builder-head">
          <span className="eyebrow">Your hair, your routine</span>
          <h2 id="builder-heading">Tell us your concern. Get a routine that fits.</h2>
          <p>
            Pick what you are dealing with. We will show the likely cause, how our herbs help,
            and the exact products and weekly steps to follow.
          </p>
        </header>

        {/* Step A */}
        <div className="step-label">
          <span className="step-num">A</span> Choose your main concern
        </div>
        <div className="concern-tabs" role="tablist" aria-label="Hair concerns">
          {CONCERNS.map((c, i) => {
            const Icon = CONCERN_ICONS[c.icon];
            const on = c.key === activeKey;
            return (
              <button
                key={c.key}
                id={`concern-tab-${c.key}`}
                role="tab"
                type="button"
                aria-selected={on}
                aria-controls="concern-panel"
                tabIndex={on ? 0 : -1}
                className={`concern-tab${on ? " is-active" : ""}`}
                onClick={() => switchConcern(c.key)}
                onKeyDown={(e) => onTabKey(e, i)}
              >
                <Icon size={20} strokeWidth={1.75} aria-hidden="true" />
                <span>{c.tab}</span>
              </button>
            );
          })}
        </div>

        <div
          id="concern-panel"
          role="tabpanel"
          aria-labelledby={`concern-tab-${concern.key}`}
          className="builder-grid"
        >
          {/* Step B */}
          <article className="insight-card" key={concern.key}>
            <div className="step-label">
              <span className="step-num">B</span> Why it happens, how we help
            </div>
            <h3>Root cause</h3>
            <p>{concern.rootCause}</p>
            <h3>How our herbs work</h3>
            <p>{concern.howHerbsWork}</p>
            <div className="expect">
              <Clock size={18} strokeWidth={1.75} aria-hidden="true" />
              <p>
                <strong>What to expect, honestly.</strong> {concern.expectation}
              </p>
            </div>
          </article>

          {/* Step C */}
          <aside className="routine-card" aria-label="Recommended products">
            <div className="step-label">
              <span className="step-num">C</span> Your recommended routine
            </div>
            <ul className="pick-list">
              {products.map((p) => {
                const on = !unchecked[p.id];
                return (
                  <li key={p.id} className={`pick${on ? " is-on" : ""}`}>
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={on}
                      aria-label={`${on ? "Remove" : "Include"} ${p.title}`}
                      className="pick-check"
                      onClick={() => toggle(p.id)}
                    >
                      <Check size={16} strokeWidth={3} aria-hidden="true" />
                    </button>
                    {p.image_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.image_url} alt="" width={56} height={56} loading="lazy" />
                    )}
                    <div className="pick-info">
                      <Link href={`/product/${p.handle}`} className="pick-title">
                        {p.title}
                      </Link>
                      <span className="pick-why">{concern.why[p.id]}</span>
                    </div>
                    <div className="pick-price">
                      <strong>{formatINR(Number(p.price))}</strong>
                      {p.regular_price && Number(p.regular_price) > Number(p.price) && (
                        <s>{formatINR(Number(p.regular_price))}</s>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>

            <div className="totals" aria-live="polite">
              <span>
                {selected.length} of {products.length} selected
              </span>
              <span className="totals-amt">
                {savings > 0 && <em>You save {formatINR(savings)}</em>}
                <strong>{formatINR(total)}</strong>
              </span>
            </div>

            <button
              type="button"
              className="add-all"
              onClick={addAll}
              disabled={!selected.length || busy}
            >
              {added ? (
                <>
                  <Check size={18} strokeWidth={2.5} aria-hidden="true" />
                  Added to cart
                </>
              ) : (
                <>
                  <ShoppingCart size={18} strokeWidth={2} aria-hidden="true" />
                  {busy
                    ? "Adding..."
                    : selected.length
                    ? `ADD ${selected.length} RECOMMENDED PRODUCT${selected.length > 1 ? "S" : ""} TO CART \u2014 ${formatINR(total)}`
                    : "SELECT AT LEAST ONE PRODUCT"}
                </>
              )}
            </button>
            {added && (
              <Link href="/cart" className="go-cart">
                Review cart and checkout
              </Link>
            )}
            <p className="micro">
              <Leaf size={14} strokeWidth={1.75} aria-hidden="true" /> 100% natural, free pan-India
              delivery, secure checkout.
            </p>
          </aside>
        </div>

        {/* Step D */}
        <div className="routine-timeline">
          <div className="step-label">
            <span className="step-num">D</span> Your simple weekly routine
          </div>
          <ol className="timeline">
            {ROUTINE_STEPS.map((s, i) => {
              const Icon = ROUTINE_ICONS[i];
              return (
                <li key={s.title} className="timeline-step">
                  <span className="timeline-icon">
                    <Icon size={22} strokeWidth={1.75} aria-hidden="true" />
                  </span>
                  <div>
                    <h4>
                      {s.title} <small>{s.when}</small>
                    </h4>
                    <p>{s.detail}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </Section>
  );
};

export default ConcernRoutineBuilder;

const Section = styled.section`
  background: ${BRAND.linen};
  padding: 72px 0;
  color: ${BRAND.charcoal};
  font-family: ${BRAND.body};

  .builder-head {
    max-width: 720px;
    margin: 0 auto 36px;
    text-align: center;
  }
  .eyebrow {
    display: inline-block;
    font-size: 12px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: ${BRAND.sage};
    font-weight: 700;
    margin-bottom: 10px;
  }
  h2 {
    font-family: ${BRAND.heading};
    font-size: clamp(30px, 4.2vw, 46px);
    line-height: 1.12;
    color: ${BRAND.forest};
    margin: 0 0 12px;
    font-weight: 600;
  }
  .builder-head p {
    color: ${BRAND.muted};
    margin: 0;
    font-size: 16px;
    line-height: 1.6;
  }

  .step-label {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 13px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    font-weight: 700;
    color: ${BRAND.forest};
    margin-bottom: 14px;
  }
  .step-num {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    border-radius: 50%;
    background: ${BRAND.forest};
    color: ${BRAND.white};
    font-size: 12px;
  }

  .concern-tabs {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
    margin-bottom: 28px;
  }
  .concern-tab {
    display: flex;
    align-items: center;
    gap: 10px;
    min-height: 56px;
    padding: 12px 16px;
    background: ${BRAND.white};
    border: 1px solid ${BRAND.line};
    border-radius: ${BRAND.radius};
    color: ${BRAND.forest};
    font-weight: 600;
    font-size: 14px;
    text-align: left;
    cursor: pointer;
    transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease, color 0.2s ease;
  }
  .concern-tab:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 22px rgba(27, 59, 43, 0.1);
  }
  .concern-tab:focus-visible,
  .pick-check:focus-visible,
  .add-all:focus-visible {
    outline: 3px solid ${BRAND.sage};
    outline-offset: 2px;
  }
  .concern-tab.is-active {
    background: ${BRAND.forest};
    color: ${BRAND.white};
    border-color: ${BRAND.forest};
  }

  .builder-grid {
    display: grid;
    grid-template-columns: 1.05fr 1fr;
    gap: 24px;
    align-items: start;
  }
  .insight-card,
  .routine-card {
    background: ${BRAND.white};
    border: 1px solid ${BRAND.line};
    border-radius: 18px;
    padding: 28px;
  }
  .insight-card {
    animation: fadeUp 0.35s ease both;
  }
  @keyframes fadeUp {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
    to {
      opacity: 1;
      transform: none;
    }
  }
  .insight-card h3 {
    font-family: ${BRAND.heading};
    font-size: 24px;
    color: ${BRAND.forest};
    margin: 6px 0 6px;
    font-weight: 600;
  }
  .insight-card p {
    color: ${BRAND.charcoal};
    line-height: 1.7;
    font-size: 15px;
    margin: 0 0 14px;
  }
  .expect {
    display: flex;
    gap: 12px;
    background: ${BRAND.sageSoft};
    border-radius: 12px;
    padding: 14px 16px;
    color: ${BRAND.forest};
  }
  .expect svg {
    flex: none;
    margin-top: 3px;
  }
  .expect p {
    margin: 0;
    font-size: 14px;
  }

  .pick-list {
    list-style: none;
    margin: 0 0 16px;
    padding: 0;
    display: grid;
    gap: 10px;
  }
  .pick {
    display: grid;
    grid-template-columns: 44px 56px 1fr auto;
    align-items: center;
    gap: 12px;
    padding: 10px 12px;
    border: 1px solid ${BRAND.line};
    border-radius: 12px;
    opacity: 0.55;
    transition: opacity 0.2s ease, border-color 0.2s ease, background 0.2s ease;
  }
  .pick.is-on {
    opacity: 1;
    border-color: ${BRAND.sage};
    background: ${BRAND.linen};
  }
  .pick img {
    border-radius: 8px;
    object-fit: cover;
    width: 56px;
    height: 56px;
    background: ${BRAND.sageSoft};
  }
  .pick-check {
    width: 44px;
    height: 44px;
    border-radius: 10px;
    border: 1.5px solid ${BRAND.sage};
    background: ${BRAND.white};
    color: transparent;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: background 0.2s ease, color 0.2s ease;
  }
  .pick.is-on .pick-check {
    background: ${BRAND.forest};
    border-color: ${BRAND.forest};
    color: ${BRAND.white};
  }
  .pick-info {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }
  .pick-title {
    color: ${BRAND.forest};
    font-weight: 700;
    font-size: 14px;
    line-height: 1.3;
    text-decoration: none;
  }
  .pick-title:hover {
    text-decoration: underline;
  }
  .pick-why {
    font-size: 12.5px;
    color: ${BRAND.muted};
    margin-top: 2px;
  }
  .pick-price {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    font-size: 15px;
    color: ${BRAND.forest};
  }
  .pick-price s {
    font-size: 12px;
    color: ${BRAND.muted};
  }

  .totals {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 4px;
    border-top: 1px dashed ${BRAND.line};
    font-size: 14px;
    color: ${BRAND.muted};
  }
  .totals-amt {
    display: flex;
    align-items: baseline;
    gap: 12px;
  }
  .totals-amt em {
    font-style: normal;
    color: ${BRAND.sage};
    font-weight: 700;
    font-size: 13px;
  }
  .totals-amt strong {
    font-size: 24px;
    color: ${BRAND.forest};
  }

  .add-all {
    width: 100%;
    min-height: 54px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 14px 18px;
    background: ${BRAND.forest};
    color: ${BRAND.white};
    border: 0;
    border-radius: 12px;
    font-weight: 700;
    font-size: 14px;
    letter-spacing: 0.04em;
    cursor: pointer;
    transition: transform 0.15s ease, background 0.2s ease, box-shadow 0.2s ease;
  }
  .add-all:hover:not(:disabled) {
    background: ${BRAND.forestDeep};
    box-shadow: 0 10px 24px rgba(27, 59, 43, 0.28);
    transform: translateY(-1px);
  }
  .add-all:active:not(:disabled) {
    transform: scale(0.99);
  }
  .add-all:disabled {
    background: ${BRAND.sage};
    cursor: not-allowed;
  }
  .go-cart {
    display: flex;
    min-height: 44px;
    align-items: center;
    justify-content: center;
    margin-top: 10px;
    color: ${BRAND.forest};
    font-weight: 700;
    font-size: 14px;
    text-decoration: underline;
  }
  .micro {
    display: flex;
    gap: 6px;
    align-items: center;
    justify-content: center;
    margin: 12px 0 0;
    font-size: 12.5px;
    color: ${BRAND.muted};
  }

  .routine-timeline {
    margin-top: 36px;
    background: ${BRAND.forest};
    color: ${BRAND.white};
    border-radius: 18px;
    padding: 28px;
  }
  .routine-timeline .step-label {
    color: ${BRAND.white};
  }
  .routine-timeline .step-num {
    background: ${BRAND.white};
    color: ${BRAND.forest};
  }
  .timeline {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 20px;
  }
  .timeline-step {
    display: flex;
    gap: 14px;
    align-items: flex-start;
  }
  .timeline-icon {
    flex: none;
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.12);
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
  .timeline-step h4 {
    margin: 2px 0 4px;
    font-family: ${BRAND.heading};
    font-size: 22px;
    font-weight: 600;
    color: ${BRAND.white};
  }
  .timeline-step h4 small {
    font-family: ${BRAND.body};
    font-size: 11px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    background: rgba(255, 255, 255, 0.16);
    padding: 3px 8px;
    border-radius: 99px;
    margin-left: 6px;
    vertical-align: middle;
  }
  .timeline-step p {
    margin: 0;
    font-size: 14px;
    line-height: 1.6;
    color: rgba(255, 255, 255, 0.86);
  }

  @media (max-width: ${BREAKPOINTS.tablet}) {
    padding: 56px 0;
    .concern-tabs {
      grid-template-columns: repeat(2, 1fr);
    }
    .builder-grid {
      grid-template-columns: 1fr;
    }
    .timeline {
      grid-template-columns: 1fr;
    }
  }
  @media (max-width: ${BREAKPOINTS.mobile}) {
    padding: 44px 0;
    .concern-tabs {
      display: flex;
      overflow-x: auto;
      scroll-snap-type: x mandatory;
      margin-inline: -12px;
      padding: 2px 12px 8px;
      gap: 10px;
    }
    .concern-tab {
      flex: 0 0 auto;
      scroll-snap-align: start;
      white-space: nowrap;
    }
    .insight-card,
    .routine-card,
    .routine-timeline {
      padding: 20px;
    }
    .pick {
      grid-template-columns: 44px 48px 1fr;
    }
    .pick img {
      width: 48px;
      height: 48px;
    }
    .pick-price {
      grid-column: 3;
      flex-direction: row;
      align-items: baseline;
      gap: 8px;
    }
    .add-all {
      font-size: 13px;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    * {
      animation: none !important;
      transition: none !important;
    }
  }
`;
