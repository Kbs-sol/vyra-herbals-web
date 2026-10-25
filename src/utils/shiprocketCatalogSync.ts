import { after } from 'next/server';
import {
  getShiprocketConfig,
  mapCategoryToCollection,
  mapProductToShiprocket,
  pushCollectionWebhook,
  pushProductWebhook,
} from './shiprocketCheckout';

/**
 * Keep Shiprocket's catalogue cache fresh when the admin edits a product or
 * category. Shiprocket also pulls /api/shiprocket/catalog/*, so this is an
 * optimisation, never a dependency: it is best effort, runs after the admin
 * response has been sent, never throws, and does nothing without credentials.
 *
 * Credit: VJ <vijayprasadvvp@gmail.com>
 */

const origin = (): string => (process.env.NEXT_PUBLIC_SITE_ORIGIN || 'https://vyraherbals.com').replace(/\/$/, '');

function schedule(task: () => Promise<void>) {
  const safe = async () => {
    try {
      await task();
    } catch (e) {
      console.warn('[shiprocket/catalog-sync]', (e as Error).message);
    }
  };
  try {
    after(safe);
  } catch {
    void safe(); // outside a request scope (scripts / tests)
  }
}

export function pushProductChange(row: any, opts: { archived?: boolean } = {}) {
  const cfg = getShiprocketConfig();
  if (!cfg.configured || !row?.id) return;
  schedule(async () => {
    const mapped: any = mapProductToShiprocket(row, origin());
    if (opts.archived) mapped.status = 'archived';
    const r = await pushProductWebhook(cfg, mapped);
    if (!r.ok) console.warn(`[shiprocket/catalog-sync] product ${row.id}: ${r.status} ${r.error}`);
  });
}

export function pushCategoryChange(row: any) {
  const cfg = getShiprocketConfig();
  if (!cfg.configured || !row) return;
  schedule(async () => {
    const r = await pushCollectionWebhook(cfg, mapCategoryToCollection(row, origin()) as any);
    if (!r.ok) console.warn(`[shiprocket/catalog-sync] collection ${row.id}: ${r.status} ${r.error}`);
  });
}
