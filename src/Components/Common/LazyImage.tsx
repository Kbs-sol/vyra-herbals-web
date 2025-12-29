'use client';

import React, { useState } from "react";
import { useInView } from "react-intersection-observer";
import styled from "styled-components";

const LazyImage = ({
  src,
  alt,
  placeholder = "/assets/images/vyra_placeholder.png",
  isLazy = true,
  ...props
}) => {
  // useInView hook to track the visibility of the image
  const { ref, inView } = useInView({
    triggerOnce: true, // Image loads only once when in view
    threshold: 0.2, // Trigger when 20% of the image is visible
  });
  const [isError, setIsError] = useState(false);

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

  return (
    <StyledImage $isAltText={isError} className="lazy-image">
      {isLazy ? (
        <img
          ref={ref} // Assigning ref to the image element to observe
          src={inView ? imageSrc : placeholder} // Load actual image only when in view
          alt={alt || "image"}
          {...props}
          className={inView ? "loaded" : ""}
          onError={() => setIsError(true)}
        />
      ) : (
        <img
          src={imageSrc}
          alt={alt || "image"}
          {...props}
          className={"loaded"}
          onError={() => setIsError(true)}
        />
      )}
    </StyledImage>
  );
};

export default LazyImage;

const StyledImage = styled.section`
  transition: transform 0.2s ease-in-out;
  overflow: hidden;
  img {
    transition: transform 1s ease-in-out;
    transform: ${({ $isAltText }) => ($isAltText ? "scale(1)" : "scale(1.5)")};
    &.loaded {
      transform: scale(1);
    }
  }
  &:hover {
    transform: scale(1.05);
  }
`;
