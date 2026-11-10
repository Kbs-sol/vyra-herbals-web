"use client";

import React, { useState } from "react";
import Link from "next/link";
import styled from "styled-components";
import { Plus, Minus } from "lucide-react";
import JsonLd from "../../Shared/JsonLd";
import { faqJsonLd } from "../../../utils/seo";
import { BRAND, BREAKPOINTS } from "./brand";

/**
 * Answers mirror /faqs (src/PageComponents/Faqs.tsx) so the homepage never
 * contradicts the full FAQ. Shelf life: the repo holds no shelf-life data, so
 * the answer points to the printed label instead of inventing a number.
 * Owner: replace with the real figure once confirmed.
 */
export const HOME_FAQS = [
  {
    question: "Which hair types can use Vyra products?",
    answer:
      "All Vyra Herbals products are formulated for both men and women and suit all hair types. Choose your main concern in the routine builder above and we will suggest the right combination.",
  },
  {
    question: "How long does it take to see results?",
    answer:
      "Natural care works gradually and differs from person to person. Many people notice stronger roots and a calmer scalp in about 2 to 3 months of consistent use, and some take longer for a complete change.",
  },
  {
    question: "How often should I use the hair oil?",
    answer:
      "Use it 1 to 2 times a week. Warm it slightly, massage into the scalp for 5 to 7 minutes and leave it on overnight. The oil is thick in texture, so a little goes a long way.",
  },
  {
    question: "Why can the oil's colour or fragrance change?",
    answer:
      "Our formulas use natural ingredients, so colour and fragrance can vary between bottles and over time without affecting how the product works.",
  },
  {
    question: "What is the shelf life and how should I store it?",
    answer:
      "Check the batch and best-before details printed on your bottle or pack. Store it tightly closed, away from direct sunlight and moisture.",
  },
  {
    question: "Is the shampoo free from harsh chemicals?",
    answer:
      "Yes. Vyra Herbal Shampoo is free from SLS, SLES, silicones and parabens.",
  },
  {
    question: "How long does shipping take and is it free?",
    answer:
      "Delivery across India is free. Orders usually take 7 to 12 working days to arrive, and you will get a tracking number by email or text once your order ships.",
  },
  {
    question: "Do you offer Cash on Delivery?",
    answer:
      "Partial COD is available. A Rs.100 advance is paid online first and the remaining amount is paid on delivery. Prepaid orders have no extra charge.",
  },
];

const HomeFAQ = () => {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <Section id="home-faq" aria-labelledby="faq-heading">
      <JsonLd data={faqJsonLd(HOME_FAQS)} />
      <div className="container">
        <header className="head">
          <span className="eyebrow">Good to know</span>
          <h2 id="faq-heading">Frequently asked questions</h2>
        </header>
        <div className="faq-list">
          {HOME_FAQS.map((f, i) => {
            const isOpen = open === i;
            return (
              <div key={f.question} className={`faq${isOpen ? " is-open" : ""}`}>
                <h3>
                  <button
                    type="button"
                    id={`faq-q-${i}`}
                    aria-expanded={isOpen}
                    aria-controls={`faq-a-${i}`}
                    onClick={() => setOpen(isOpen ? null : i)}
                  >
                    <span>{f.question}</span>
                    {isOpen ? (
                      <Minus size={20} strokeWidth={1.75} aria-hidden="true" />
                    ) : (
                      <Plus size={20} strokeWidth={1.75} aria-hidden="true" />
                    )}
                  </button>
                </h3>
                <div
                  id={`faq-a-${i}`}
                  role="region"
                  aria-labelledby={`faq-q-${i}`}
                  hidden={!isOpen}
                  className="faq-a"
                >
                  <p>{f.answer}</p>
                </div>
              </div>
            );
          })}
        </div>
        <p className="more">
          Still have a question? <Link href="/faqs">See all FAQs</Link> or{" "}
          <Link href="/contact">contact us</Link>.
        </p>
      </div>
    </Section>
  );
};

export default HomeFAQ;

const Section = styled.section`
  background: ${BRAND.white};
  padding: 72px 0;
  font-family: ${BRAND.body};

  .head {
    text-align: center;
    margin-bottom: 28px;
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
  .faq-list {
    max-width: 820px;
    margin: 0 auto;
    display: grid;
    gap: 10px;
  }
  .faq {
    background: ${BRAND.linen};
    border: 1px solid ${BRAND.line};
    border-radius: 14px;
    transition: border-color 0.2s ease, background 0.2s ease;
  }
  .faq.is-open {
    border-color: ${BRAND.sage};
    background: ${BRAND.white};
  }
  .faq h3 {
    margin: 0;
    font-size: inherit;
  }
  .faq button {
    width: 100%;
    min-height: 56px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 12px 20px;
    background: transparent;
    border: 0;
    text-align: left;
    color: ${BRAND.forest};
    font-weight: 700;
    font-size: 15.5px;
    cursor: pointer;
    border-radius: 14px;
  }
  .faq button svg {
    flex: none;
    color: ${BRAND.sage};
  }
  .faq button:focus-visible {
    outline: 3px solid ${BRAND.sage};
    outline-offset: 2px;
  }
  .faq-a {
    padding: 0 20px 18px;
    animation: faqIn 0.25s ease both;
  }
  .faq-a p {
    margin: 0;
    color: ${BRAND.charcoal};
    line-height: 1.7;
    font-size: 14.5px;
  }
  @keyframes faqIn {
    from {
      opacity: 0;
      transform: translateY(-4px);
    }
    to {
      opacity: 1;
      transform: none;
    }
  }
  .more {
    text-align: center;
    margin: 22px 0 0;
    color: ${BRAND.muted};
    font-size: 14px;
  }
  .more a {
    color: ${BRAND.forest};
    font-weight: 700;
    text-decoration: underline;
  }

  @media (max-width: ${BREAKPOINTS.mobile}) {
    padding: 48px 0;
    .faq button {
      font-size: 14.5px;
      padding: 10px 16px;
    }
    .faq-a {
      padding: 0 16px 16px;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .faq-a {
      animation: none;
    }
  }
`;
