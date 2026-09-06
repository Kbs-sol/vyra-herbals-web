'use client';

import Link from "next/link";
import LazyImage from "../Common/LazyImage";
import styled from "styled-components";
import AddToCartButton from "../Common/AddToCartButton";
import AddToWishlistButton from "../Common/AddToWishlistButton";
import EllipsisControl from "../Common/EllipsisControl";
import Utility from "../../utils/UtilityFunctions";
import StarRatings from "../Common/StarRatings";
import { useMemo } from "react";

const ProductCard2 = ({ product }) => {
  const filteredReviews = useMemo(() => {
    return product?.reviews?.filter((a) => Number(a.status) === 1);
  }, [product?.reviews]);
  const ratingDetails = useMemo(
    () => Utility.calculateRating(product ? filteredReviews : []),
    [product, filteredReviews]
  );
  return (
    <StyledProductCard2 className="col">
      <div className="feature-card">
        <div className="feature-media">
          {/* <div className="feature-label">
            <label className="label-text feat">Save 100</label>
          </div> */}
          <AddToWishlistButton
            productId={product?.id}
            product={product}
            className="feature-wish"
          />
          <a className="feature-image" href={`/product/${product.handle}`}>
            <LazyImage src={product.image_url} alt="product" />
          </a>
        </div>
        <div className="feature-content">
          <h6 className="feature-name">
            <a href={`/product/${product.handle}`}>
              <EllipsisControl text={product.title} lines={2} />
            </a>
          </h6>
          <p className="feature-desc">{product.description}</p>
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
          <h6 className="feature-price">
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
          <AddToCartButton productId={product?.id} product={product} />
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
    </StyledProductCard2>
  );
};
export default ProductCard2;

export const StyledProductCard2 = styled.section`
  .feature-card {
    width: 100%;
    overflow: hidden;
    position: relative;
    margin-bottom: 25px;
    padding: 13px 13px;
    border-radius: 8px;
    background: var(--white);
    border: 1px solid var(--border);
    display: flex;
    align-items: center;
    justify-content: flex-start;
    transition: all linear 0.3s;
    -webkit-transition: all linear 0.3s;
    -moz-transition: all linear 0.3s;
    -ms-transition: all linear 0.3s;
    -o-transition: all linear 0.3s;
    &:hover {
      border-color: var(--primary);
      box-shadow: 0px 8px 15px 0px rgba(0, 0, 0, 0.1);
      .product-add {
        color: var(--white);
        background: var(--primary);
      }
    }

    .feature-media {
      position: relative;

      .feature-wish {
        position: absolute;
        top: 7px;
        right: 10px;
        z-index: 2;
      }
      .feature-label {
        display: flex;
        flex-direction: column;
        position: absolute;
        top: 0px;
        left: 0px;
        z-index: 1;
        .label-text {
          font-size: 14px;
          padding: 5px 8px;
          line-height: 13px;
          border-radius: 3px;
          margin-bottom: 5px;
          color: var(--white);
          text-align: center;
          text-transform: capitalize;
          &.feat {
            background: var(--purple);
          }
        }
      }
      .feature-image {
        overflow: hidden;

        img {
          width: 600px;
          border-radius: 10px;
        }
      }
    }

    .feature-content {
      .feature-price {
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
        @media (max-width: 1200px) {
          .price {
            font-size: 1.2rem !important;
          }
          .text-muted {
            font-size: 1.1rem !important;
          }
          .discount {
            font-size: 1rem !important;
          }
        }
      }
    }
  }
`;
