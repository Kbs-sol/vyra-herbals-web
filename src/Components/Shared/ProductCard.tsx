'use client';

import Link from "next/link";
import LazyImage from "../Common/LazyImage";
import styled from "styled-components";
import AddToCartButton from "../Common/AddToCartButton";
import AddToWishlistButton from "../Common/AddToWishlistButton";
import EllipsisControl from "../Common/EllipsisControl";
import Utility from "../../utils/UtilityFunctions";
import { useMemo } from "react";
import StarRatings from "../Common/StarRatings";

// Helper to format clean, mobile-friendly product titles
export const formatProductTitle = (rawTitle: string = ''): string => {
  if (!rawTitle) return '';
  return rawTitle
    .replace(/Combo\s*-\s*/gi, '')
    .replace(/\s+Combo\b/gi, ' Combo')
    .trim();
};

const ProductCard = ({ product, isImageLazy = true }: { product: any; isImageLazy?: boolean }) => {
  const filteredReviews = useMemo(() => {
    return product?.reviews?.filter((a: any) => Number(a.status) === 1);
  }, [product?.reviews]);

  const ratingDetails = useMemo(() => {
    if (product && filteredReviews?.length) {
      return Utility.calculateRating(filteredReviews);
    }
    return {};
  }, [product, filteredReviews]);

  const formattedTitle = useMemo(() => {
    return formatProductTitle(product?.title);
  }, [product?.title]);

  const discountPercent = useMemo(() => {
    if (!product?.regular_price || !product?.price) return null;
    const diff = Math.floor(
      Number(Utility.calculateDiscount(product.price, product.regular_price))
    );
    return diff > 0 ? diff : null;
  }, [product?.price, product?.regular_price]);

  return (
    <StyledProduct className="col">
      <div className="product-card">
        <div className="product-media">
          {discountPercent && (
            <span className="card-badge-discount">
              {discountPercent}% OFF
            </span>
          )}

          <AddToWishlistButton
            productId={product?.id}
            product={product}
            className="product-wish"
          />

          <Link className="product-image" href={`/product/${product?.handle}`}>
            <LazyImage
              src={product?.image_url}
              alt={`${product?.title || "Vyra Herbal product"} - Vyra Herbals`}
              isLazy={isImageLazy}
            />
          </Link>
        </div>

        <div className="product-content">
          <h6 className="product-name">
            <Link href={`/product/${product?.handle}`} title={product?.title}>
              <EllipsisControl text={formattedTitle} lines={2} />
            </Link>
          </h6>

          <div className="details-rating">
            {(ratingDetails as any)?.average ? (
              <>
                <StarRatings
                  rating={(ratingDetails as any).average}
                  className="me-1"
                />
                <Link href={`/product/${product?.handle}#reviews`} className="review-count-text">
                  ({(ratingDetails as any).count})
                </Link>
              </>
            ) : (
              <span className="rating-unreviewed">★ 100% Herbal Formulation</span>
            )}
          </div>

          <div className="product-price">
            <span className="price">₹{product?.price}</span>
            {product?.regular_price && product.regular_price > product.price && (
              <>
                <span className="mrp-label">MRP</span>
                <span className="regular-price">₹{product.regular_price}</span>
              </>
            )}
          </div>

          <div className="product-action-box">
            <AddToCartButton productId={product?.id} product={product} />
          </div>
        </div>
      </div>
    </StyledProduct>
  );
};

export default ProductCard;

export const StyledProduct = styled.section`
  .product-card {
    width: 100%;
    position: relative;
    border-radius: var(--vyra-radius-card, 4px);
    background: #ffffff;
    border: 1px solid var(--vyra-border-hairline, rgba(11, 20, 14, 0.08));
    display: flex;
    flex-direction: column;
    height: 100%;
    transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.2s ease, box-shadow 0.25s ease;

    &:hover {
      border-color: #0b140e;
      transform: translateY(-3px);
      box-shadow: 0 10px 24px rgba(11, 20, 14, 0.07);
    }

    .product-media {
      position: relative;
      width: 100%;
      aspect-ratio: 1 / 1;
      background: #fbfbf9;
      overflow: hidden;

      .card-badge-discount {
        position: absolute;
        top: 8px;
        left: 8px;
        background: #d97746;
        color: #ffffff;
        font-size: 0.68rem;
        font-weight: 800;
        letter-spacing: 0.04em;
        padding: 3px 7px;
        border-radius: 2px;
        z-index: 2;
      }

      .product-wish {
        position: absolute;
        top: 8px;
        right: 8px;
        z-index: 2;
      }

      .product-image {
        display: block;
        width: 100%;
        height: 100%;

        .lazy-image {
          width: 100%;
          height: 100%;

          img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            transition: transform 0.5s ease;
          }
        }
      }
    }

    &:hover .product-media .lazy-image img {
      transform: scale(1.04);
    }

    .product-content {
      padding: 12px;
      display: flex;
      flex-direction: column;
      flex-grow: 1;

      .product-name {
        margin-bottom: 6px;
        min-height: 2.6rem;

        a {
          font-size: 0.86rem;
          font-weight: 700;
          line-height: 1.35;
          color: #0b140e;
          text-transform: uppercase;
          letter-spacing: 0.02em;
          transition: color 0.2s ease;

          &:hover {
            color: #b58934;
          }
        }
      }

      .details-rating {
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 0.74rem;
        margin-bottom: 8px;

        .review-count-text {
          color: #78857d;
          font-weight: 600;
        }

        .rating-unreviewed {
          color: #2e593c;
          font-weight: 600;
          font-size: 0.7rem;
          letter-spacing: 0.02em;
        }
      }

      .product-price {
        display: flex;
        align-items: baseline;
        gap: 6px;
        margin-bottom: 12px;
        margin-top: auto;

        .price {
          font-size: 1.15rem;
          font-weight: 800;
          color: #0b140e;
        }

        .mrp-label {
          font-size: 0.7rem;
          color: #78857d;
          font-weight: 600;
        }

        .regular-price {
          font-size: 0.8rem;
          color: #78857d;
          text-decoration: line-through;
        }
      }

      .product-action-box {
        width: 100%;

        button {
          width: 100%;
        }
      }
    }
  }

  @media (max-width: 576px) {
    .product-card .product-content {
      padding: 10px 8px;

      .product-name a {
        font-size: 0.78rem;
      }

      .product-price .price {
        font-size: 1.05rem;
      }
    }
  }
`;
