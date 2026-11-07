"use client";

import React from "react";
import styled from "styled-components";
import { Droplet, Feather, Shield, Truck } from "lucide-react";
import { BRAND, BREAKPOINTS } from "./brand";

const ITEMS = [
  { Icon: Droplet, text: "100% Natural Herbal Haircare" },
  { Icon: Feather, text: "Hand-Made in India" },
  { Icon: Shield, text: "Zero Sulfates, Parabens & Mineral Oils" },
  { Icon: Truck, text: "Free Pan-India Delivery" },
];

const TrustTicker = () => (
  <Bar aria-label="Why shoppers trust Vyra Herbals">
    <ul className="ticker-track">
      {ITEMS.map(({ Icon, text }) => (
        <li key={text}>
          <Icon size={16} strokeWidth={1.75} aria-hidden="true" />
          <span>{text}</span>
        </li>
      ))}
      {/* Duplicate set powers the seamless mobile marquee; hidden from assistive tech. */}
      {ITEMS.map(({ Icon, text }) => (
        <li key={`dup-${text}`} className="ticker-dup" aria-hidden="true">
          <Icon size={16} strokeWidth={1.75} />
          <span>{text}</span>
        </li>
      ))}
    </ul>
  </Bar>
);

export default TrustTicker;

const Bar = styled.section`
  background: ${BRAND.forest};
  color: ${BRAND.white};
  overflow: hidden;
  font-family: ${BRAND.body};

  .ticker-track {
    list-style: none;
    margin: 0 auto;
    padding: 0 16px;
    max-width: 1320px;
    min-height: 44px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 24px;
  }
  li {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 12.5px;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    white-space: nowrap;
    color: #eaf1ec;
  }
  li svg {
    color: ${BRAND.sage};
    flex: none;
  }
  .ticker-dup {
    display: none;
  }

  @media (max-width: ${BREAKPOINTS.tablet}) {
    .ticker-track {
      justify-content: center;
      flex-wrap: wrap;
      gap: 6px 20px;
      padding: 8px 16px;
    }
  }
  @media (max-width: ${BREAKPOINTS.mobile}) {
    .ticker-track {
      flex-wrap: nowrap;
      justify-content: flex-start;
      width: max-content;
      max-width: none;
      gap: 36px;
      padding: 0 18px;
      animation: vyra-marquee 26s linear infinite;
    }
    .ticker-dup {
      display: inline-flex;
    }
    @keyframes vyra-marquee {
      to {
        transform: translateX(-50%);
      }
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .ticker-track {
      animation: none;
      width: auto;
      flex-wrap: wrap;
      justify-content: center;
    }
    .ticker-dup {
      display: none;
    }
  }
`;
