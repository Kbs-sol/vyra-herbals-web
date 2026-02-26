"use client";

import React, { useState } from 'react';
import { testDeliveryAction } from './actions';

export default function TestDeliveryPage() {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);

    const handleTestDelivery = async () => {
        setLoading(true);
        setResult(null);
        try {
            const res = await testDeliveryAction();
            setResult(res);
        } catch (err: any) {
            setResult({ success: false, message: err.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto', fontFamily: 'sans-serif' }}>
            <h1 style={{ fontSize: '24px', marginBottom: '16px' }}>iCarry Delivery Integration Test</h1>
            <p style={{ marginBottom: '24px', color: '#555' }}>
                Use this page to test the iCarry delivery API integration without placing real orders or making payments.
            </p>

            <button
                onClick={handleTestDelivery}
                disabled={loading}
                style={{
                    padding: '12px 24px',
                    backgroundColor: loading ? '#ccc' : '#0070f3',
                    color: loading ? '#666' : 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    transition: 'background-color 0.2s',
                    marginBottom: '1rem'
                }}
            >
                {loading ? 'Processing...' : 'Test Delivery Allocation'}
            </button>

            {result && (
                <div style={{ marginTop: '2rem', padding: '1.5rem', border: '1px solid #eaeaea', borderRadius: '8px', background: '#fafafa' }}>
                    <h3 style={{ marginTop: 0, marginBottom: '16px' }}>Result:</h3>
                    {result.success ? (
                        <div style={{ color: 'green', marginBottom: '10px', fontWeight: 'bold' }}>✅ Shipment Creation Successful</div>
                    ) : (
                        <div style={{ color: 'red', marginBottom: '10px', fontWeight: 'bold' }}>❌ Shipment Creation Failed</div>
                    )}
                    <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', background: '#eee', padding: '15px', borderRadius: '5px', fontSize: '14px' }}>
                        {JSON.stringify(result, null, 2)}
                    </pre>
                </div>
            )}
        </div>
    );
}
