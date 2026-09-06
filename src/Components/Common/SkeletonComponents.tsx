'use client';

import styled, { keyframes } from "styled-components";

export const shimmer = keyframes`
  0% {
    background-position: -468px 0;
  }
  100% {
    background-position: 468px 0;
  }
`;

export const SkeletonBase = styled.div`
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
`;

export const ProductCardSkeleton = () => (
  <SkeletonWrapper className="col">
    <div className="product-card">
      <SkeletonBase style={{ width: '100%', height: '220px', borderRadius: '0.5rem' }} />
      <div className="product-content" style={{ padding: '10px 0' }}>
        <SkeletonBase style={{ width: '80%', height: '20px', marginBottom: '10px' }} />
        <SkeletonBase style={{ width: '40%', height: '15px', marginBottom: '15px' }} />
        <SkeletonBase style={{ width: '60%', height: '25px', marginBottom: '10px' }} />
        <SkeletonBase style={{ width: '100%', height: '40px', borderRadius: '6px' }} />
      </div>
    </div>
  </SkeletonWrapper>
);

export const ProductCard2Skeleton = () => (
  <SkeletonWrapper className="col">
    <div className="feature-card" style={{ display: 'flex', gap: '15px' }}>
      <SkeletonBase style={{ width: '150px', height: '150px', borderRadius: '8px', flexShrink: 0 }} />
      <div className="feature-content" style={{ flex: 1, padding: '10px 0' }}>
        <SkeletonBase style={{ width: '70%', height: '20px', marginBottom: '10px' }} />
        <SkeletonBase style={{ width: '90%', height: '15px', marginBottom: '10px' }} />
        <SkeletonBase style={{ width: '40%', height: '25px', marginBottom: '15px' }} />
        <SkeletonBase style={{ width: '100%', height: '40px', borderRadius: '6px' }} />
      </div>
    </div>
  </SkeletonWrapper>
);

export const CategorySkeleton = () => (
  <div style={{ flex: '0 0 220px', minWidth: '151px', textAlign: 'center' }}>
    <SkeletonBase style={{ width: '100%', aspectRatio: '1/1', borderRadius: '12px', marginBottom: '15px' }} />
    <SkeletonBase style={{ width: '60%', height: '20px', borderRadius: '4px' }} />
  </div>
);

export const BannerSkeleton = () => (
  <div style={{ width: '100%', height: '450px', position: 'relative' }}>
    <SkeletonBase style={{ width: '100%', height: '100%' }} />
  </div>
);

const SkeletonWrapper = styled.div`
  margin-bottom: 25px;
  .product-card, .feature-card {
    background: #fff;
    border: 1px solid #e8e8e8;
    border-radius: 8px;
    padding: 10px;
  }
`;
