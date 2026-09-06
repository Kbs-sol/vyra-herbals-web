'use client';

import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { trackEvent } from "@/utils/analytics";

const Transaction = () => {
  const params = useParams();
  const transactionStatus = params?.transactionStatus || 'unknown';
  
  React.useEffect(() => {
    if (transactionStatus === 'success' || transactionStatus === 'successful') {
      // Note: In a real app, we'd get order details from a context or API
      // For now, we track the success event.
      trackEvent('Purchase', {
        transaction_id: 'unknown', // Ideally passed via params or state
        status: transactionStatus,
        currency: 'INR'
      });
    }
  }, [transactionStatus]);

  return (
    <div className="text-center m-5">
      {" "}
      Your trasaction status is <b>{transactionStatus}</b>.. go to{" "}
      <Link href="/">Home</Link>{" "}
    </div>
  );
};

export default Transaction;
