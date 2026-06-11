import React, { useState } from 'react';
import styled from 'styled-components';
import { useRouter } from 'next/navigation';
import { resolveCurrentHandle } from '../../utils/productHandle';

interface OrderProductItemProps {
  product: {
    product_id: string | number;
    product_title: string;
    product_image: string;
    quantity: number;
    item_amount: number;
    attributes?: any; // For future use (size, color, etc.)
    handle?: string;
    image_url?: string;
    title?: string;
  };
}

const OrderProductItem: React.FC<OrderProductItemProps> = ({ product }) => {
  const router = useRouter();
  const [navigating, setNavigating] = useState(false);

  // Normalize product data to handle different API responses
  // Prioritize image_url over product_image as it aligns with CartItem/API response structure
  const displayImage = product.image_url || product.product_image || (product as any).image_url || '/placeholder.png';
  const displayTitle = product.product_title || (product as any).title || 'Product';
  const displayPrice = product.item_amount || (product as any).price || (product as any).total_price || 0;
  const displayQty = product.quantity || (product as any).qty || 1;

  // The handle stored on the order line-item is a snapshot from purchase time and
  // can be stale if the admin later changed the product's URL slug. Resolve the
  // CURRENT handle from the stable product id before navigating, falling back to
  // the snapshot handle if the lookup fails.
  const snapshotHandle = product.handle || (product as any).handle;
  const targetId = product.product_id || (product as any).id;

  const handleProductClick = async () => {
    if (navigating) return;
    if (!targetId && !snapshotHandle) return;

    setNavigating(true);
    try {
      const handle = await resolveCurrentHandle(targetId, snapshotHandle);
      if (handle) {
        router.push(`/product/${handle}`);
      }
    } finally {
      setNavigating(false);
    }
  };

  return (
    <ItemContainer>
      <ImageWrapper onClick={handleProductClick}>
        <img
          src={displayImage}
          alt={displayTitle}
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            if (target.src.includes('/placeholder.png')) return; // Prevent infinite loop
            target.src = '/placeholder.png';
          }}
        />
      </ImageWrapper>
      <Details>
        <Title onClick={handleProductClick}>{displayTitle}</Title>
        <Meta>
          <span className="qty">Qty: {displayQty}</span>
        </Meta>
        <Price>₹{displayPrice}</Price>
      </Details>
    </ItemContainer>
  );
};

export default OrderProductItem;

const ItemContainer = styled.div`
  display: flex;
  gap: 1rem;
  padding: 1rem 0;
  border-bottom: 1px solid #f0f0f0;

  &:last-child {
    border-bottom: none;
  }
`;

const ImageWrapper = styled.div`
  width: 80px;
  height: 80px;
  flex-shrink: 0;
  cursor: pointer;
  border-radius: 4px;
  overflow: hidden;
  border: 1px solid #e0e0e0;

  img {
    width: 100%;
    height: 100%;
    object-fit: contain; /* Ensure product is fully visible */
    transition: transform 0.2s;
  }

  &:hover img {
    transform: scale(1.05);
  }
`;

const Details = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
`;

const Title = styled.h6`
  font-size: 0.95rem;
  font-weight: 500;
  color: #212121;
  margin-bottom: 0.25rem;
  cursor: pointer;
  
  &:hover {
    color: var(--primary); /* Assuming a primary color variable exists */
  }
`;

const Meta = styled.div`
  font-size: 0.85rem;
  color: #878787;
  margin-bottom: 0.25rem;

  span {
    margin-right: 1rem;
  }
`;

const Price = styled.div`
  font-size: 1rem;
  font-weight: 600;
  color: #212121;
`;
