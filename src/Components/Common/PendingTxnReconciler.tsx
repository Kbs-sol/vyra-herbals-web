'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { API_PATH } from '../../constants';

const STORAGE_KEY = 'vyra_pending_txn';
const STALE_AFTER_MS = 45 * 60 * 1000; // 45 min

/**
 * Mounted once in the root layout. If the user previously initiated an Easebuzz
 * payment but the surl callback never reached /api/payment/success (closed tab,
 * dropped network, Vercel cold-start timeout), the txnid is sitting in
 * localStorage and our `orders` table is missing the row.
 *
 * On the next page load — wherever they land back on our site — we fire off a
 * single reconcile call. The endpoint verifies the payment with Easebuzz before
 * doing anything, so this is safe to call from the open web.
 *
 * If reconcile reports the order was created (or already exists), we send the
 * user straight to the confirmation page so they don't think their money is
 * gone. Otherwise we just clear the marker silently — the server-side cron will
 * keep retrying.
 */
export default function PendingTxnReconciler() {
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        // Don't run on admin routes or on the order-placed page itself (that
        // page already runs its own reconcile-then-fetch sequence).
        if (!pathname) return;
        if (pathname.startsWith('/admin')) return;
        if (pathname.startsWith('/order-placed/')) return;

        let cancelled = false;
        (async () => {
            try {
                const raw = localStorage.getItem(STORAGE_KEY);
                if (!raw) return;
                const parsed = JSON.parse(raw);
                const txnId = parsed?.txnId;
                const at = Number(parsed?.at || 0);
                if (!txnId) {
                    localStorage.removeItem(STORAGE_KEY);
                    return;
                }
                if (at && Date.now() - at > STALE_AFTER_MS) {
                    // Too old to be useful. The cron handles the long tail.
                    localStorage.removeItem(STORAGE_KEY);
                    return;
                }

                const res = await fetch(`${API_PATH}/payment/reconcile`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ txnid: String(txnId) }),
                });
                if (!res.ok) return;
                const json = await res.json().catch(() => null);
                if (cancelled) return;

                const outcome = json?.outcome;
                if (!outcome) return;

                if (outcome.status === 'created' || outcome.status === 'already_exists') {
                    // Order is durable. Pull the numeric DB id from the marker
                    // (we stored the txnid which equals the order id since the
                    // success route uses Date.now() for both) so we can deep-link
                    // to the confirmation page.
                    localStorage.removeItem(STORAGE_KEY);
                    // outcome.order_id is `ORD-<id>` — strip the prefix for the URL.
                    const orderIdRaw = String(outcome.order_id || '');
                    const numericId = orderIdRaw.startsWith('ORD-')
                        ? orderIdRaw.slice(4)
                        : orderIdRaw || txnId;
                    router.replace(`/order-placed/${numericId}`);
                } else if (outcome.status === 'pending') {
                    // Easebuzz hasn't confirmed yet. Leave the marker so a later
                    // page load can try again.
                } else {
                    // 'failed' or 'skipped' — clear so we don't loop on a dead txn.
                    localStorage.removeItem(STORAGE_KEY);
                }
            } catch {
                // Storage errors / network errors are non-fatal.
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [pathname, router]);

    return null;
}
