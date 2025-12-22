'use client';

import React, { useState, useEffect, lazy, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import Utility from "../utils/UtilityFunctions";
import Loader from "../Components/Loader";

// Lazy imports for components
const Banner = lazy(() => import("../Components/Home/Banner"));
const Category = lazy(() => import("../Components/Home/Category"));
const OurProducts = lazy(() => import("../Components/Home/OurProducts"));
const Stories = lazy(() => import("../Components/Reviews/Stories"));
const Testimonial = lazy(() => import("../Components/Reviews/Testimonial"));
const ShipingImage = lazy(() => import("../Components/Home/ShipingImage"));
const OurPromise = lazy(() => import("../Components/Home/OurPromise"));
const Features = lazy(() => import("../Components/Home/Features"));
const Founder = lazy(() => import("../Components/Home/Founder"));
const Follow = lazy(() => import("../Components/Home/Follow"));
const Certificate = lazy(() => import("../Components/Home/Certificate"));
const Blogs = lazy(() => import("../Components/Home/Blogs"));
const BestSeller = lazy(() => import("../Components/Home/BestSeller"));
const Video = lazy(() => import("../Components/Home/Video"));
const SEOComponent = lazy(() => import("../Components/Shared/SEOComponent"));
const OurJourney = lazy(() => import("../Components/Home/OurJourney"));

const Home = () => {
  // const [categoriesData, setCategoriesData] = useState([]);
  // useEffect(() => {
  //     fetch(`${API_PATH}/get.php`, {
  //         method: 'POST',
  //         headers: {
  //             'Content-Type': 'application/json'
  //         },
  //         body: JSON.stringify({ tbl_name: 'categories' })
  //     })
  //     .then(response => {
  //         if (!response.ok) {
  //             throw new Error('Failed to fetch categories data');
  //         }
  //         return response.json();
  //     })
  //     .then(data => {
  //         setCategoriesData(data);
  //     })
  //     .catch(error => {
  //         console.error('Error fetching categories data:', error);
  //     });
  // }, []);

  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  useEffect(() => {
    const hash = window.location.hash;
    if (hash) {
      setTimeout(() => {
        Utility.scrollToSection(hash, 100);
      }, 1000);
    }
  }, [pathname]);

  return (
    <Suspense fallback={<Loader />}>
      {/* <SEOComponent title="Vyra Herbals" /> */}
      <Banner />
      <Category />
      <OurProducts />
      <section id="customerStoriesSection">
        <Stories />
      </section>
      <ShipingImage />
      <section id="bestSellers">
        <BestSeller />
      </section>
      <Video />
      <Certificate />
      <OurPromise />
      <Founder />
      <OurJourney />
      <section id="customerTestimonials">
        <Testimonial />
      </section>
      {/* <Blogs /> */}
      <Follow />
      <Features />
    </Suspense>
  );
};

export default Home;
