'use client';

import React, { useEffect } from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";

import Utility from "../utils/UtilityFunctions";
import Loader from "../Components/Loader";
import ErrorBoundary from "../Components/ErrorBoundary";

// Dynamic imports for code splitting with error handling and loading states
const Banner = dynamic(() => import("../Components/Home/Banner"), {
  loading: () => <Loader />,
  ssr: true,
});

const Category = dynamic(() => import("../Components/Home/Category"), {
  loading: () => <Loader />,
  ssr: true,
});

const OurProducts = dynamic(() => import("../Components/Home/OurProducts"), {
  loading: () => <Loader />,
  ssr: true,
});

const Stories = dynamic(() => import("../Components/Reviews/Stories"), {
  loading: () => <Loader />,
  ssr: true,
});

const Testimonial = dynamic(() => import("../Components/Reviews/Testimonial"), {
  loading: () => <Loader />,
  ssr: true,
});

const ShipingImage = dynamic(() => import("../Components/Home/ShipingImage"), {
  loading: () => <Loader />,
  ssr: true,
});

const OurPromise = dynamic(() => import("../Components/Home/OurPromise"), {
  loading: () => <Loader />,
  ssr: true,
});

const Features = dynamic(() => import("../Components/Home/Features"), {
  loading: () => <Loader />,
  ssr: true,
});

const Founder = dynamic(() => import("../Components/Home/Founder"), {
  loading: () => <Loader />,
  ssr: true,
});

const Follow = dynamic(() => import("../Components/Home/Follow"), {
  loading: () => <Loader />,
  ssr: true,
});

const Certificate = dynamic(() => import("../Components/Home/Certificate"), {
  loading: () => <Loader />,
  ssr: true,
});

const Blogs = dynamic(() => import("../Components/Home/Blogs"), {
  loading: () => <Loader />,
  ssr: true,
});

const BestSeller = dynamic(() => import("../Components/Home/BestSeller"), {
  loading: () => <Loader />,
  ssr: true,
});

const Video = dynamic(() => import("../Components/Home/Video"), {
  loading: () => <Loader />,
  ssr: true,
});

const OurJourney = dynamic(() => import("../Components/Home/OurJourney"), {
  loading: () => <Loader />,
  ssr: true,
});

const Home = () => {
  const pathname = usePathname();

  useEffect(() => {
    const hash = window.location.hash;
    if (hash) {
      setTimeout(() => {
        Utility.scrollToSection(hash, 100);
      }, 1000);
    }
  }, [pathname]);

  return (
    <ErrorBoundary>
      <Banner />
      <ErrorBoundary>
        <Category />
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
        <Follow />
      </ErrorBoundary>
      <ErrorBoundary>
        <Features />
      </ErrorBoundary>
    </ErrorBoundary>
  );
};

export default Home;
