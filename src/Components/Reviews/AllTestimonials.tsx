'use client';

import React, { useEffect, useState } from "react";
import { API_PATH } from "../../constants";
import styled from "styled-components";
import LoadingIndicator from "../Common/LoadingIndicator";
import ReviewCard from "./ReviewCard";
import Slider from "react-slick";
import LazyImage from "../Common/LazyImage";
import SectionHeading from "../Common/SectionHeading";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";


const AllTestimonials = ({ isHomePage = false }: { isHomePage?: boolean }) => {
  const [testimonials, setTestimonials] = useState([]);
  const [beforeAfterImages, setBeforeAfterImages] = useState<string[]>([]);
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

    // Fetch dynamic before/after images
    const baData = { tbl_name: "before_after_images", status: 1 };
    fetch(`${API_PATH}/data`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(baData),
    })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setBeforeAfterImages(data.map((item: any) => item.image_url));
        }
      })
      .catch((err) => console.error("Error fetching before/after images:", err));
  }, []);

  const beforeAfterSliderSettings = {
    dots: false,
    infinite: true,
    speed: 1000,
    slidesToShow: 5,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 3000,
    pauseOnHover: false,
    arrows: false,
    responsive: [
      {
        breakpoint: 1200,
        settings: {
          slidesToShow: 4,
        }
      },
      {
        breakpoint: 1024,
        settings: {
          slidesToShow: 3,
        }
      },
      {
        breakpoint: 768,
        settings: {
          slidesToShow: 2,
        }
      },
      {
        breakpoint: 480,
        settings: {
          slidesToShow: 1,
        }
      }
    ]
  };

  return (
    <StyledReviews>
  
      <div style={{ marginTop: '4rem' }}>
        <SectionHeading title="Before & After" viewAllHref="/testimonials#images" />
      </div>

      <section className="image-reviews-slider">
        {beforeAfterImages.length > 0 && (
          <Slider {...beforeAfterSliderSettings}>
            {beforeAfterImages.map((src, index) => (
              <div className="image-slide-wrapper" key={index}>
                <div className="image-wrapper">
                  <LazyImage src={src} alt={`Before & After ${index + 1}`} />
                </div>
              </div>
            ))}
          </Slider>
        )}
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
  

  .loading-wrapper {
    display: flex;
    justify-content: center;
    padding: 3rem 0;
  }

  .slider-container {
    max-width: 1100px;
    margin: 0 auto !important;
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

  .image-reviews-slider {
    max-width: 1400px;
    margin: 2rem auto;
    
    .image-slide-wrapper {
      padding: 0 10px;
    }

    .image-wrapper {
      border: 1px solid var(--border);
      border-radius: 1rem;
      overflow: hidden;
      width: 100%;
      aspect-ratio: 1 / 1;
      box-shadow: 0 4px 10px rgba(0,0,0,0.05);

      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }
    }
  }

  @media screen and (max-width: 768px) {
    .image-reviews-slider {
      .image-slide-wrapper {
        padding: 0 5px;
      }
    }
  }
`;

