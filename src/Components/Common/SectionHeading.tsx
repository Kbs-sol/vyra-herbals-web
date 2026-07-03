'use client';

import React from 'react';
import Link from 'next/link';
import styled from 'styled-components';

interface SectionHeadingProps {
  title: string;
  viewAllHref?: string;
  viewAllLabel?: string;
}

// Shared heading for section headers like "Customer Testimonials" and
// "Before & After" so both always render with identical font, size, weight
// and "View All" placement — no per-section CSS to drift out of sync.
const SectionHeading: React.FC<SectionHeadingProps> = ({
  title,
  viewAllHref,
  viewAllLabel = 'View All',
}) => {
  return (
    <StyledSectionHeading>
      <div className="heading-row">
        <h2>{title}</h2>
        {viewAllHref && (
          <Link href={viewAllHref} className="view-all-btn">
            {viewAllLabel}
          </Link>
        )}
      </div>
      <div className="heading-divider" />
    </StyledSectionHeading>
  );
};

export default SectionHeading;

const StyledSectionHeading = styled.div`
  text-align: center;
  margin-bottom: 2.5rem;

  .heading-row {
    display: flex;
    justify-content: center;
    align-items: center;
    position: relative;
    margin-bottom: 0.8rem;

    h2 {
      margin: 0;
    }
  }

  .view-all-btn {
    position: absolute;
    right: 0;
    font-size: 0.9rem;
    font-weight: 500;
    color: #556b2f;
    text-decoration: none;
    border: 1px solid #556b2f;
    padding: 0.4rem 1.2rem;
    border-radius: 2rem;
    transition: all 0.3s ease;
    text-transform: capitalize;

    &:hover {
      background-color: #556b2f;
      color: white;
    }
  }

  .heading-divider {
    height: 3px;
    width: 150px;
    background-color: #556b2f;
    margin: 0 auto;
  }

  @media (max-width: 768px) {
    .heading-row {
      flex-direction: column;
      gap: 1rem;
    }
    .view-all-btn {
      position: static;
      margin-top: 0.5rem;
    }
  }
`;
