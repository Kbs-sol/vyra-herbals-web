'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import styled from 'styled-components';
import { Check, ShoppingCart, Star } from 'lucide-react';
import { useCart } from '../Contexts/CartContext';
import { addToCart as trackAddToCart } from '../../utils/analytics';
import { FamilyGroup, variantLabel } from '../../utils/variantFamilies';
import { useOrderCounts, orderCountLabel } from '../Common/useOrderCounts';

const inr = (n: number) => '\u20B9' + Math.round(Number(n) || 0).toLocaleString('en-IN');

/** One card per product family: size chips switch price/image/link, one tap adds to cart. */
const FamilyProductCard = ({ group }: { group: FamilyGroup<any> }) => {
  const { addItemToCart, cartItems } = useCart();
  const counts = useOrderCounts();
  const startIndex = Math.max(0, group.variants.findIndex((v) => Number(v.id) === Number(group.defaultVariant?.id)));
  const [idx, setIdx] = useState(startIndex);
  const [busy, setBusy] = useState(false);

  const product = group.variants[idx] || group.variants[0];
  const price = Number(product?.price || 0);
  const mrp = Number(product?.regular_price || 0);
  const off = mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;
  const inCart = (cartItems || []).some((i: any) => Number(i?.id) === Number(product?.id));

  const rating = useMemo(() => {
    const approved = (product?.reviews || []).filter((r: any) => Number(r.status) === 1);
    if (!approved.length) return null;
    const avg = approved.reduce((s: number, r: any) => s + Number(r.rating || 0), 0) / approved.length;
    return { avg, count: approved.length };
  }, [product]);

  const social = orderCountLabel(counts?.families?.[group.key] ?? counts?.products?.[String(product?.id)]);

  const add = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await addItemToCart(product.id, 1, product);
      trackAddToCart({
        item_id: product.id,
        item_name: product.title,
        item_category: product.category || undefined,
        item_brand: 'Vyra Herbals',
        item_variant: variantLabel(product),
        price,
        quantity: 1,
        currency: 'INR',
      });
    } finally {
      setBusy(false);
    }
  };

  if (!product) return null;
  const href = `/product/${encodeURIComponent(product.handle)}`;

  return (
    <Card>
      <Link href={href} className="fc-media" aria-label={`View ${product.title}`}>
        {off > 0 && <span className="fc-off">{off}% OFF</span>}
        {product.image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.image_url} alt={`${product.title} - Vyra Herbals`} width={320} height={320} loading="lazy" />
        )}
      </Link>
      <div className="fc-body">
        <h3>
          <Link href={href}>{group.variants.length > 1 ? group.name : product.title}</Link>
        </h3>
        {rating && (
          <p className="fc-rating">
            <Star size={13} fill="#1B3B2B" color="#1B3B2B" aria-hidden="true" /> {rating.avg.toFixed(1)}{' '}
            <span>({rating.count})</span>
          </p>
        )}
        {social && <p className="fc-social">{social}</p>}

        {group.variants.length > 1 && (
          <div className="fc-chips" role="radiogroup" aria-label={`${group.name} size`}>
            {group.variants.map((v, i) => (
              <button
                key={v.id}
                type="button"
                role="radio"
                aria-checked={i === idx}
                className={`fc-chip${i === idx ? ' is-on' : ''}`}
                onClick={() => setIdx(i)}
              >
                {variantLabel(v)}
              </button>
            ))}
          </div>
        )}

        <div className="fc-price" aria-live="polite">
          <strong>{inr(price)}</strong>
          {mrp > price && <s>{inr(mrp)}</s>}
        </div>

        {inCart ? (
          <Link href="/cart" className="fc-add is-in">
            <Check size={17} strokeWidth={2.5} aria-hidden="true" /> In cart, view cart
          </Link>
        ) : (
          <button type="button" className="fc-add" onClick={add} disabled={busy}>
            <ShoppingCart size={17} aria-hidden="true" /> {busy ? 'Adding...' : 'Add to Cart'}
          </button>
        )}
      </div>
    </Card>
  );
};

export default FamilyProductCard;

const Card = styled.li`
  display: flex;
  flex-direction: column;
  background: #fff;
  border: 1px solid rgba(27, 59, 43, 0.14);
  border-radius: 18px;
  overflow: hidden;
  list-style: none;
  transition: transform 0.25s ease, box-shadow 0.25s ease;
  &:hover { transform: translateY(-3px); box-shadow: 0 14px 30px rgba(27, 59, 43, 0.12); }

  .fc-media { position: relative; display: block; aspect-ratio: 1 / 1; background: #e6eee8; overflow: hidden; }
  .fc-media img { width: 100%; height: 100%; object-fit: cover; }
  .fc-off {
    position: absolute; top: 10px; left: 10px; z-index: 1; background: #1b3b2b; color: #fff;
    font-size: 11px; font-weight: 700; letter-spacing: 0.06em; padding: 4px 9px; border-radius: 999px;
  }
  .fc-body { display: flex; flex-direction: column; flex: 1; padding: 14px; }
  h3 { font-family: var(--font-cormorant), 'Cormorant Garamond', Georgia, serif; font-size: 21px; font-weight: 600; line-height: 1.15; margin: 0 0 6px; }
  h3 a { color: #1b3b2b; text-decoration: none; }
  .fc-rating { display: flex; align-items: center; gap: 4px; margin: 0 0 4px; font-size: 12.5px; font-weight: 700; color: #1b3b2b; }
  .fc-rating span { font-weight: 400; color: #5b655f; }
  .fc-social { margin: 0 0 8px; font-size: 12px; font-weight: 600; color: #7a9a83; }
  .fc-chips { display: flex; flex-wrap: wrap; gap: 6px; margin: 6px 0 10px; }
  .fc-chip {
    min-height: 40px; padding: 0 12px; border-radius: 999px; border: 1.5px solid rgba(27, 59, 43, 0.18);
    background: #fff; color: #1b3b2b; font-weight: 700; font-size: 12.5px; cursor: pointer;
    transition: background 0.2s ease, color 0.2s ease, border-color 0.2s ease;
  }
  .fc-chip.is-on { background: #1b3b2b; color: #fff; border-color: #1b3b2b; }
  .fc-price { display: flex; align-items: baseline; gap: 8px; margin: auto 0 10px; color: #1b3b2b; padding-top: 4px; }
  .fc-price strong { font-size: 22px; }
  .fc-price s { font-size: 13px; color: #5b655f; }
  .fc-add {
    display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 46px; width: 100%;
    border: 0; border-radius: 12px; background: #1b3b2b; color: #fff; font-weight: 700; font-size: 13.5px;
    letter-spacing: 0.03em; text-decoration: none; cursor: pointer; transition: background 0.2s ease;
  }
  .fc-add:hover:not(:disabled) { background: #142b20; }
  .fc-add:disabled { background: #7a9a83; }
  .fc-add.is-in { background: #e6eee8; color: #1b3b2b; }
  .fc-chip:focus-visible, .fc-add:focus-visible { outline: 3px solid #7a9a83; outline-offset: 2px; }
  @media (max-width: 768px) {
    .fc-body { padding: 10px; }
    h3 { font-size: 18px; }
    .fc-price strong { font-size: 19px; }
    .fc-add { font-size: 12.5px; letter-spacing: 0; }
  }
`;
