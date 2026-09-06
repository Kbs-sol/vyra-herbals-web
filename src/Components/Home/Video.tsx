'use client';

import React from 'react';
import YouTubeFacade from '@/Components/Common/YouTubeFacade';

/**
 * Homepage hero video.
 *
 * Was: a 19 MB `public/assets/images/video.mp4` shipped in the repo, loaded
 *      on every homepage visit. That single file was ~1/3 of the total repo
 *      size and pushed the mobile LCP well past 4s.
 *
 * Now: a YouTube facade — the video lives on the Vyra Herbals YouTube
 *      channel (unlisted or public — see docs/SYSTEM_LITERACY.md), we ship
 *      a ~40 KB poster thumbnail, and the real iframe only loads when the
 *      user actually presses play.
 *
 * Setup:
 *   1. Upload the marketing video to YouTube (Studio → Create → Upload).
 *   2. Set visibility to Unlisted (or Public — both work; Public earns
 *      backlinks that feed SEO — see the "Founder-story digital PR" phase
 *      in the SEO audit).
 *   3. Copy the video ID (11 characters after `v=` in the URL).
 *   4. Paste it into NEXT_PUBLIC_HOME_HERO_VIDEO_ID in Vercel env vars.
 *   5. Nothing else — no code deploy required.
 */

const VIDEO_ID = process.env.NEXT_PUBLIC_HOME_HERO_VIDEO_ID || '';

const Video: React.FC = () => {
  if (!VIDEO_ID) {
    // Nothing to render if the env var isn't set — better than a broken embed.
    return null;
  }
  return (
    <div className="video-sec pb-4">
      <YouTubeFacade
        videoId={VIDEO_ID}
        title="Vyra Herbals — how our herbal hair oil is made"
      />
    </div>
  );
};

export default Video;
