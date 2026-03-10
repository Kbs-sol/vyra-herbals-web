'use client';

import React, { useEffect, useRef } from "react";

const Video = () => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const handleIntersection = (entries: IntersectionObserverEntry[]) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && videoRef.current) {
          videoRef.current.play();
        } else if (videoRef.current) {
          videoRef.current.pause();
        }
      });
    };

    const observer = new IntersectionObserver(handleIntersection, {
      threshold: 0.5,
    });
    if (videoRef.current) {
      observer.observe(videoRef.current);
    }

    return () => {
      if (videoRef.current) {
        observer.unobserve(videoRef.current);
      }
    };
  }, []);

  return (
    <>
      <div className="video-sec pb-4">
        <video
          ref={videoRef}
          width="100%"
          height="550"
          controls
          preload="auto"
          muted
        >
          <source src="/assets/images/video.mp4" type="video/mp4" />
          <track
            src="/assets/images/video.mp4"
            kind="subtitles"
            srcLang="en"
            label="English"
          />
        </video>
      </div>
    </>
  );
};

export default Video;
