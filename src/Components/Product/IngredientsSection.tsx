'use client';

import React, { useEffect, useState } from 'react';
import styled from 'styled-components';

interface Ingredient {
  id: number;
  product_id: number;
  name: string;
  description: string;
  image_url: string;
  status: number;
}

interface IngredientsSectionProps {
  productId: number | string | undefined | null;
}

const IngredientsSection: React.FC<IngredientsSectionProps> = ({ productId }) => {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!productId) return;

    const fetchIngredients = async () => {
      try {
        const response = await fetch(`/api/products/ingredients?productId=${productId}`);
        const data = await response.json();
        if (data.success && data.data && data.data.length > 0) {
          setIngredients(data.data);
        } else {
          setIngredients([]);
        }
      } catch (error) {
        console.error('Failed to fetch ingredients', error);
      } finally {
        setLoading(false);
      }
    };

    fetchIngredients();
  }, [productId]);

  if (loading || ingredients.length === 0) {
    return null;
  }

  return (
    <IngredientsContainer>
      <div className="container">
        <div className="section-header text-center">
          <div className="leaf-icon-wrapper">
            <svg 
              viewBox="0 0 24 24" 
              width="24" 
              height="24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z" />
              <path d="M12 22v-9" />
              <path d="M12 16c2-1 4-3 4-5" />
            </svg>
          </div>
          <h2 className="section-title">What&apos;s in it?</h2>
          <p className="section-subtitle">
            We believe in complete transparency. Every ingredient is carefully selected from<br className="d-none d-md-block" />
            nature to deliver real results without harmful chemicals.
          </p>
        </div>

        <div className="ingredients-grid">
          {ingredients.map((item) => (
            <div key={item.id} className="ingredient-card">
              <div className="ingredient-image-wrapper">
                <img src={item.image_url} alt={item.name} className="ingredient-image" />
              </div>
              <div className="ingredient-content">
                <h4 className="ingredient-name">{item.name}</h4>
                <p className="ingredient-description">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </IngredientsContainer>
  );
};

export default IngredientsSection;

const IngredientsContainer = styled.section`
  padding: 60px 0;
  background-color: #fcfcfc;

  .section-header {
    margin-bottom: 50px;
    
    .leaf-icon-wrapper {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background-color: #fdf6e3;
      color: #cd853f;
      margin-bottom: 20px;
    }

    .section-title {
      font-size: 2rem;
      font-weight: 700;
      color: #222;
      margin-bottom: 16px;
    }

    .section-subtitle {
      font-size: 1rem;
      color: #666;
      line-height: 1.6;
    }
  }

  .ingredients-grid {
    display: grid;
    grid-template-columns: repeat(1, 1fr);
    gap: 30px;

    @media (min-width: 768px) {
      grid-template-columns: repeat(2, 1fr);
      gap: 30px;
    }

    @media (min-width: 992px) {
      grid-template-columns: repeat(3, 1fr);
      gap: 40px;
    }
  }

  .ingredient-card {
    background: #fff;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
    transition: transform 0.3s ease, box-shadow 0.3s ease;
    border: 1px solid #f0f0f0;

    &:hover {
      transform: translateY(-5px);
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.08);
    }

    .ingredient-image-wrapper {
      width: 100%;
      height: 240px;
      overflow: hidden;
      
      .ingredient-image {
        width: 100%;
        height: 100%;
        object-fit: cover;
        transition: transform 0.5s ease;
      }
    }

    &:hover .ingredient-image {
      transform: scale(1.05);
    }

    .ingredient-content {
      padding: 24px;
      
      .ingredient-name {
        font-size: 1.1rem;
        font-weight: 700;
        color: #333;
        margin-bottom: 10px;
      }
      
      .ingredient-description {
        font-size: 0.95rem;
        color: #666;
        line-height: 1.5;
        margin: 0;
      }
    }
  }
`;
