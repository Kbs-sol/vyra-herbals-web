'use client';

import React, { useCallback, useMemo, useState, useEffect } from "react";
import styled, { keyframes, css } from "styled-components";

// Keyframes for seamless, continuous scrolling
const scroll = keyframes`
  from {
    transform: translateX(0);
  }
  to {
    transform: translateX(-50%);
  }
`;

// Outer wrapper to ensure proper alignment
const ScrollerContainer = styled.div`
  overflow: hidden;
  width: 100%;
  position: relative;
  background: #f8f8f8;
  padding: 2rem 0;
  display: flex;
  align-items: center;
`;

// The track that holds and moves the images continuously
const ScrollerTrack = styled.div<{ $duration: number; $isPaused: boolean }>`
  display: flex;
  width: max-content;
  animation: ${(props) => css`
    ${scroll} ${props.$duration}s linear infinite
  `};
  animation-play-state: ${(props) => (props.$isPaused ? "paused" : "running")};
  will-change: transform; /* Optimized for better rendering */
`;

// Individual image styling
const ImageWrapper = styled.div`
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  margin: 0 1rem;
  img {
    max-width: 100%;
    height: auto;
    object-fit: contain;
  }
`;

const InfiniteScroller = ({ images, duration = 20 }) => {
  const [isPaused, setIsPaused] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Preload images before starting animation
  useEffect(() => {
    const preloadImages = async () => {
      await Promise.all(
        images.map((src) => {
          return new Promise<void>((resolve) => {
            if (typeof src !== "string") return resolve();
            const img = new Image();
            img.src = src;
            // Wrap rather than passing `resolve` directly: the DOM handlers are
            // called with an Event, which does not match Promise<void>'s resolver.
            img.onload = () => resolve();
            img.onerror = () => resolve();
          });
        })
      );
      setLoaded(true);
    };

    preloadImages();
  }, [images]);

  // Memoized duplicated images array
  const duplicatedImages = useMemo(() => [...images, ...images], [images]);

  // Render images correctly whether they are URLs or JSX elements
  const getImage = useCallback(
    (item) =>
      typeof item === "string" ? <img src={item} alt="scroller-item" /> : item,
    []
  );

  if (!loaded) return null; // Prevent rendering until images are loaded

  return (
    <ScrollerContainer
      className="scroller-container"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setIsPaused(false)}
    >
      <ScrollerTrack $duration={duration} $isPaused={isPaused}>
        {duplicatedImages.map((item, index) => (
          <ImageWrapper
            key={`infinite-scroll-img-${index}`}
            className="scroller-image-wrapper"
          >
            {getImage(item)}
          </ImageWrapper>
        ))}
      </ScrollerTrack>
    </ScrollerContainer>
  );
};

export default InfiniteScroller;
