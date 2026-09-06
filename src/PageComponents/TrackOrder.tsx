'use client';

import React, { useState } from "react";
import { API_PATH } from "../constants";
import styled from "styled-components";
import LoadingIndicator from "../Components/Common/LoadingIndicator";

interface TrackingEvent {
  location: string;
  status: string;
  time: string;
}

interface TrackingInfo {
  success: number;
  status?: string;
  edd?: string;
  location?: string;
  awb_code?: string;
  courier_name?: string;
  details?: TrackingEvent[];
}

const MILESTONES = [
  { label: 'Order Placed', match: ['unassigned', 'placed', 'confirmed', 'processing', 'order placed', 'label created'] },
  { label: 'Ready to Ship', match: ['ready to ship', 'ready_to_ship', 'manifested', 'pickup scheduled', 'scheduled for pickup'] },
  { label: 'Picked Up', match: ['picked up', 'pickup done', 'in-transit', 'in transit', 'shipped', 'intransit'] },
  { label: 'Out for Delivery', match: ['out for delivery', 'out_for_delivery'] },
  { label: 'Delivered', match: ['delivered'] },
];

function getMilestoneIndex(status: string): number {
  const s = status.toLowerCase();
  for (let i = MILESTONES.length - 1; i >= 0; i--) {
    if (MILESTONES[i].match.some(m => s.includes(m))) return i;
  }
  return 0;
}

