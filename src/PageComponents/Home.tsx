'use client';

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import Utility from "../utils/UtilityFunctions";
import ErrorBoundary from "../Components/ErrorBoundary";

// Import all components directly for faster hydration (no dynamic imports)
import Banner from "../Components/Home/Banner";
import Category from "../Components/Home/Category";
import OurProducts from "../Components/Home/OurProducts";
import Stories from "../Components/Reviews/Stories";
import Testimonial from "../Components/Reviews/Testimonial";
import ShipingImage from "../Components/Home/ShipingImage";
import OurPromise from "../Components/Home/OurPromise";
import Features from "../Components/Home/Features";
import Founder from "../Components/Home/Founder";
import Follow from "../Components/Home/Follow";
import Certificate from "../Components/Home/Certificate";
import BestSeller from "../Components/Home/BestSeller";
import Video from "../Components/Home/Video";
import OurJourney from "../Components/Home/OurJourney";
import StickyHairConcern from "../Components/Home/StickyHairConcern";
import BlogSection from "../Components/Home/BlogSection";

import AllTestimonials from "../Components/Reviews/AllTestimonials";
import MarketplaceAvailable from "../Components/Common/MarketplaceAvailable";

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
    <img src="/assets/images/logo-final.png" alt="logo" />
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
      <ErrorBoundary>
        <Banner />
        <ErrorBoundary>
          <Category />
        </ErrorBoundary>
        

        
        
        <ErrorBoundary>
          <StickyHairConcern />
        </ErrorBoundary>



        <ErrorBoundary>
          <OurProducts />
        </ErrorBoundary>


        <ErrorBoundary>
          <section id="customerStoriesSection">
            <Stories />
          </section>
        </ErrorBoundary>

        <ErrorBoundary>
          <ShipingImage />
        </ErrorBoundary>

        <ErrorBoundary>
          <section id="bestSellers">
            <BestSeller />
          </section>
        </ErrorBoundary>
        <ErrorBoundary>
          <Video />
        </ErrorBoundary>
        <ErrorBoundary>
          <Certificate />
        </ErrorBoundary>
        <ErrorBoundary>
          <OurPromise />
        </ErrorBoundary>
        <ErrorBoundary>
          <Founder />
        </ErrorBoundary>
        <ErrorBoundary>
          <OurJourney />
        </ErrorBoundary>
        
        <ErrorBoundary>
          <section id="customerTestimonials">
            <Testimonial />
          </section>
        </ErrorBoundary>

        
        <ErrorBoundary>
          <AllTestimonials isHomePage={true} />
        </ErrorBoundary>
        
        <ErrorBoundary>
          <Follow />
        </ErrorBoundary>
        <ErrorBoundary>
          <MarketplaceAvailable />
        </ErrorBoundary>
        <ErrorBoundary>
          <BlogSection />
        </ErrorBoundary>
        <ErrorBoundary>
          <Features />
        </ErrorBoundary>

      </ErrorBoundary>
    </>
  );
};

export default Home;
