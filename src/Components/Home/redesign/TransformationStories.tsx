"use client";

import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { BadgeCheck, Star, Quote } from "lucide-react";
import { API_PATH } from "../../../constants";
import { BRAND, BREAKPOINTS } from "./brand";

/**
 * The reviews table has no purchase-verification column today, so we do NOT
 * claim "Verified Buyer" for rows without proof. The badge renders only when a
 * row carries `verified_buyer` or `is_verified` = true. To wire it up: add a
 * boolean column in Supabase and set it when a review is tied to a delivered
 * order. Set this to true ONLY if you accept labelling every moderated review.
 */
const BADGE_ALL_APPROVED_REVIEWS = false;

interface Review {
  id: number;
  reviewer_name?: string;
  review_text?: string;
  rating?: number;
  created_at?: string;
  verified_buyer?: boolean;
  is_verified?: boolean;
  products?: { title?: string; image_url?: string } | null;
}

const isVerified = (r: Review) =>
  Boolean(r.verified_buyer || r.is_verified) || BADGE_ALL_APPROVED_REVIEWS;

const TransformationStories = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [photos, setPhotos] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    const post = (body: object) =>
      fetch(`${API_PATH}/data`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }).then((r) => (r.ok ? r.json() : []));

    post({ tbl_name: "reviews", fields: "*, products(title, image_url)", extra_condition: "ORDER BY created_at DESC LIMIT 200" })
      .then((rows) => {
        if (cancelled || !Array.isArray(rows)) return;
        const good = rows
          .filter((r: any) => Number(r.status) === 1)
          .filter((r: Review) => Number(r.rating) >= 4 && (r.review_text || "").trim().length > 40)
          .sort((a: Review, b: Review) => (b.review_text?.length || 0) - (a.review_text?.length || 0))
          .slice(0, 6);
        setReviews(good);
      })
      .catch(() => {});

    post({ tbl_name: "before_after_images", status: 1 })
      .then((rows) => {
        if (cancelled || !Array.isArray(rows)) return;
        setPhotos(rows.map((r: any) => r.image_url).filter(Boolean).slice(0, 4));
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  // Never show an empty or invented section.
  if (!reviews.length && !photos.length) return null;

  return (
    <Section id="customerStoriesSection" aria-labelledby="stories-heading">
      <div className="container">
        <header className="head">
          <span className="eyebrow">Real results, real people</span>
          <h2 id="stories-heading">Customer transformation stories</h2>
          <p>Honest feedback from approved customer reviews.</p>
        </header>

        {photos.length > 0 && (
          <ul className="photo-row" aria-label="Customer before and after photos">
            {photos.map((src, i) => (
              <li key={src + i}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt={`Customer hair progress photo ${i + 1}`} width={280} height={280} loading="lazy" />
              </li>
            ))}
          </ul>
        )}

        {reviews.length > 0 && (
          <ul className="story-grid">
            {reviews.map((r) => (
              <li key={r.id} className="story">
                <Quote size={22} strokeWidth={1.5} className="q" aria-hidden="true" />
                <div className="stars" role="img" aria-label={`${r.rating} out of 5 stars`}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      size={15}
                      strokeWidth={1.5}
                      fill={i < Number(r.rating) ? BRAND.forest : "none"}
                      color={BRAND.forest}
                      aria-hidden="true"
                    />
                  ))}
                </div>
                <p className="text">{r.review_text}</p>
                <footer>
                  <span className="avatar" aria-hidden="true">
                    {(r.reviewer_name || "V").charAt(0).toUpperCase()}
                  </span>
                  <span className="who">
                    <strong>{r.reviewer_name || "Vyra customer"}</strong>
                    {isVerified(r) && (
                      <span className="verified">
                        <BadgeCheck size={14} strokeWidth={2} aria-hidden="true" /> Verified Buyer
                      </span>
                    )}
                    {r.products?.title && <span className="prod">{r.products.title}</span>}
                  </span>
                </footer>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Section>
  );
};

export default TransformationStories;

const Section = styled.section`
  background: ${BRAND.linen};
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
    margin: 0 0 6px;
    font-weight: 600;
  }
  .head p {
    margin: 0;
    color: ${BRAND.muted};
  }
  .photo-row {
    list-style: none;
    margin: 0 0 28px;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 14px;
  }
  .photo-row img {
    width: 100%;
    aspect-ratio: 1 / 1;
    object-fit: cover;
    border-radius: 16px;
    border: 1px solid ${BRAND.line};
  }
  .story-grid {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 18px;
  }
  .story {
    position: relative;
    display: flex;
    flex-direction: column;
    background: ${BRAND.white};
    border: 1px solid ${BRAND.line};
    border-radius: 18px;
    padding: 24px;
    transition: transform 0.25s ease, box-shadow 0.25s ease;
  }
  .story:hover {
    transform: translateY(-3px);
    box-shadow: 0 14px 30px rgba(27, 59, 43, 0.1);
  }
  .q {
    color: ${BRAND.sage};
    margin-bottom: 8px;
  }
  .stars {
    display: flex;
    gap: 2px;
    margin-bottom: 10px;
  }
  .text {
    flex: 1;
    margin: 0 0 18px;
    font-size: 14.5px;
    line-height: 1.7;
    color: ${BRAND.charcoal};
    display: -webkit-box;
    -webkit-line-clamp: 7;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  footer {
    display: flex;
    align-items: center;
    gap: 12px;
    border-top: 1px solid ${BRAND.line};
    padding-top: 14px;
  }
  .avatar {
    flex: none;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: ${BRAND.forest};
    color: ${BRAND.white};
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
  }
  .who {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }
  .who strong {
    color: ${BRAND.forest};
    font-size: 14px;
  }
  .verified {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    font-weight: 700;
    color: #2f6b47;
  }
  .prod {
    font-size: 12px;
    color: ${BRAND.muted};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  @media (max-width: ${BREAKPOINTS.tablet}) {
    padding: 56px 0;
    .story-grid {
      grid-template-columns: repeat(2, 1fr);
    }
    .photo-row {
      grid-template-columns: repeat(2, 1fr);
    }
  }
  @media (max-width: ${BREAKPOINTS.mobile}) {
    padding: 44px 0;
    .story-grid {
      display: flex;
      overflow-x: auto;
      scroll-snap-type: x mandatory;
      gap: 12px;
      margin-inline: -12px;
      padding: 2px 12px 10px;
    }
    .story {
      flex: 0 0 84%;
      scroll-snap-align: center;
    }
  }
`;
