'use client';

import React, { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useCatalogue } from '../Home/redesign/useCatalogue';
import { siblingIdsFor, variantLabel, variantSortValue } from '../../utils/variantFamilies';

/**
 * Size / pack selector for every product. Products are separate DB rows per
 * size, so chips link to the sibling product pages. Renders instantly from the
 * static catalogue snapshot, then upgrades to live prices.
 */
const VariantSelector = ({ product }: { product: any }) => {
  const router = useRouter();
  const ids = useMemo(() => siblingIdsFor(product?.id), [product?.id]);
  const siblings = useCatalogue(ids);

  const variants = useMemo(() => {
    const list = siblings.length ? [...siblings] : [];
    if (!list.some((v) => Number(v.id) === Number(product?.id))) list.push(product);
    return list.sort((a: any, b: any) => variantSortValue(a) - variantSortValue(b));
  }, [siblings, product]);

  if (!product) return null;

  return (
    <div className="variant-selector" role="radiogroup" aria-label="Choose size">
      <div className="variant-selector__label">
        Size / pack: <strong>{variantLabel(product)}</strong>
      </div>
      <div className="variant-selector__chips">
        {variants.map((v: any) => {
          const active = Number(v.id) === Number(product.id);
          return (
            <button
              key={v.id}
              type="button"
              role="radio"
              aria-checked={active}
              className={`variant-chip${active ? ' is-active' : ''}`}
              onClick={() => {
                if (!active && v.handle) router.replace(`/product/${encodeURIComponent(v.handle)}`, { scroll: false });
              }}
            >
              <span className="variant-chip__name">{variantLabel(v)}</span>
              {v.price != null && <span className="variant-chip__price">₹{Math.round(Number(v.price))}</span>}
            </button>
          );
        })}
      </div>
      <style jsx>{`
        .variant-selector { margin: 14px 0 6px; }
        .variant-selector__label { font-size: 14px; color: #1f2421; margin-bottom: 8px; }
        .variant-selector__chips { display: flex; flex-wrap: wrap; gap: 10px; }
        .variant-chip {
          display: inline-flex; flex-direction: column; align-items: center; justify-content: center;
          min-width: 84px; min-height: 52px; padding: 6px 14px; border-radius: 12px;
          border: 1.5px solid rgba(27, 59, 43, 0.2); background: #fff; color: #1b3b2b; cursor: pointer;
          transition: border-color 0.2s ease, background 0.2s ease, color 0.2s ease;
        }
        .variant-chip:hover { border-color: #7a9a83; }
        .variant-chip.is-active { background: #1b3b2b; border-color: #1b3b2b; color: #fff; }
        .variant-chip__name { font-weight: 700; font-size: 13.5px; line-height: 1.2; text-align: center; }
        .variant-chip__price { font-size: 12px; opacity: 0.85; }
        .variant-chip:focus-visible { outline: 3px solid #7a9a83; outline-offset: 2px; }
      `}</style>
    </div>
  );
};

export default VariantSelector;
