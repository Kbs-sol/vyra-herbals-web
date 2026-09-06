'use client';

import React, { useRef, useState, useEffect } from "react";
import styled from "styled-components";
import PropTypes from "prop-types";

const EllipsisContainer = styled.div<{ $lines: number }>`
  white-space: ${(props) => (props.$lines === 1 ? "nowrap" : "normal")};
  overflow: hidden;
  text-overflow: ellipsis;
  display: ${(props) => (props.$lines > 1 ? "-webkit-box" : "block")};
  -webkit-line-clamp: ${(props) => props.$lines}; /* Limits to X lines */
  -webkit-box-orient: vertical;
  width: 100%;
`;

/**
 * EllipsisControl Component
 * @param {string} text - The text content to be displayed.
 * @param {number} lines - Number of lines to display (default is 1 for single-line ellipsis).
 * @param {boolean} showReadMore - Whether to show the "Read More" button if text is ellipsed.
 * @param {function} onReadClick - Callback function to be executed once "Read More" button clicked.
 */
const EllipsisControl = ({
  text,
  lines = 1,
  showReadMore = false,
  onReadClick = () => {},
}) => {
  const [isEllipsed, setIsEllipsed] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Check if text has been ellipsed only if showReadMore is true
  useEffect(() => {
    if (showReadMore) {
      const container = containerRef.current;
      if (container) {
        const isTruncated = container.scrollHeight > container.clientHeight;
        setIsEllipsed(isTruncated);
      }
    }
  }, [text, lines, showReadMore]);

  const handleReadMore = () => {
    onReadClick?.();
  };

  return (
    <div>
      <EllipsisContainer ref={containerRef} $lines={lines}>
        {text}
      </EllipsisContainer>
      {showReadMore && isEllipsed && (
        <ReadMoreButton className="read-more-btn" onClick={handleReadMore}>
          Read More
        </ReadMoreButton>
      )}
    </div>
  );
};

// PropTypes for better validation
EllipsisControl.propTypes = {
  text: PropTypes.string.isRequired,
  lines: PropTypes.number, // Number of lines for ellipsis
  showReadMore: PropTypes.bool, // Whether to show "Read More" button
};

export default EllipsisControl;

const ReadMoreButton = styled.button`
  text-decoration: underline;
`;
