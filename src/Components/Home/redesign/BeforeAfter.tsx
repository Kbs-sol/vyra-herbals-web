"use client";

import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { ShieldCheck, Maximize2 } from "lucide-react";
import { API_PATH } from "../../../constants";
import { BRAND, BREAKPOINTS } from "./brand";
import Lightbox from "./Lightbox";

/**
 * Dedicated Before & After section. Images come from Admin > Before & After
 * (before_after_images). Each uploaded image is already a Before | After
 * composite, so we show it full-width, uncropped, with clear labels.
 */
const BeforeAfter = () => {
  const [photos, setPhotos] = useState<string[]>([]);
  const [open, setOpen] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_PATH}/data`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tbl_name: "before_after_images", status: 1, extra_condition: "ORDER BY created_at DESC LIMIT 12" }),
    })
      .then((r) => (r.ok ? r.json() : []))
      .then((rows) => {
        if (cancelled || !Array.isArray(rows)) return;
        setPhotos(rows.map((r: any) => r.image_url).filter(Boolean));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (!photos.length) return null;

  return (
    <Section id="beforeAfter" aria-labelledby="ba-heading">
      <div className="container">
        <header className="head">
          <span className="eyebrow">Visible progress</span>
          <h2 id="ba-heading">Before &amp; After</h2>
          <p>Photos shared by customers after consistent use. Results vary with hair type and routine.</p>
        </header>

        <ul className="rail" aria-label="Before and after photos">
          {photos.map((src, i) => (
            <li key={src + i} className="ba-card">
              <button type="button" onClick={() => setOpen(i)} aria-label={`View before and after photo ${i + 1} full size`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt={`Customer before and after hair photo ${i + 1}`} loading="lazy" width={340} height={340} />
                <span className="zoom" aria-hidden="true"><Maximize2 size={14} /></span>
              </button>
            </li>
          ))}
        </ul>

        <p className="note">
          <ShieldCheck size={15} aria-hidden="true" /> Unedited customer photos. Natural herbal care works gradually: stay consistent for 6 to 8 weeks.
        </p>
      </div>

      {open !== null && (
        <Lightbox
          images={photos.map((src, i) => ({ src, alt: `Customer before and after hair photo ${i + 1}` }))}
          index={open}
          onIndex={setOpen}
          onClose={() => setOpen(null)}
        />
      )}
    </Section>
  );
};

export default BeforeAfter;

const Section = styled.section`
  background: ${BRAND.linen};
  padding: 64px 0;
  font-family: ${BRAND.body};

  .head { max-width: 640px; margin: 0 auto 28px; text-align: center; }
  .eyebrow { font-size: 12px; letter-spacing: 0.16em; text-transform: uppercase; font-weight: 700; color: ${BRAND.sage}; }
  h2 { font-family: ${BRAND.heading}; font-size: clamp(32px, 4.4vw, 46px); font-weight: 600; color: ${BRAND.forest}; margin: 8px 0 10px; line-height: 1.1; }
  .head p { color: ${BRAND.muted}; margin: 0; font-size: 15.5px; line-height: 1.6; }

  .rail {
    list-style: none; margin: 0 -12px; padding: 4px 12px 14px; display: flex; gap: 16px;
    overflow-x: auto; scroll-snap-type: x mandatory; -webkit-overflow-scrolling: touch; scrollbar-width: thin;
  }
  .ba-card { flex: 0 0 min(340px, 84vw); scroll-snap-align: center; }
  .ba-card button {
    position: relative; display: block; width: 100%; padding: 0; border: 1px solid ${BRAND.line};
    border-radius: 20px; overflow: hidden; background: ${BRAND.white}; cursor: zoom-in;
    box-shadow: 0 12px 30px rgba(27, 59, 43, 0.12);
  }
  .ba-card img { display: block; width: 100%; height: auto; aspect-ratio: 1 / 1; object-fit: contain; background: ${BRAND.white}; }
  .zoom {
    position: absolute; right: 10px; bottom: 10px; width: 30px; height: 30px; border-radius: 50%;
    background: rgba(27, 59, 43, 0.85); color: #fff; display: inline-flex; align-items: center; justify-content: center;
  }
  .note { display: flex; align-items: center; justify-content: center; gap: 6px; margin: 14px 0 0; font-size: 12.5px; color: ${BRAND.muted}; text-align: center; }

  @media (min-width: ${BREAKPOINTS.tablet}) {
    .ba-card { flex-basis: calc(25% - 12px); }
    .rail { margin: 0; padding-inline: 0; }
  }
  @media (max-width: ${BREAKPOINTS.mobile}) { padding: 44px 0; }
`;
