'use client';

import React, { useState } from "react";
import { API_PATH } from "../constants";
import styled from "styled-components";
import LoadingIndicator from "../Components/Common/LoadingIndicator";

interface TrackingInfo {
  success: number;
  status?: string;
  edd?: string;
  location?: string;
  details?: Array<{
    location: string;
    status: string;
    time: string;
  }>;
}

const TrackOrder = () => {
  const [inputValue, setInputValue] = useState("");
  const [trackingInfo, setTrackingInfo] = useState<TrackingInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchOrderDetails = async (e) => {
    e.preventDefault();
    if (!inputValue) {
      setError("Please enter a valid Order ID.");
      return;
    }

    // Validation to check if input contains only digits
    if (!/^\d+$/.test(inputValue)) {
      setError("Order ID must contain only digits.");
      return;
    }

    setLoading(true);
    setError("");

    let payload = {
      shipment_id: inputValue,
    };

    try {
      const response = await fetch(`${API_PATH}/shipping/track`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json(); // Parse the JSON response

      if (data.success === 1 && data.status) {
        // Valid shipping ID, update the tracking info
        setTrackingInfo({ ...data });
        setError("");
      } else {
        // Invalid shipping ID or no data found
        setTrackingInfo(null);
        setError("Invalid Order ID. Please check and try again.");
      }
    } catch (error) {
      console.error("Error fetching order details:", error);
      setError(
        "There was an error fetching the shipment details. Please try again later."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const value = e.target.value;

    // Allow only digits (0-9)
    if (/^\d*$/.test(value)) {
      setInputValue(value);
      setError("");
    } else {
      setError("Order ID must contain only digits.");
    }
  };

  const getLastLocation = () => {
    let recentInfo = trackingInfo?.details?.[0];
    if (recentInfo && recentInfo.location) return recentInfo.location;
    return "Will update soon";
  };

  return (
    <StyledTrackOrder>
      <div className="order-tracking my-5">
        <h2>Track Your Order</h2>
        <form
          onSubmit={(e) => {
            fetchOrderDetails(e);
          }}
        >
          <div className="text-start">
            <label htmlFor={"trackingInput"}>Please enter your Order ID</label>
          </div>

          <div className="form-group mt-3">
            <input
              type="text"
              id="trackingInput"
              name="trackingInput"
              placeholder="Enter your Order ID"
              value={inputValue}
              onChange={handleInputChange}
              required
            />
          </div>

          <button type="submit">Track Order</button>
        </form>
        {error && <p style={{ color: "red" }}>{error}</p>}

        {loading && <LoadingIndicator variant={"spinner"} />}

        {trackingInfo && (
          <div className="tracking-info">
            <h3>Order Status: {trackingInfo.status}</h3>
            {trackingInfo.status?.toLowerCase() !== "delivered" && (
              <p>
                Expected Delivery:{" "}
                {trackingInfo.edd ? trackingInfo.edd : "Will update soon"}
              </p>
            )}
            <p>
              Current Location:{" "}
              {trackingInfo.location
                ? trackingInfo.location
                : getLastLocation()}
            </p>
          </div>
        )}
      </div>
    </StyledTrackOrder>
  );
};

export default TrackOrder;

const StyledTrackOrder = styled.section`
  .order-tracking {
    max-width: 600px;
    margin: 0 auto;
    padding: 20px;
    background-color: #f9f9f9;
    border-radius: 10px;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    h2 {
      text-align: center;
      color: #333;
      font-size: 1.2rem;
    }
  }

  .form-group {
    margin-bottom: 15px;
    label {
      display: block;
      font-weight: bold;
      margin-bottom: 5px;
      color: #555;
    }
    input {
      width: 100%;
      padding: 10px;
      font-size: 16px;
      border: 1px solid #ccc;
      border-radius: 5px;
      box-sizing: border-box;
    }
  }

  button {
    background-color: var(--primary);
    color: #fff;
    padding: 10px 20px;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    font-size: 16px;
    display: block;
    width: 100%;
    &:hover {
      background-color: var(--btn-green);
    }
  }

  .tracking-info {
    margin-top: 20px;
    padding: 10px;
    background-color: #e0f7fa;
    border-radius: 5px;
    text-align: center;
    h3 {
      margin-bottom: 10px;
      color: #00796b;
    }
    p {
      margin: 5px 0;
      color: #004d40;
    }
  }
`;
