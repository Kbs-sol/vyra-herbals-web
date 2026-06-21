'use client';

import React, { useEffect } from 'react';
import styled from 'styled-components';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { MdErrorOutline } from 'react-icons/md';

const PaymentFailedContent = () => {
    const searchParams = useSearchParams();
    const orderId = searchParams?.get('order_id') || '';
    const reason = searchParams?.get('reason') || 'Transaction was cancelled or failed.';

    // The payment failed, so the pending-txn marker is dead. Clear it here so the
    // global PendingTxnReconciler doesn't keep re-checking it on every page load
    // (and can never bounce the user to a "success" page for this txn).
    useEffect(() => {
        try { localStorage.removeItem('vyra_pending_txn'); } catch { /* ignore */ }
    }, []);

    return (
        <Container className="container">
            <Card>
                <IconWrapper>
                    <MdErrorOutline size={80} color="#dc3545" />
                </IconWrapper>
                <Title>Payment Failed</Title>
                <Message>
                    We couldn't process your payment. Don't worry, no money was deducted from your account. If it was, it will be refunded within 3-5 business days.
                </Message>

                {orderId && (
                    <OrderInfo>
                        <Label>Reference ID:</Label>
                        <Value>{orderId}</Value>
                    </OrderInfo>
                )}

                <ReasonBox>
                    <span className="fw-bold">Reason:</span> {reason}
                </ReasonBox>

                <Actions>
                    <Link href="/cart" className="btn btn-warning btn-lg action-btn">
                        Try Again
                    </Link>
                    <Link href="/" className="btn btn-outline-secondary btn-lg action-btn">
                        Return to Home
                    </Link>
                </Actions>
            </Card>
        </Container>
    );
};

const PaymentFailed = () => {
    return (
        <React.Suspense fallback={<div className="container py-5 text-center">Loading...</div>}>
            <PaymentFailedContent />
        </React.Suspense>
    );
};

export default PaymentFailed;

const Container = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 70vh;
  padding: 2rem 1rem;
`;

const Card = styled.div`
  background: white;
  border-radius: 16px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
  padding: 3rem 2rem;
  max-width: 500px;
  width: 100%;
  text-align: center;
`;

const IconWrapper = styled.div`
  margin-bottom: 1.5rem;
  animation: shake 0.5s ease-in-out;

  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-5px); }
    50% { transform: translateX(5px); }
    75% { transform: translateX(-5px); }
  }
`;

const Title = styled.h2`
  color: #dc3545;
  font-weight: 700;
  margin-bottom: 1rem;
  font-size: 2rem;
`;

const Message = styled.p`
  color: #6c757d;
  font-size: 1.1rem;
  line-height: 1.5;
  margin-bottom: 1.5rem;
`;

const OrderInfo = styled.div`
  background: #f8f9fa;
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1rem;
  display: flex;
  justify-content: center;
  gap: 0.5rem;
`;

const Label = styled.span`
  color: #495057;
  font-weight: 500;
`;

const Value = styled.span`
  color: #212529;
  font-weight: 700;
  font-family: monospace;
  font-size: 1.1rem;
`;

const ReasonBox = styled.div`
  color: #856404;
  background-color: #fff3cd;
  border: 1px solid #ffeeba;
  padding: 0.75rem;
  border-radius: 8px;
  font-size: 0.95rem;
  margin-bottom: 2rem;
  text-align: left;
`;

const Actions = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  
  .action-btn {
    border-radius: 8px;
    font-weight: 600;
    padding: 0.75rem 1.5rem;
    transition: all 0.2s;
    
    &:hover {
      transform: translateY(-2px);
    }
  }

  @media (min-width: 480px) {
    flex-direction: row;
    justify-content: center;
    
    .action-btn {
      flex: 1;
    }
  }
`;
