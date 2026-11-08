"use client";

import { useEffect, useState } from "react";
import { API_PATH } from "../../../constants";
import { STATIC_PRODUCTS } from "../../../utils/staticCatalogue";

export interface CatalogueProduct {
  id: number;
  handle: string;
  title: string;
  category: string | null;
  price: number | null;
  regular_price: number | null;
  image_url: string | null;
  [key: string]: any;
}

const fromStatic = (ids: number[]): CatalogueProduct[] =>
  ids
    .map((id) => STATIC_PRODUCTS.find((p) => p.id === id))
    .filter(Boolean) as CatalogueProduct[];

/**
 * Returns products for the given ids. Renders instantly from the static
 * snapshot, then upgrades to live Supabase prices when /api/products/with-reviews
 * answers. Server re-prices at checkout anyway, so this is display-only.
 */
export function useCatalogue(ids: number[]): CatalogueProduct[] {
  const key = ids.join(",");
  const [products, setProducts] = useState<CatalogueProduct[]>(() => fromStatic(ids));

  useEffect(() => {
    const wanted = key.split(",").map(Number).filter(Boolean);
    setProducts(fromStatic(wanted));
    let cancelled = false;
    fetch(`${API_PATH}/products/with-reviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: wanted }),
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("bad status"))))
      .then((rows) => {
        if (cancelled || !Array.isArray(rows) || !rows.length) return;
        const byId = new Map<number, CatalogueProduct>(rows.map((r: any) => [Number(r.id), r]));
        setProducts(
          wanted
            .map((id) => byId.get(id) ?? STATIC_PRODUCTS.find((p) => p.id === id))
            .filter(Boolean) as CatalogueProduct[]
        );
      })
      .catch(() => {
        /* keep static snapshot */
      });
    return () => {
      cancelled = true;
    };
  }, [key]);

  return products;
}
