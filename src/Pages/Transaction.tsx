'use client';

import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

const Transaction = () => {
  const { transactionStatus } = useParams();
  return (
    <div className="text-center m-5">
      {" "}
      Your trasaction status is <b>{transactionStatus}</b>.. go to{" "}
      <Link href="/">Home</Link>{" "}
    </div>
  );
};

export default Transaction;
