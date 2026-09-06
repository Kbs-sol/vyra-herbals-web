'use client';

import React, { useState } from 'react';
import styled from 'styled-components';
import { useCart } from '../Contexts/CartContext';

const CouponInput: React.FC = () => {
    const { appliedCoupon, applyCoupon, removeCoupon } = useCart();
    const [code, setCode] = useState('');
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

    const handleApply = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!code.trim() || busy) return;
        setBusy(true);
        setMessage(null);
        const result = await applyCoupon(code);
        if (result.ok) {
            setMessage({ ok: true, text: 'Coupon applied successfully!' });
            setCode('');
        } else {
            setMessage({ ok: false, text: result.reason || 'Invalid coupon' });
        }
        setBusy(false);
    };

    const handleRemove = () => {
        removeCoupon();
        setMessage(null);
    };

    return (
        <Wrap>
            <div className="title">Have a coupon?</div>
            {appliedCoupon ? (
                <div className="applied">
                    <div className="applied-info">
                        <span className="badge">✓ {appliedCoupon.code}</span>
                        <span className="saved">You saved ₹{appliedCoupon.discount}</span>
                        {appliedCoupon.description && (
                            <span className="desc">{appliedCoupon.description}</span>
                        )}
                    </div>
                    <button type="button" className="remove" onClick={handleRemove}>
                        Remove
                    </button>
                </div>
            ) : (
                <form onSubmit={handleApply} className="form">
                    <input
                        type="text"
                        placeholder="Enter coupon code"
                        value={code}
                        onChange={(e) => setCode(e.target.value.toUpperCase())}
                        maxLength={50}
                        disabled={busy}
                    />
                    <button type="submit" disabled={busy || !code.trim()}>
                        {busy ? 'Checking…' : 'Apply'}
                    </button>
                </form>
            )}
            {message && (
                <div className={`message ${message.ok ? 'ok' : 'err'}`}>{message.text}</div>
            )}
        </Wrap>
    );
};

export default CouponInput;

const Wrap = styled.div`
    margin: 12px 0;
    padding: 14px 16px;
    background: #fffaf0;
    border: 1px dashed #d6a96b;
    border-radius: 8px;

    .title {
        font-size: 13px;
        font-weight: 600;
        color: #6b4513;
        margin-bottom: 8px;
        text-transform: uppercase;
        letter-spacing: 0.4px;
    }

    .form {
        display: flex;
        gap: 8px;
    }

    .form input {
        flex: 1;
        padding: 8px 12px;
        border: 1px solid #e5d3b2;
        border-radius: 6px;
        font-size: 14px;
        outline: none;
        background: #fff;
        text-transform: uppercase;
    }

    .form input:focus {
        border-color: #704a0d;
    }

    .form button {
        padding: 8px 18px;
        background: #704a0d;
        color: #fff;
        border: none;
        border-radius: 6px;
        font-weight: 600;
        font-size: 14px;
        cursor: pointer;
        transition: opacity 0.2s;
    }

    .form button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .applied {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        flex-wrap: wrap;
    }

    .applied-info {
        display: flex;
        flex-direction: column;
        gap: 2px;
    }

    .badge {
        display: inline-block;
        font-weight: 700;
        color: #146c2e;
        font-family: ui-monospace, monospace;
        font-size: 14px;
    }

    .saved {
        font-size: 13px;
        color: #146c2e;
    }

    .desc {
        font-size: 12px;
        color: #6b7280;
    }

    .remove {
        padding: 6px 12px;
        background: transparent;
        color: #b91c1c;
        border: 1px solid #fecaca;
        border-radius: 6px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
    }

    .remove:hover {
        background: #fef2f2;
    }

    .message {
        margin-top: 8px;
        font-size: 12px;
    }

    .message.ok {
        color: #146c2e;
    }

    .message.err {
        color: #b91c1c;
    }
`;
