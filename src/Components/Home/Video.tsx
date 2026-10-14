'use client';

import React, { useEffect, useState } from 'react';
import YouTubeFacade from '@/Components/Common/YouTubeFacade';

/**
 * Homepage hero video.
 *
 * Resolution order (first non-empty wins):
 *   1. Admin override from `/api/site-media?key=hero_video`
 *      (edited in /admin/media → Site Media section)
 *   2. `NEXT_PUBLIC_HOME_HERO_VIDEO_ID` env var
 *   3. Nothing (component renders null)
 *
 * The admin override lives in Supabase's `site_settings` table under key
 * `media_hero_video`; blanking the field there falls back to the env var.
 */

const ENV_FALLBACK_ID = process.env.NEXT_PUBLIC_HOME_HERO_VIDEO_ID || '';

// Extract an 11-char YouTube ID from a raw ID or full URL.
function toYouTubeId(raw: string): string {
  if (!raw) return '';
  const s = raw.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(s)) return s;
  const short = s.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (short) return short[1];
  const watch = s.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (watch) return watch[1];
  const embed = s.match(/\/embed\/([a-zA-Z0-9_-]{11})/);
  if (embed) return embed[1];
  return '';
}

const Video: React.FC = () => {
  const [videoId, setVideoId] = useState<string>(toYouTubeId(ENV_FALLBACK_ID));

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/site-media?key=hero_video', { cache: 'no-store' });
        if (!res.ok) return;
        const json = await res.json();
        if (cancelled) return;
        const id = toYouTubeId(json?.url || '');
        if (id) setVideoId(id);
      } catch {
        // Fall back silently to the env value already in state.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!videoId) {
    return null;
  }
  return (
    <div className="video-sec pb-4">
      <YouTubeFacade
        videoId={videoId}
        title="Vyra Herbals — 100% natural handmade herbal hair oil, made in India"
      />
    </div>
  );
};

export default Video;
