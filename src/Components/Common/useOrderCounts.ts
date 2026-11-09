'use client';

import { useEffect, useState } from 'react';

export type OrderCounts = {
  windowDays: number;
  products: Record<string, number>;
  families: Record<string, number>;
  unavailable?: boolean;
};

/** Below this we hide the social-proof label (small numbers hurt trust). */
export const MIN_COUNT_TO_SHOW = 5;

let inflight: Promise<OrderCounts | null> | null = null;
let loaded: OrderCounts | null = null;

function load(): Promise<OrderCounts | null> {
  if (loaded) return Promise.resolve(loaded);
  if (!inflight) {
    inflight = fetch('/api/products/order-counts')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d && !d.unavailable) loaded = d;
        return d as OrderCounts | null;
      })
      .catch(() => null)
      .finally(() => { inflight = null; });
  }
  return inflight;
}

export function useOrderCounts(): OrderCounts | null {
  const [counts, setCounts] = useState<OrderCounts | null>(loaded);
  useEffect(() => {
    let alive = true;
    load().then((d) => { if (alive && d) setCounts(d); });
    return () => { alive = false; };
  }, []);
  return counts;
}

/** "42+ people ordered this month" or null when too low / unknown. */
export function orderCountLabel(count: number | undefined | null): string | null {
  if (!count || count < MIN_COUNT_TO_SHOW) return null;
  const rounded = count >= 50 ? Math.floor(count / 10) * 10 : count;
  return `${rounded}+ people ordered this month`;
}
