"use client";

import React from "react";
import styled from "styled-components";
import { Leaf, Droplet, Ban, Sprout } from "lucide-react";
import { BRAND, BREAKPOINTS } from "./brand";

const PILLARS = [
  {
    Icon: Droplet,
    title: "Cold-infused whole herbs",
    body: "Whole herbs are steeped slowly in virgin botanical oils, with no high heat, so their goodness stays in the bottle.",
  },
  {
    Icon: Ban,
    title: "Zero synthetic fillers",
    body: "No sulfates, parabens or mineral oils, and no filler ingredients added to make a formula look bigger than it is.",
  },
  {
    Icon: Sprout,
    title: "Sustainable sourcing",
    body: "We choose botanicals with care and keep our formulas simple, so there is less waste and more of what your hair can actually use.",
  },
  {
    Icon: Leaf,
    title: "Hand-made in India",
    body: "Hand-made herbal formulations, produced in India under GMP guidelines and quality-checked before they ship.",
  },
];

const HerbalPhilosophy = () => (
  <Section id="herbal-philosophy" aria-labelledby="phil-heading">
    <div className="container">
      <div className="phil-grid">
        <header className="phil-intro">
          <span className="eyebrow">Our philosophy</span>
          <h2 id="phil-heading">Hand-made herbal care, with nothing to hide</h2>
          <p>
            We believe you should know what is in your bottle and why. Every Vyra formula is built
            from 100% Natural Botanicals, and we say plainly what we leave out.
          </p>
        </header>
        <ul className="pillars">
          {PILLARS.map(({ Icon, title, body }) => (
            <li key={title} className="pillar">
              <span className="pillar-icon">
                <Icon size={22} strokeWidth={1.75} aria-hidden="true" />
              </span>
              <h3>{title}</h3>
              <p>{body}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  </Section>
);

export default HerbalPhilosophy;

const Section = styled.section`
  background: ${BRAND.forest};
  color: ${BRAND.white};
  padding: 80px 0;
  font-family: ${BRAND.body};

  .phil-grid {
    display: grid;
    grid-template-columns: 0.9fr 1.4fr;
    gap: 56px;
    align-items: center;
  }
  .eyebrow {
    display: inline-block;
    font-size: 12px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    font-weight: 700;
    color: ${BRAND.sage};
    margin-bottom: 10px;
  }
  h2 {
    font-family: ${BRAND.heading};
    font-size: clamp(30px, 4vw, 46px);
    line-height: 1.12;
    margin: 0 0 14px;
    font-weight: 600;
    color: ${BRAND.white};
  }
  .phil-intro p {
    margin: 0;
    line-height: 1.7;
    color: rgba(255, 255, 255, 0.84);
    font-size: 16px;
  }
  .pillars {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
  }
  .pillar {
    background: rgba(255, 255, 255, 0.07);
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: 18px;
    padding: 22px;
    transition: background 0.25s ease, transform 0.25s ease;
  }
  .pillar:hover {
    background: rgba(255, 255, 255, 0.12);
    transform: translateY(-3px);
  }
  .pillar-icon {
    width: 46px;
    height: 46px;
    border-radius: 50%;
    background: rgba(122, 154, 131, 0.28);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 12px;
  }
  .pillar h3 {
    font-family: ${BRAND.heading};
    font-size: 22px;
    font-weight: 600;
    margin: 0 0 6px;
    color: ${BRAND.white};
  }
  .pillar p {
    margin: 0;
    font-size: 14px;
    line-height: 1.65;
    color: rgba(255, 255, 255, 0.82);
  }

  @media (max-width: ${BREAKPOINTS.tablet}) {
    padding: 60px 0;
    .phil-grid {
      grid-template-columns: 1fr;
      gap: 28px;
    }
  }
  @media (max-width: ${BREAKPOINTS.mobile}) {
    padding: 48px 0;
    .pillars {
      grid-template-columns: 1fr;
    }
  }
`;
