// Live iCarry status lookup + mapping to our internal order status.
//
// Used by the admin "Sync from iCarry" action to write shipped/delivered back
// onto orders. Order status was previously only ever set manually in the admin;
// iCarry live status was read on the customer tracking page but never persisted.

const ICARRY_HEADERS = {
  "Content-Type": "application/x-www-form-urlencoded",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
};

/**
 * Fetch the live status string for a shipment from iCarry's authenticated
 * tracking API (`api_track_shipment`, keyed by the internal numeric shipment_id).
 * Returns null on any failure (WAF/HTML block, non-JSON, timeout, no status).
 */
export const fetchIcarryStatus = async (
  shipmentId: string,
  apiToken: string
): Promise<string | null> => {
  try {
    const res = await fetch(
      `https://www.icarry.in/api_track_shipment?api_token=${apiToken}`,
      {
        method: "POST",
        headers: ICARRY_HEADERS,
        body: new URLSearchParams({ shipment_id: String(shipmentId) }),
      }
    );
    const text = await res.text();
    if (text.includes("<!DOCTYPE") || text.includes("<html")) return null;
    const data = JSON.parse(text);
    const source = data?.data && typeof data.data === "object" ? data.data : data;
    const status =
      source?.status ||
      source?.current_status ||
      source?.delivery_status ||
      source?.shipment_status ||
      source?.awb_status ||
      source?.tracking_status ||
      source?.last_status;
    return status ? String(status) : null;
  } catch {
    return null;
  }
};

// Rank of our internal order statuses, so a sync only ever moves an order
// FORWARD (never regress delivered -> shipped, and never auto-cancel).
export const ORDER_STATUS_RANK: Record<string, number> = {
  placed: 1,
  confirmed: 2,
  shipped: 3,
  delivered: 4,
};

/**
 * Map iCarry's free-text status onto our internal order status.
 * - "Delivered" -> delivered
 * - Out-for-delivery / in-transit / shipped / dispatched / picked up / ready to
 *   ship -> shipped
 * - Anything else (booked, pending, RTO, etc.) -> no status change; we only
 *   record the raw string in delivery_status.
 *
 * Note: we check for "delivered" (past tense) NOT "deliver", so "Out for
 * delivery" is correctly classified as shipped, not delivered.
 */
export const mapIcarryStatus = (
  raw: string
): { status?: string; delivery_status: string } => {
  const s = (raw || "").toLowerCase();
  const delivery_status = raw;

  if (s.includes("delivered")) return { status: "delivered", delivery_status };

  if (
    s.includes("out for delivery") ||
    s.includes("in-transit") ||
    s.includes("in transit") ||
    s.includes("transit") ||
    s.includes("shipped") ||
    s.includes("dispatch") ||
    s.includes("picked") ||
    s.includes("pickup") ||
    s.includes("ready to ship")
  ) {
    return { status: "shipped", delivery_status };
  }

  return { delivery_status };
};

// The five delivery milestones the WhatsApp automation sends a template for.
// (src/services/communications/config/templates.ts keys its per-status
// templates on exactly these strings.)
export type DeliveryNotifyStatus =
  | "Picked up"
  | "In Transit"
  | "Out for Delivery"
  | "Delivered"
  | "Delivery Failed";

/**
 * Collapse iCarry's free-text status into one of the five canonical
 * milestones the customer gets a WhatsApp update for — or null for
 * intermediate/unknown states (booked, pending, label-created…) that
 * shouldn't trigger a message.
 *
 * Ordering matters: failure states ("undelivered", "rto", "returned") are
 * checked before "delivered" so "undelivered" isn't misread as a delivery,
 * and "out for delivery" before the generic in-transit bucket.
 */
export const canonicalDeliveryStatus = (
  raw: string
): DeliveryNotifyStatus | null => {
  const s = (raw || "").toLowerCase().trim();
  if (!s) return null;

  if (
    // "undeliver" (not "undelivered") also catches "undeliverable".
    s.includes("undeliver") ||
    s.includes("not delivered") ||
    s.includes("failed") ||
    s.includes("rto") ||
    s.includes("return") ||
    s.includes("refused") ||
    s.includes("cancel")
  ) {
    return "Delivery Failed";
  }
  if (s.includes("delivered")) return "Delivered";
  if (s.includes("out for delivery")) return "Out for Delivery";
  // "pickup done", not bare "pickup" — "pickup scheduled" hasn't happened yet.
  if (s.includes("picked") || s.includes("pickup done")) return "Picked up";
  if (
    s.includes("transit") ||
    s.includes("shipped") ||
    s.includes("dispatch")
  ) {
    return "In Transit";
  }
  return null;
};
