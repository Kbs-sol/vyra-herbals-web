"use client";

import React from "react";
import styled from "styled-components";
import { BRAND, BREAKPOINTS } from "./brand";

const BADGES = [
  { src: "/assets/images/certificates/certificate-02.webp", label: "ISO 9001:2015", sub: "Certified quality management", alt: "ISO 9001:2015 certified company badge", pad: 10 },
  { src: "/assets/images/certificates/certificate-01.webp", label: "GMP Certified", sub: "Good Manufacturing Practice", alt: "GMP certified, Good Manufacturing Practice badge", pad: 10 },
  { src: "/assets/images/certificates/certificate-03.webp", label: "MSME India", sub: "Government of India registered", alt: "MSME registered, Ministry of Micro, Small and Medium Enterprises, Government of India", pad: 24 },
  { src: "/assets/images/certificates/certificate-04.webp", label: "Sulfate-Free & Cruelty-Free", sub: "Gentle on scalp, kind to animals", alt: "Sulphate free badge", pad: 10 },
];

const CertificationBadges = () => (
  <Section id="certifications" aria-labelledby="cert-heading">
    <div className="container">
      <header className="head">
        <span className="eyebrow">Trust, verified</span>
        <h2 id="cert-heading">Certified quality, honest formulas</h2>
      </header>
      <ul className="badge-row">
        {BADGES.map((b) => (
          <li key={b.label} className="badge">
            <span className="badge-circle">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={b.src}
                alt={b.alt}
                width={160}
                height={160}
                loading="lazy"
                style={{ padding: b.pad }}
              />
            </span>
            <strong>{b.label}</strong>
            <span className="badge-sub">{b.sub}</span>
          </li>
        ))}
      </ul>
    </div>
  </Section>
);

export default CertificationBadges;

const Section = styled.section`
  background: ${BRAND.white};
  padding: 64px 0;
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
  .badge-row {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 24px;
  }
  .badge {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 4px;
  }
  .badge-circle {
    width: 168px;
    height: 168px;
    border-radius: 50%;
    background: ${BRAND.linen};
    border: 1px solid ${BRAND.line};
    display: inline-flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    margin-bottom: 10px;
    transition: transform 0.25s ease, box-shadow 0.25s ease;
  }
  .badge:hover .badge-circle {
    transform: translateY(-4px) scale(1.02);
    box-shadow: 0 14px 28px rgba(27, 59, 43, 0.14);
  }
  .badge-circle img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    background: transparent;
  }
  .badge strong {
    color: ${BRAND.forest};
    font-size: 15px;
  }
  .badge-sub {
    color: ${BRAND.muted};
    font-size: 12.5px;
  }

  @media (max-width: ${BREAKPOINTS.tablet}) {
    .badge-row {
      grid-template-columns: repeat(2, 1fr);
      row-gap: 32px;
    }
  }
  @media (max-width: ${BREAKPOINTS.mobile}) {
    padding: 44px 0;
    .badge-circle {
      width: 132px;
      height: 132px;
    }
    .badge-row {
      gap: 16px;
    }
  }
`;
