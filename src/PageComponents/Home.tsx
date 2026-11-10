'use client';

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import Utility from "../utils/UtilityFunctions";
import ErrorBoundary from "../Components/ErrorBoundary";

// Redesigned homepage sections (see src/Components/Home/redesign)
import EditorialHero from "../Components/Home/redesign/EditorialHero";
import ConcernRoutineBuilder from "../Components/Home/redesign/ConcernRoutineBuilder";
import BestSellersSelector from "../Components/Home/redesign/BestSellersSelector";
import CertificationBadges from "../Components/Home/redesign/CertificationBadges";
import ChatProof from "../Components/Home/redesign/ChatProof";
import BeforeAfter from "../Components/Home/redesign/BeforeAfter";
import ConcernSheet from "../Components/Home/redesign/ConcernSheet";
import Founder from "../Components/Home/Founder";
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
        {/* 1-3. Free-shipping bar, header and quick categories live in the global Header */}
        {/* 4. Hero with "What's Your Hair Concern?" CTA */}
        <ErrorBoundary><EditorialHero /></ErrorBoundary>
        {/* 5. Concern -> routine -> add recommended products */}
        <ErrorBoundary><ConcernRoutineBuilder /></ErrorBoundary>
        {/* 6. Real WhatsApp + Instagram chat reviews (anchors: /#customerTestimonials, /#customerStoriesSection) */}
        <span id="customerTestimonials" aria-hidden="true" />
        <span id="customerStoriesSection" aria-hidden="true" />
        <ErrorBoundary><ChatProof /></ErrorBoundary>
        {/* 7. Before & After */}
        <ErrorBoundary><BeforeAfter /></ErrorBoundary>
        {/* 8. Best sellers + recommended kits (anchor: /#bestSellers) */}
        <ErrorBoundary><BestSellersSelector /></ErrorBoundary>
        {/* 9. Short founder story */}
        <ErrorBoundary><Founder /></ErrorBoundary>
        {/* 10. Trust and certifications */}
        <ErrorBoundary><CertificationBadges /></ErrorBoundary>
        {/* 11. FAQ (footer is rendered by ConditionalLayout) */}
        <ErrorBoundary><HomeFAQ /></ErrorBoundary>
        {/* Mobile bottom sheet opened by the hero CTA */}
        <ConcernSheet />
      </main>
    </>
  );
};

export default Home;
