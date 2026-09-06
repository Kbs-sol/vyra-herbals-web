import React, { useState, useEffect, useRef } from "react";
import styled from "styled-components";
import { shimmer } from "./SkeletonComponents";

type LazyImageProps = {
  /** Optional: a missing or broken src falls back to `placeholder`. */
  src?: string | null;
  alt?: string;
  placeholder?: string;
  isLazy?: boolean;
  minHeight?: string;
  aspectRatio?: string;
  [key: string]: any;
};

const LazyImage = ({
  src,
  alt,
  placeholder = "/assets/images/vyra_placeholder.png",
  isLazy = true,
  minHeight = "auto",
  aspectRatio = "auto",
  ...props
}: LazyImageProps) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isError, setIsError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // Helper to get proper image URL
  const getImageUrl = (imageUrl: string | undefined | null) => {
    if (!imageUrl) return placeholder;
    // If it's already a full URL, use it directly
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      return imageUrl;
    }
    // If it's a local path starting with /, use it directly
    if (imageUrl.startsWith('/')) {
      return imageUrl;
    }
    // Otherwise, assume it's a filename and use the uploads API
    return `/api/uploads/${imageUrl}`;
  };

  const imageSrc = isError ? placeholder : getImageUrl(src);

  useEffect(() => {
    // Reset state when src changes
    setIsLoaded(false);
    setIsError(false);

    // Check if image is already in cache
    if (imgRef.current && imgRef.current.complete) {
      handleLoad();
    }
  }, [src]);

  const handleLoad = () => {
    setIsLoaded(true);
  };

  const handleError = () => {
    setIsError(true);
    setIsLoaded(true);
  };

  return (
    <StyledImage 
      $isAltText={isError} 
      $minHeight={minHeight} 
      $aspectRatio={aspectRatio} 
      className="lazy-image"
    >
      {!isLoaded && !isError && <Skeleton />}
      <img
        ref={imgRef}
        src={imageSrc}
        alt={alt || "image"}
        {...props}
        className={isLoaded ? "loaded" : "loading"}
        onLoad={handleLoad}
        onError={handleError}
      />
    </StyledImage>
  );
};

export default LazyImage;

const Skeleton = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: #f6f7f8;
  background-image: linear-gradient(
    to right,
    #f6f7f8 0%,
    #edeef1 20%,
    #f6f7f8 40%,
    #f6f7f8 100%
  );
  background-repeat: no-repeat;
  background-size: 800px 100%;
  display: inline-block;
  animation: ${shimmer} 1.2s linear infinite forwards;
  z-index: 1;
`;

const StyledImage = styled.section<{ $isAltText?: boolean; $minHeight?: string; $aspectRatio?: string }>`
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: ${(props) => props.$minHeight || "auto"};
  aspect-ratio: ${(props) => props.$aspectRatio || "auto"};
  
  img {
    width: 100%;
    height: auto;
    display: block;
    opacity: 0;
    transition: opacity 0.3s ease-in-out;
    
    &.loaded {
      opacity: 1;
    }
    
    &.loading {
      position: absolute;
      width: 0;
      height: 0;
    }
  }

  &:hover {
    transform: scale(1.02);
    transition: transform 0.3s ease;
  }
`;
