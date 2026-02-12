'use client';

import React from "react";
import { FaArrowRight } from "react-icons/fa6";
import Link from "next/link";
import styled from "styled-components";
import { useEffect, useState } from "react";
import { Category as CategoryType } from "@/types";

const Category = () => {
  const [categories, setCategories] = useState<CategoryType[]>([]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch('/api/data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tbl_name: 'categories' })
        });
        const data = await response.json();
        if (Array.isArray(data)) {
          setCategories(data);
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    };
    fetchCategories();
  }, []);

  return (
    <StyledCategories className="section category-part pt-4 pb-4">
      <div className="container">
        <div className="row">
          <div className="col-12">
            <div className="section-heading">
              <h2>shop by categories</h2>
            </div>
          </div>
        </div>
        <div className="row">
          <div className="col-lg-12">
            <div className="category-slider slider-arrow d-flex flex-wrap justify-content-center">
              {categories.map((cat) => (
                <div className="category-wrap" key={cat.id}>
                  <Link href={`/category/${cat.slug || cat.handle || ""}`}>
                    <div className="category-media">
                      <img src={cat.image_url || "/assets/images/cat/oil.jpg"} alt={cat.name} />
                      <img src={cat.image_url || "/assets/images/cat/oil.jpg"} alt={cat.name} />
                    </div>
                    <div className="category-meta">
                      <h4>
                        {cat.name}
                        <FaArrowRight />
                      </h4>
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </StyledCategories>
  );
};

export default Category;

const StyledCategories = styled.section`
  .category-wrap {
    transition: transform 0.3s ease;
    width: 200px;
    margin: 10px;
    &:hover {
      transform: translateY(-5px);
    }
  }

  .category-media {
    position: relative;
    border-radius: 12px;
    overflow: hidden;
    aspect-ratio: 1/1;
    
    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
    }

    img:last-child {
      opacity: 0;
      position: absolute;
      left: 0;
      top: 0;
      transform: scale(1.1);
    }

    &:hover {
      img:first-child {
        opacity: 0;
        transform: scale(0.9);
      }
      img:last-child {
        opacity: 1;
        transform: scale(1);
      }
    }
  }

  .category-meta {
    margin-top: 15px;
    text-align: center;
    
    h4 {
      font-size: 1.1rem;
      font-weight: 600;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      color: #333;
      
      svg {
        font-size: 0.9rem;
        transition: transform 0.3s ease;
      }
    }
  }

  .category-wrap:hover .category-meta h4 svg {
    transform: translateX(5px);
  }
`;