const TrackOrder = () => {
  const [inputValue, setInputValue] = useState("");
  const [trackingInfo, setTrackingInfo] = useState<TrackingInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchOrderDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue) { setError("Please enter your Order ID or AWB / Tracking Number."); return; }
    if (!/^[A-Z0-9-]+$/.test(inputValue)) { setError("Please enter a valid Order ID or Tracking Number."); return; }

    setLoading(true);
    setError("");
    setTrackingInfo(null);

    try {
      const response = await fetch(`${API_PATH}/shipping/track`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shipment_id: inputValue }),
      });
      const data = await response.json();

      if (data.success === 1 && data.status) {
        setTrackingInfo(data);
      } else {
        setError(data.message || "Invalid Order ID. Please check and try again.");
      }
    } catch {
      setError("There was an error fetching the shipment details. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.trim();
    if (/^[a-zA-Z0-9-]*$/.test(value)) { setInputValue(value.toUpperCase()); setError(""); }
    else setError("Please enter a valid Order ID or Tracking Number.");
  };

  const milestoneIndex = trackingInfo?.status ? getMilestoneIndex(trackingInfo.status) : -1;
  const isRTO = trackingInfo?.status?.toLowerCase().includes('rto') ||
                trackingInfo?.status?.toLowerCase().includes('return');

  return (
    <StyledTrackOrder>
      <div className="order-tracking my-5">
        <h2>Track Your Order</h2>
        <form onSubmit={fetchOrderDetails}>
          <div className="text-start">
            <label htmlFor="trackingInput">Please enter your Order ID or AWB / Tracking Number</label>
          </div>
          <div className="form-group mt-3">
            <input
              type="text"
              id="trackingInput"
              name="trackingInput"
              placeholder="e.g. ORD-1770000000000 (Order ID) or AWB number"
              value={inputValue}
              onChange={handleInputChange}
              required
            />
          </div>
          <button type="submit">Track Order</button>
        </form>

        {error && <p className="error-msg">{error}</p>}
        {loading && <LoadingIndicator variant="spinner" />}

        {trackingInfo && (
          <div className="tracking-result">
            {/* Status header */}
            <div className={`status-badge ${isRTO ? 'rto' : milestoneIndex === MILESTONES.length - 1 ? 'delivered' : 'in-progress'}`}>
              <span className="status-label">{trackingInfo.status}</span>
            </div>

            {/* Meta info */}
            <div className="meta-row">
              {trackingInfo.awb_code && (
                <span className="meta-item"><span className="meta-key">AWB</span> {trackingInfo.awb_code}</span>
              )}
              {trackingInfo.courier_name && (
                <span className="meta-item"><span className="meta-key">Courier</span> {trackingInfo.courier_name}</span>
              )}
              {trackingInfo.location && (
                <span className="meta-item"><span className="meta-key">Location</span> {trackingInfo.location}</span>
              )}
              {trackingInfo.edd && milestoneIndex < MILESTONES.length - 1 && (
                <span className="meta-item"><span className="meta-key">Expected Delivery</span> {trackingInfo.edd}</span>
              )}
            </div>

            {/* Milestone tracker */}
            {!isRTO && (
              <div className="milestones">
                {MILESTONES.map((m, i) => (
                  <div key={m.label} className={`milestone ${i <= milestoneIndex ? 'done' : ''} ${i === milestoneIndex ? 'current' : ''}`}>
                    <div className="milestone-dot">
                      {i < milestoneIndex && <span className="check">✓</span>}
                      {i === milestoneIndex && <span className="dot-inner" />}
                    </div>
                    {i < MILESTONES.length - 1 && <div className={`milestone-line ${i < milestoneIndex ? 'done' : ''}`} />}
                    <span className="milestone-label">{m.label}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Event timeline */}
            {trackingInfo.details && trackingInfo.details.length > 0 && (
              <div className="events">
                <h4>Tracking History</h4>
                <div className="events-list">
                  {trackingInfo.details.map((event, i) => (
                    <div key={i} className="event-item">
                      <div className="event-dot" />
                      <div className="event-content">
                        <span className="event-status">{event.status}</span>
                        <span className="event-location">{event.location}</span>
                        {event.time && <span className="event-time">{event.time}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </StyledTrackOrder>
  );
};

export default TrackOrder;

const StyledTrackOrder = styled.section`
  .order-tracking {
    max-width: 640px;
    margin: 0 auto;
    padding: 24px;
    background: #f9f9f9;
    border-radius: 12px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.08);

    h2 {
      text-align: center;
      color: #333;
      font-size: 1.2rem;
      margin-bottom: 20px;
    }
  }

  .form-group {
    margin-bottom: 12px;
    input {
      width: 100%;
      padding: 10px 14px;
      font-size: 15px;
      border: 1px solid #ccc;
      border-radius: 6px;
      box-sizing: border-box;
      &:focus { outline: none; border-color: var(--primary); }
    }
  }

  label {
    font-size: 0.9rem;
    color: #555;
    font-weight: 500;
  }

  button[type="submit"] {
    background: var(--primary);
    color: #fff;
    padding: 11px 20px;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 15px;
    width: 100%;
    margin-top: 4px;
    &:hover { background: var(--btn-green); }
  }

  .error-msg {
    color: #e53935;
    margin-top: 10px;
    font-size: 0.9rem;
    text-align: center;
  }

  /* ── Result card ── */
  .tracking-result {
    margin-top: 24px;
  }

  .status-badge {
    text-align: center;
    padding: 10px 16px;
    border-radius: 8px;
    margin-bottom: 16px;
    font-weight: 600;
    font-size: 1rem;
    &.delivered { background: #e8f5e9; color: #2e7d32; }
    &.in-progress { background: #e3f2fd; color: #1565c0; }
    &.rto { background: #fff3e0; color: #e65100; }
  }

  /* ── Meta row ── */
  .meta-row {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-bottom: 20px;
    font-size: 0.85rem;
    .meta-item {
      background: #fff;
      border: 1px solid #e0e0e0;
      border-radius: 6px;
      padding: 6px 12px;
      color: #333;
    }
    .meta-key {
      font-weight: 600;
      color: #666;
      margin-right: 4px;
    }
  }

  /* ── Milestone tracker ── */
  .milestones {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    margin: 0 0 24px;
    position: relative;
    padding: 8px 0;
  }

  .milestone {
    display: flex;
    flex-direction: column;
    align-items: center;
    flex: 1;
    position: relative;

    &-dot {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: #e0e0e0;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1;
      font-size: 13px;
      font-weight: 700;
      color: #fff;
      flex-shrink: 0;
    }

    &.done .milestone-dot {
      background: #2e7d32;
    }
    &.current .milestone-dot {
      background: #1976d2;
      box-shadow: 0 0 0 3px rgba(25,118,210,0.25);
    }

    .dot-inner {
      width: 10px;
      height: 10px;
      background: #fff;
      border-radius: 50%;
      display: block;
    }

    .check { color: #fff; font-size: 13px; }

    &-line {
      position: absolute;
      top: 14px;
      left: calc(50% + 14px);
      width: calc(100% - 28px);
      height: 3px;
      background: #e0e0e0;
      z-index: 0;
      &.done { background: #2e7d32; }
    }

    &-label {
      margin-top: 8px;
      font-size: 0.7rem;
      text-align: center;
      color: #555;
      max-width: 70px;
      line-height: 1.3;
    }

    &.done .milestone-label,
    &.current .milestone-label {
      color: #222;
      font-weight: 600;
    }
  }

  /* ── Events timeline ── */
  .events {
    margin-top: 4px;
    h4 {
      font-size: 0.95rem;
      color: #444;
      margin-bottom: 12px;
      font-weight: 600;
    }
  }

  .events-list {
    display: flex;
    flex-direction: column;
    gap: 0;
    border-left: 2px solid #e0e0e0;
    padding-left: 16px;
    margin-left: 8px;
  }

  .event-item {
    position: relative;
    padding: 0 0 16px 0;

    .event-dot {
      position: absolute;
      left: -21px;
      top: 4px;
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: var(--primary);
      border: 2px solid #fff;
      box-shadow: 0 0 0 2px var(--primary);
    }

    .event-content {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .event-status {
      font-weight: 600;
      font-size: 0.88rem;
      color: #222;
    }

    .event-location {
      font-size: 0.82rem;
      color: #555;
    }

    .event-time {
      font-size: 0.78rem;
      color: #888;
    }

    &:last-child { padding-bottom: 0; }
  }

  @media (max-width: 480px) {
    .milestone-label { font-size: 0.62rem; max-width: 54px; }
    .milestone-dot { width: 22px; height: 22px; }
    .milestone-line { top: 11px; left: calc(50% + 11px); width: calc(100% - 22px); }
  }
`;
