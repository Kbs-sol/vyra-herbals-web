"use client";

import React, { useCallback, useEffect, useRef } from "react";
import styled from "styled-components";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

export interface LightboxImage {
  src: string;
  alt: string;
  caption?: string;
}

/** Accessible full-screen image viewer with keyboard + button navigation. */
const Lightbox = ({
  images,
  index,
  onClose,
  onIndex,
}: {
  images: LightboxImage[];
  index: number;
  onClose: () => void;
  onIndex: (i: number) => void;
}) => {
  const closeRef = useRef<HTMLButtonElement>(null);
  const go = useCallback(
    (d: number) => onIndex((index + d + images.length) % images.length),
    [index, images.length, onIndex]
  );

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose, go]);

  const img = images[index];
  if (!img) return null;

  return (
    <Wrap role="dialog" aria-modal="true" aria-label="Image viewer" onClick={onClose}>
      <button ref={closeRef} type="button" className="lb-close" onClick={onClose} aria-label="Close image viewer">
        <X size={24} aria-hidden="true" />
      </button>
      {images.length > 1 && (
        <button type="button" className="lb-nav prev" onClick={(e) => { e.stopPropagation(); go(-1); }} aria-label="Previous image">
          <ChevronLeft size={28} aria-hidden="true" />
        </button>
      )}
      <figure onClick={(e) => e.stopPropagation()}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={img.src} alt={img.alt} />
        {img.caption && <figcaption>{img.caption}</figcaption>}
      </figure>
      {images.length > 1 && (
        <button type="button" className="lb-nav next" onClick={(e) => { e.stopPropagation(); go(1); }} aria-label="Next image">
          <ChevronRight size={28} aria-hidden="true" />
        </button>
      )}
    </Wrap>
  );
};

export default Lightbox;

const Wrap = styled.div`
  position: fixed;
  inset: 0;
  z-index: 3000;
  background: rgba(10, 20, 14, 0.92);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 56px 12px 24px;

  figure {
    margin: 0;
    max-width: min(560px, 100%);
    max-height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
  }
  img {
    max-width: 100%;
    max-height: calc(100dvh - 140px);
    border-radius: 12px;
    object-fit: contain;
    background: #fff;
  }
  figcaption {
    color: #fff;
    font-size: 14px;
    text-align: center;
  }
  .lb-close,
  .lb-nav {
    position: absolute;
    width: 46px;
    height: 46px;
    border: 0;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.16);
    color: #fff;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
  }
  .lb-close { top: 10px; right: 10px; }
  .lb-nav { top: 50%; transform: translateY(-50%); }
  .lb-nav.prev { left: 8px; }
  .lb-nav.next { right: 8px; }
`;
