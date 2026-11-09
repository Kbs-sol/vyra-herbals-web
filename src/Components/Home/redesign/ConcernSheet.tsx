"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { X } from "lucide-react";
import { BRAND } from "./brand";
import { ConcernFlow } from "./ConcernRoutineBuilder";

export const OPEN_CONCERN_EVENT = "vyra:open-concern";

/** Opens the concern selector: bottom sheet on phones, smooth scroll to the inline section on desktop. */
export function openConcernSelector() {
  if (typeof window === "undefined") return;
  if (window.matchMedia("(min-width: 769px)").matches) {
    document.getElementById("concern-builder")?.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }
  window.dispatchEvent(new Event(OPEN_CONCERN_EVENT));
}

const ConcernSheet = () => {
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener(OPEN_CONCERN_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_CONCERN_EVENT, onOpen);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  if (!open) return null;

  return (
    <Overlay onClick={close}>
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="concern-sheet-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="grab" aria-hidden="true" />
        <header className="sheet-head">
          <h2 id="concern-sheet-title">What&apos;s your hair concern?</h2>
          <button ref={closeRef} type="button" className="sheet-close" onClick={close} aria-label="Close">
            <X size={22} strokeWidth={2} aria-hidden="true" />
          </button>
        </header>
        <div className="sheet-body">
          <ConcernFlow inSheet />
        </div>
      </div>
    </Overlay>
  );
};

export default ConcernSheet;

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 2000;
  background: rgba(20, 43, 32, 0.55);
  display: flex;
  align-items: flex-end;
  animation: fade 0.2s ease both;

  .sheet {
    width: 100%;
    max-height: 92dvh;
    display: flex;
    flex-direction: column;
    background: ${BRAND.linen};
    border-radius: 22px 22px 0 0;
    box-shadow: 0 -16px 40px rgba(0, 0, 0, 0.25);
    animation: rise 0.28s cubic-bezier(0.2, 0.8, 0.2, 1) both;
    font-family: ${BRAND.body};
  }
  .grab {
    width: 44px;
    height: 4px;
    border-radius: 99px;
    background: ${BRAND.line};
    margin: 10px auto 0;
  }
  .sheet-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 16px 10px 20px;
    border-bottom: 1px solid ${BRAND.line};
  }
  .sheet-head h2 {
    margin: 0;
    font-family: ${BRAND.heading};
    font-size: 26px;
    font-weight: 600;
    color: ${BRAND.forest};
  }
  .sheet-close {
    width: 44px;
    height: 44px;
    border: 0;
    border-radius: 50%;
    background: ${BRAND.sageSoft};
    color: ${BRAND.forest};
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
  .sheet-body {
    overflow-y: auto;
    padding: 16px;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior: contain;
  }
  /* sticky CTA bar inside the sheet should hug the sheet bottom */
  .sheet-body .cta-bar {
    margin-bottom: -20px;
  }
  @keyframes fade {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes rise {
    from { transform: translateY(40px); opacity: 0.6; }
    to { transform: none; opacity: 1; }
  }
  @media (min-width: 769px) {
    align-items: center;
    justify-content: center;
    .sheet { max-width: 720px; border-radius: 22px; }
  }
  @media (prefers-reduced-motion: reduce) {
    &, .sheet { animation: none; }
  }
`;
