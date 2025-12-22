'use client';

import Link from "next/link";
import LazyImage from "../Common/LazyImage";
import styled from "styled-components";
import AddToCartButton from "../Common/AddToCartButton";
import EllipsisControl from "../Common/EllipsisControl";
import Utility from "../../utils/UtilityFunctions";
import { useMemo } from "react";
import StarRatings from "../Common/StarRatings";

const ProductCard = ({ product, isImageLazy = true }) => {
  const filteredReviews = useMemo(() => {
    return product?.reviews?.filter((a) => Number(a.status) === 1);
  }, [product?.reviews]);
  const ratingDetails = useMemo(() => {
    if (product && filteredReviews?.length) {
      return Utility.calculateRating(filteredReviews);
    }
    return {};
  }, [filteredReviews]);
  return (
    <StyledProduct className="col">
      <div className="product-card">
        <div className="product-media">
          <button className="product-wish wish">
            <i className="fas fa-heart"></i>
          </button>
          <Link className="product-image" href={`/product/${product.handle}`}>
            <LazyImage
              src={product.image_url}
              alt={`${product.title}-image`}
              isLazy={isImageLazy}
            />
          </Link>
        </div>
        <div className="product-content">
          <h6 className="product-name">
            <Link href={`/product/${product.handle}`}>
              <EllipsisControl text={product.title} lines={2} />
            </Link>
          </h6>
          <div className="details-rating">
            {!!ratingDetails.average && (
              <StarRatings
                rating={ratingDetails.average}
                className="me-1 mb-1"
              />
            )}
            <Link href={`/product/${product.handle}#reviews`}>
              ({ratingDetails.count || "No"}{" "}
              {ratingDetails.count === 1 ? "review" : "reviews"})
            </Link>
          </div>
          <h6 className="product-price">
            <span className="pe-2 price">₹{product.price}</span>
            <span className="pe-1 text-muted">MRP</span>
            <span
              className="text-muted"
              style={{ textDecoration: "line-through" }}
            >
              ₹{product.regular_price}
            </span>
            <span className="discount ms-2 text-success">
              {Math.floor(
                Utility.calculateDiscount(product.price, product.regular_price)
              )}
              % Off
            </span>
          </h6>
          <AddToCartButton productId={product?.id} />
          <div className="product-action">
            <button className="action-minus" title="Quantity Minus">
              <i className="icofont-minus"></i>
            </button>
            <input
              className="action-input"
              title="Quantity Number"
              type="text"
              name="quantity"
              value="1"
              readOnly
            />
            <button className="action-plus" title="Quantity Plus">
              <i className="icofont-plus"></i>
            </button>
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
    overflow: hidden;
    position: relative;
    margin-bottom: 25px;
    padding: 10px 12px;
    border-radius: 0.5rem;
    background: var(--white);
    border: 1px solid var(--border);
    transition: all linear 0.3s;
    -webkit-transition: all linear 0.3s;
    -moz-transition: all linear 0.3s;
    -ms-transition: all linear 0.3s;
    -o-transition: all linear 0.3s;
    &:hover {
      /* border-color: var(--primary); */
      box-shadow: 0px 8px 15px 0px rgba(0, 0, 0, 0.1);
      .product-add {
        color: var(--white);
        background: var(--primary);
      }
    }
    .product-media {
      position: relative;
      width: 100%;
      .product-wish {
        position: absolute;
        top: 8px;
        right: 12px;
        font-size: 18px;
        color: #fff;
        &.active {
          color: var(--primary);
        }
        &.wish {
          display: none !important;
        }
      }
      .product-image {
        width: 100%;
        .lazy-image {
          border-radius: 0.5rem;
          img {
            width: 100%;
          }
        }
      }
    }
    .product-content {
      .product-name {
        text-transform: capitalize;
        min-height: 4.2rem;
        a {
          width: 100%;
          color: var(--sub-heading);
          transition: all linear 0.3s;
          -webkit-transition: all linear 0.3s;
          -moz-transition: all linear 0.3s;
          -ms-transition: all linear 0.3s;
          -o-transition: all linear 0.3s;
          font-size: 17px;
          &:hover {
            color: var(--primary);
          }
        }
      }
      .product-price {
        .price {
          font-size: 1.5rem;
          font-weight: bold;
          color: var(--text);
        }
        .text-muted {
          font-size: 1.2rem;
        }
        .discount {
          font-size: 1rem;
          font-weight: bold;
        }
      }
    }
  }

  @media (max-width: 576px) {
    .product-card {
      padding: 8px;
      margin-bottom: 8px;
    }
    .product-name {
      font-size: 15px;
      line-height: 22px;
      a {
        font-size: 16px !important;
      }
    }
  }
  @media (max-width: 1200px) {
    .product-content {
      .product-price {
        .price {
          font-size: 1.2rem !important;
        }
        .text-muted {
          font-size: 1rem !important;
        }
        .discount {
          font-size: 0.8rem !important;
        }
      }
    }
  }
`;
