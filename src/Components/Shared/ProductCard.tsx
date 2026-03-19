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
          <AddToWishlistButton
            productId={product?.id}
            product={product}
            className="product-wish"
          />
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
            {(ratingDetails as any)?.average && (
              <StarRatings
                rating={(ratingDetails as any).average}
                className="me-1 mb-1"
              />
            )}
            <Link href={`/product/${product.handle}#reviews`}>
              ({(ratingDetails as any)?.count || "No"}{" "}
              {(ratingDetails as any)?.count === 1 ? "review" : "reviews"})
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
                Number(Utility.calculateDiscount(product.price, product.regular_price))
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
        z-index: 2;
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
      font-size: 14px;
      line-height: 20px;
      min-height: 3.8rem;
      a {
        font-size: 15px !important;
        word-break: break-word;
        white-space: normal;
        overflow-wrap: break-word;
      }
    }
    .product-price {
      white-space: normal;
      .price {
        font-size: 1.15rem !important;
      }
      .text-muted {
        font-size: 0.9rem !important;
      }
      .discount {
        font-size: 0.8rem !important;
      }
    }
    .details-rating {
      white-space: normal;
      word-break: break-word;
      overflow-wrap: break-word;
    }
  }

  @media (max-width: 420px) {
    .product-name a {
      font-size: 14px !important;
      word-break: break-word;
      overflow-wrap: break-word;
    }
    .product-price {
      .price {
        font-size: 1.05rem !important;
      }
    }
  }

  @media (max-width: 360px) {
    .product-name a {
      font-size: 14px !important;
    }
    .product-price {
      .price {
        font-size: 1.05rem !important;
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
