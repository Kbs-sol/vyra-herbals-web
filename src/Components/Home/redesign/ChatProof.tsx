"use client";

import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { MessageCircle, Instagram, ShieldCheck, Maximize2 } from "lucide-react";
import { API_PATH } from "../../../constants";
import { BRAND, BREAKPOINTS } from "./brand";
import Lightbox from "./Lightbox";

interface ChatReview {
  id: number;
  image_url: string;
  platform: "whatsapp" | "instagram";
  caption?: string | null;
  customer_label?: string | null;
}

/**
 * Real WhatsApp / Instagram chat screenshots. Managed in Admin > Chat Reviews.
 * Renders nothing until at least one visible screenshot exists, so we never
 * show an empty or invented section.
 */
const ChatProof = () => {
  const [items, setItems] = useState<ChatReview[]>([]);
  const [open, setOpen] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_PATH}/data`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tbl_name: "chat_reviews",
        status: 1,
        extra_condition: "ORDER BY sort_order ASC LIMIT 30",
      }),
    })
      .then((r) => (r.ok ? r.json() : []))
      .then((rows) => {
        if (cancelled || !Array.isArray(rows)) return;
        setItems(rows.filter((r: ChatReview) => r?.image_url));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (!items.length) return null;

  const label = (r: ChatReview) => (r.platform === "instagram" ? "Instagram" : "WhatsApp");

  return (
    <Section id="customerChatReviews" aria-labelledby="chat-heading">
      <div className="container">
        <header className="head">
          <span className="eyebrow">Unfiltered feedback</span>
          <h2 id="chat-heading">Real chats from real customers</h2>
          <p>Screenshots shared with us on WhatsApp and Instagram. Tap any chat to read it in full.</p>
        </header>

        <ul className="rail" aria-label="Customer chat screenshots">
          {items.map((r, i) => (
            <li key={r.id} className="chat-card">
              <button type="button" className="shot" onClick={() => setOpen(i)} aria-label={`Open ${label(r)} chat ${i + 1} full size`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={r.image_url} alt={r.caption || `${label(r)} chat from a Vyra customer`} loading="lazy" width={260} height={340} />
                <span className="zoom" aria-hidden="true"><Maximize2 size={14} /></span>
              </button>
              <div className="meta">
                <span className={`badge ${r.platform}`}>
                  {r.platform === "instagram" ? <Instagram size={13} aria-hidden="true" /> : <MessageCircle size={13} aria-hidden="true" />}
                  {label(r)}
                </span>
                {r.customer_label && <strong>{r.customer_label}</strong>}
                {r.caption && <span className="cap">{r.caption}</span>}
              </div>
            </li>
          ))}
        </ul>

        <p className="note">
          <ShieldCheck size={15} aria-hidden="true" /> Original screenshots, shared with customer consent. Personal details are hidden.
        </p>
      </div>

      {open !== null && (
        <Lightbox
          images={items.map((r) => ({
            src: r.image_url,
            alt: r.caption || `${label(r)} chat from a Vyra customer`,
            caption: [r.customer_label, r.caption].filter(Boolean).join(" - ") || undefined,
          }))}
          index={open}
          onIndex={setOpen}
          onClose={() => setOpen(null)}
        />
      )}
    </Section>
  );
};

export default ChatProof;

const Section = styled.section`
  background: ${BRAND.sageSoft};
  padding: 64px 0;
  font-family: ${BRAND.body};

  .head { max-width: 680px; margin: 0 auto 28px; text-align: center; }
  .eyebrow { font-size: 12px; letter-spacing: 0.16em; text-transform: uppercase; font-weight: 700; color: ${BRAND.forest}; opacity: 0.7; }
  h2 { font-family: ${BRAND.heading}; font-size: clamp(30px, 4.2vw, 44px); font-weight: 600; color: ${BRAND.forest}; margin: 8px 0 10px; line-height: 1.1; }
  .head p { color: ${BRAND.muted}; margin: 0; font-size: 15.5px; line-height: 1.6; }

  .rail {
    list-style: none; margin: 0 -12px; padding: 4px 12px 14px;
    display: flex; gap: 16px; overflow-x: auto; scroll-snap-type: x mandatory;
    -webkit-overflow-scrolling: touch; scrollbar-width: thin;
  }
  .chat-card { flex: 0 0 min(260px, 72vw); scroll-snap-align: start; display: flex; flex-direction: column; gap: 10px; }
  .shot {
    position: relative; display: block; width: 100%; padding: 0; border: 1px solid ${BRAND.line};
    border-radius: 18px; overflow: hidden; background: ${BRAND.white}; cursor: zoom-in;
    box-shadow: 0 10px 26px rgba(27, 59, 43, 0.1);
  }
  .shot img { display: block; width: 100%; height: 340px; object-fit: cover; object-position: top; }
  .zoom {
    position: absolute; right: 10px; bottom: 10px; width: 30px; height: 30px; border-radius: 50%;
    background: rgba(27, 59, 43, 0.85); color: #fff; display: inline-flex; align-items: center; justify-content: center;
  }
  .meta { display: flex; flex-direction: column; gap: 4px; padding: 0 4px; font-size: 13px; color: ${BRAND.charcoal}; }
  .badge {
    align-self: flex-start; display: inline-flex; align-items: center; gap: 5px; padding: 3px 10px;
    border-radius: 99px; font-size: 11.5px; font-weight: 700; color: #fff;
  }
  .badge.whatsapp { background: #1fa855; }
  .badge.instagram { background: #b5367a; }
  .cap { color: ${BRAND.muted}; line-height: 1.4; }
  .note { display: flex; align-items: center; justify-content: center; gap: 6px; margin: 14px 0 0; font-size: 12.5px; color: ${BRAND.muted}; text-align: center; }

  @media (min-width: ${BREAKPOINTS.tablet}) {
    .rail { justify-content: center; flex-wrap: wrap; overflow: visible; }
  }
  @media (max-width: ${BREAKPOINTS.mobile}) { padding: 44px 0; }
`;
