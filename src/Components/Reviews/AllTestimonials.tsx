'use client';

import React, { useEffect, useState } from "react";
import { API_PATH } from "../../constants";
import styled from "styled-components";
import LoadingIndicator from "../Common/LoadingIndicator";
import ReviewCard from "./ReviewCard";
import Slider from "react-slick";
import LazyImage from "../Common/LazyImage";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

const beforeAfterImages = [
  "/assets/images/testimonials/test_01.webp",
  "/assets/images/testimonials/test_02.webp",
  "/assets/images/testimonials/test_03.webp",
  "/assets/images/testimonials/test_04.webp",
  "/assets/images/testimonials/test_05.webp",
  "/assets/images/testimonials/test_06.webp",
  "/assets/images/testimonials/test_07.webp",
  "/assets/images/testimonials/test_08.webp",
  "/assets/images/testimonials/test_09.webp",
  "/assets/images/testimonials/test_10.webp",
];

const AllTestimonials = ({ isHomePage = false }: { isHomePage?: boolean }) => {
  const [testimonials, setTestimonials] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    const postData = {
      tbl_name: "reviews",
    };

    const requestOptions = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(postData),
    };

    fetch(`${API_PATH}/data`, requestOptions)
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to fetch testimonials");
        }
        return response.json();
      })
      .then((data) => {
        setTestimonials(data);
      })
      .catch((error) => {
        console.error("Error while fetching testimonials:", error);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const sliderSettings = {
    dots: true,
    infinite: false,
    speed: 500,
    slidesToShow: 3,
    slidesToScroll: 1,
    responsive: [
      {
        breakpoint: 1024,
        settings: {
          slidesToShow: 2,
        }
      },
      {
        breakpoint: 768,
        settings: {
          slidesToShow: 1,
          dots: true,
          arrows: false
        }
      }
    ]
  };

  return (
    <StyledReviews>
      <section className="header-section">
        <h2 className="section-title">CUSTOMER STORIES</h2>
        <div className="title-divider"></div>
      </section>

      <section className="slider-container">
        {isLoading ? (
          <div className="loading-wrapper">
            <LoadingIndicator variant="circular" />
          </div>
        ) : (
          <Slider {...sliderSettings}>
            {testimonials.map((review, index) => (
              <div key={"story-" + index} className="slide-wrapper">
                <ReviewCard review={review} className="slider-review-card" />
              </div>
            ))}
          </Slider>
        )}
      </section>

      <section className="header-section" style={{ marginTop: '4rem' }}>
        <h2 className="section-title">BEFORE & AFTER</h2>
        <div className="title-divider"></div>
      </section>

      <section className="image-reviews">
        {beforeAfterImages.map((src, index) => (
          <div className="image-wrapper" key={index}>
            <LazyImage src={src} alt={`Before & After ${index + 1}`} />
          </div>
        ))}
      </section>
    </StyledReviews>
  );
};

export default AllTestimonials;

const StyledReviews = styled.section`
  margin-top: 3rem;
  margin-bottom: 4rem;
  padding: 0 1rem;
  max-width: 1400px;
  margin-left: auto;
  margin-right: auto;
  
  .header-section {
    text-align: center;
    margin-bottom: 2.5rem;
    
    .section-title {
      font-size: 2rem;
      font-weight: 500;
      letter-spacing: 1px;
      margin-bottom: 0.8rem;
      text-transform: uppercase;
    }
    
    .title-divider {
      height: 3px;
      width: 150px;
      background-color: #556b2f; /* Dark olive green */
      margin: 0 auto;
    }
  }

  .loading-wrapper {
    display: flex;
    justify-content: center;
    padding: 3rem 0;
  }

  .slider-container {
    max-width: 1100px;
    margin: 0 auto;
    padding: 0 20px;

    .slide-wrapper {
      padding: 10px;
      height: 100%;
    }

    .slider-review-card {
      border: 1px solid #ddd;
      border-radius: 8px;
      padding: 20px;
      height: 100%;
      background: white;
      box-shadow: 0 4px 10px rgba(0,0,0,0.03);
      display: flex;
      flex-direction: column;
      
      .card-title {
        margin: 0;
        font-size: 14px;
        font-weight: bold;
      }
      .reviewer-text {
        font-size: 14px;
        color: #555;
        margin-top: 10px;
      }
    }

    /* Override slick dots */
    .slick-dots {
      bottom: -40px;
      li {
        margin: 0 4px;
        button:before {
          font-size: 14px;
          color: #111;
        }
        &.slick-active button:before {
          color: #000;
        }
      }
    }
    
    /* Ensure all slides stretch to same height */
    .slick-track {
      display: flex !important;
    }
    .slick-slide {
      height: inherit !important;
      display: flex;
      justify-content: center;
      > div {
        width: 100%;
        display: flex;
      }
    }
  }

  .image-reviews {
    display: flex;
    justify-content: center;
    flex-wrap: wrap;
    max-width: 1000px;
    margin: 1rem auto;
    gap: 1.5rem;
    
    .image-wrapper {
      border: 1px solid var(--border);
      border-radius: 1rem;
      overflow: hidden;
      width: clamp(120px, 20%, 200px);
      box-shadow: 0 4px 10px rgba(0,0,0,0.05);

      img {
        width: 100%;
        height: auto;
        border-radius: 5px;
        display: block;
      }
    }
  }

  @media screen and (max-width: 768px) {
    .image-reviews {
      gap: 1rem;
      .image-wrapper {
        width: clamp(100px, 30%, 150px);
      }
    }
  }
  
  @media screen and (max-width: 480px) {
    .image-reviews {
      width: 94%;
      .image-wrapper {
        width: 45%;
      }
    }
  }
`;

