'use client';

import React, { useMemo } from "react";
import styled from "styled-components";
import PropTypes from "prop-types";
import { FaHeart, FaRegHeart } from "react-icons/fa";
import { useWishlist } from "../Contexts/WishlistContext";
import { useAuth } from "../Contexts/AuthContext";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";

interface AddToWishlistButtonProps {
  productId: number | string;
  product?: any;
  className?: string;
  showLabel?: boolean;
}

const AddToWishlistButton = (props: AddToWishlistButtonProps) => {
  const { productId, product, className, showLabel = false } = props;
  const { isInWishlist, addToWishlist, removeFromWishlist } = useWishlist();
  const { user } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = React.useState(false);

  const inWishlist = useMemo(() => {
    return isInWishlist(productId);
  }, [isInWishlist, productId]);

  const handleToggleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      toast.error("You have to login first", {
        position: "bottom-center",
        autoClose: 1000,
      });
      router.push(`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
      return;
    }

    setLoading(true);
    try {
      if (inWishlist) {
        await removeFromWishlist(productId);
      } else {
        await addToWishlist(productId, product);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <StyledWishlistButton
      className={`wishlist-btn ${inWishlist ? 'active' : ''} ${className || ''}`}
      title={inWishlist ? "Remove from Wishlist" : "Add to Wishlist"}
      onClick={handleToggleWishlist}
      disabled={loading}
      type="button"
    >
      {loading ? (
        <Spinner />
      ) : inWishlist ? (
        <FaHeart className="heart-icon filled" />
      ) : (
        <FaRegHeart className="heart-icon" />
      )}
      {showLabel && (
        <span className="label">
          {inWishlist ? "In Wishlist" : "Add to Wishlist"}
        </span>
      )}
    </StyledWishlistButton>
  );
};

export default React.memo(AddToWishlistButton);

AddToWishlistButton.propTypes = {
  productId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  product: PropTypes.object,
  className: PropTypes.string,
  showLabel: PropTypes.bool,
};

const StyledWishlistButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  background: rgba(255, 255, 255, 0.9);
  border: none;
  border-radius: 50%;
  width: 36px;
  height: 36px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);

  &:hover {
    background: #fff;
    transform: scale(1.1);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.7;
  }

  .heart-icon {
    font-size: 18px;
    color: #999;
    transition: all 0.3s ease;

    &.filled {
      color: #e74c3c;
    }
  }

  &.active .heart-icon {
    color: #e74c3c;
  }

  &:hover .heart-icon {
    color: #e74c3c;
  }

  .label {
    font-size: 14px;
    font-weight: 500;
    color: var(--text);
  }

  /* Variant for inline/text display */
  &.inline {
    width: auto;
    border-radius: 8px;
    padding: 8px 16px;
    background: transparent;
    box-shadow: none;

    &:hover {
      background: rgba(231, 76, 60, 0.1);
    }
  }
`;

const Spinner = styled.div`
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid rgba(231, 76, 60, 0.3);
  border-radius: 50%;
  border-top-color: #e74c3c;
  animation: spin 0.8s ease-in-out infinite;

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;
