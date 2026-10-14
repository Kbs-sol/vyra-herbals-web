'use client';

import React, { useState } from 'react';
import Image from 'next/image';

/**
 * Click-to-play YouTube facade.
 *
 * Why not <iframe src="https://youtube.com/embed/…"> directly?
 *   YouTube's iframe pulls in ~500 KB of JS + a bunch of third-party cookies
 *   BEFORE the user even asks to watch. On a hair-oil product page, over
 *   half our visitors are on mobile — that hit is a real LCP regression.
 *
 * This facade:
 *   - Renders only a poster image and a play button until the user clicks.
 *   - Loads the real iframe on interaction, using the privacy-enhanced
 *     `youtube-nocookie.com` domain so we don't drop tracking cookies
 *     until a visitor opts in by pressing play.
 *   - Uses `next/image` for the poster so we get AVIF/WebP + responsive
 *     sizes for free.
 *
 * How to pick the poster: YouTube serves several sizes at predictable URLs.
 *   maxresdefault.jpg  → 1280×720  (not present for every video)
 *   sddefault.jpg      → 640×480   (always present)
 *   hqdefault.jpg      → 480×360   (always present)
 * We prefer maxres, fall back to hq via onError.
 */

export interface YouTubeFacadeProps {
  /** Bare YouTube video ID, e.g. "dQw4w9WgXcQ". Not a URL. */
  videoId: string;
  /** Accessible label — required for a11y since the play button is visual. */
  title: string;
  /** Optional custom poster; if unset we pull YouTube's own thumbnail. */
  posterSrc?: string;
  /** Optional aspect ratio (default 16 : 9). */
  aspectRatio?: string;
  className?: string;
  /** Autoplay after the user clicks. Default: true. */
  autoplayOnClick?: boolean;
}

export default function YouTubeFacade({
  videoId,
  title,
  posterSrc,
  aspectRatio = '16 / 9',
  className,
  autoplayOnClick = true,
}: YouTubeFacadeProps) {
  const [activated, setActivated] = useState(false);
  const [posterFailed, setPosterFailed] = useState(false);

  const poster = posterSrc
    ? posterSrc
    : posterFailed
    ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
    : `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;

  const embedSrc = `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1${autoplayOnClick ? '&autoplay=1' : ''}`;

  return (
    <div
      className={className}
      style={{
        position: 'relative',
        width: '100%',
        aspectRatio,
        background: '#000',
        overflow: 'hidden',
        borderRadius: 12,
      }}
    >
      {activated ? (
        <iframe
          src={embedSrc}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          loading="lazy"
          style={{ width: '100%', height: '100%', border: 0, display: 'block' }}
        />
      ) : (
        <button
          type="button"
          onClick={() => setActivated(true)}
          aria-label={`Play video: ${title}`}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            padding: 0,
            border: 0,
            background: 'transparent',
            cursor: 'pointer',
          }}
        >
          {/*
           * `fill` sizes the image to the parent — the aspect-ratio wrapper
           * above is what actually fixes the layout height, so we never
           * get CLS from image load.
           */}
          <Image
            src={poster}
            alt={title}
            fill
            sizes="(max-width: 768px) 100vw, 60vw"
            style={{ objectFit: 'cover' }}
            onError={() => !posterSrc && setPosterFailed(true)}
            priority={false}
          />
          {/* Play button glyph */}
          <span
            aria-hidden
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 68,
              height: 48,
              background: 'rgba(23, 23, 23, 0.85)',
              borderRadius: 12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 200ms',
            }}
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="#fff" aria-hidden focusable="false">
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
        </button>
      )}
    </div>
  );
}
