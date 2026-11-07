'use client';

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import Utility from "../utils/UtilityFunctions";
import ErrorBoundary from "../Components/ErrorBoundary";

// Redesigned homepage sections (see src/Components/Home/redesign)
import TrustTicker from "../Components/Home/redesign/TrustTicker";
import EditorialHero from "../Components/Home/redesign/EditorialHero";
import ConcernRoutineBuilder from "../Components/Home/redesign/ConcernRoutineBuilder";
import ShopByCategory from "../Components/Home/redesign/ShopByCategory";
import BestSellersSelector from "../Components/Home/redesign/BestSellersSelector";
import CertificationBadges from "../Components/Home/redesign/CertificationBadges";
import TransformationStories from "../Components/Home/redesign/TransformationStories";
import HerbalPhilosophy from "../Components/Home/redesign/HerbalPhilosophy";
import HomeFAQ from "../Components/Home/redesign/HomeFAQ";

// Smooth fade-out loader
const PageLoader = ({ isVisible }: { isVisible: boolean }) => (
  <div
    className="loader_out"
    style={{
      opacity: isVisible ? 1 : 0,
      pointerEvents: isVisible ? 'auto' : 'none',
      transition: 'opacity 0.3s ease-out'
    }}
  >
    <img src="/assets/images/logo-final.png" alt="Vyra Herbals logo" />
  </div>
);

const Home = () => {
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Wait for next paint to ensure content is rendered, then fade out loader
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setIsLoading(false);
      });
    });
  }, []);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash) {
      setTimeout(() => {
        Utility.scrollToSection(hash, 100);
      }, 1000);
    }
  }, [pathname]);

  return (
    <>
      <PageLoader isVisible={isLoading} />
      <main id="main-content">
        {/* 1. Trust ticker */}
        <ErrorBoundary><TrustTicker /></ErrorBoundary>
        {/* 2. Editorial hero */}
        <ErrorBoundary><EditorialHero /></ErrorBoundary>
        {/* 3. Concern and routine builder (Steps A to D) */}
        <ErrorBoundary><ConcernRoutineBuilder /></ErrorBoundary>
        {/* 4. Shop by category */}
        <ErrorBoundary><ShopByCategory /></ErrorBoundary>
        {/* 5. Best sellers with size chips (anchor: /#bestSellers) */}
        <ErrorBoundary><BestSellersSelector /></ErrorBoundary>
        {/* 6. Certifications */}
        <ErrorBoundary><CertificationBadges /></ErrorBoundary>
        {/* 7. Transformation stories (anchors: /#customerStoriesSection, /#customerTestimonials) */}
        <span id="customerTestimonials" aria-hidden="true" />
        <ErrorBoundary><TransformationStories /></ErrorBoundary>
        {/* 8. Hand-made herbal philosophy */}
        <ErrorBoundary><HerbalPhilosophy /></ErrorBoundary>
        {/* 9. FAQ (footer is rendered by ConditionalLayout) */}
        <ErrorBoundary><HomeFAQ /></ErrorBoundary>
      </main>
    </>
  );
};

export default Home;
