'use client';

import React, { useMemo } from "react";
import { COD_Charges } from "../../constants";
import styled from "styled-components";

const BillSummary = ({ items, isCOD = false }) => {
  const totalMRP = useMemo(() => {
    return items.reduce(
      (total, item) => total + item.quantity * item.regular_price,
      0
    );
  }, [items]);

  const totalPrice = useMemo(() => {
    let price = items.reduce(
      (total, item) => total + item.quantity * item.price,
      0
    );
    return price;
  }, [items]);
  return (
    <StyledBillSummary>
      <div className="fw-bold bill-heading">Bill Summary:</div>
      <div className={"mb-3"}>
        <p className="text-lg font-semibold mb-0 d-flex justify-content-between px-3">
          <span>Total MRP</span>
          <span className="text-lg ms-1">₹{totalMRP}</span>
        </p>
        <p className="text-lg font-semibold mb-0 d-flex justify-content-between px-3">
          <span>Discount on MRP</span>
          <span className="text-lg fw-bold ms-1 text-success">
            - ₹{totalMRP - totalPrice}
          </span>
        </p>
        <p className="text-lg font-semibold mb-0 d-flex justify-content-between px-3">
          <span>Delivery Fee</span>
          <span className="ms-1">
            <s>₹99</s>
            <span className="text-success fw-bold ps-2">FREE</span>
          </span>
        </p>
        {isCOD && (
          <p className="text-lg font-semibold mb-0 d-flex justify-content-between px-3">
            <span>COD Charges</span>
            <span className="ms-1">₹{COD_Charges}</span>
          </p>
        )}
        <p className="text-lg fw-bold mt-1 pt-1 d-flex justify-content-between px-3 border-top">
          <span>Total Amount</span>
          <span className="ms-1 ">
            ₹{isCOD ? COD_Charges + totalPrice : totalPrice}
          </span>
        </p>
      </div>
    </StyledBillSummary>
  );
};

export default BillSummary;

const StyledBillSummary = styled.div``;
