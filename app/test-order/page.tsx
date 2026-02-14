"use client";

import React, { useState } from 'react';
import { useAuth } from '@/Contexts/AuthContext';

export default function TestOrderPage() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);

    const addLog = (msg: string) => setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${msg}`]);

    const handleSimulatePayment = async () => {
        setLoading(true);
        setLogs([]);
        addLog("Starting payment simulation...");

        try {
            if (!user) {
                addLog("Warning: No user logged in. Order might be created without user_id.");
            }

            // 1. Generate Fake Transaction ID
            const txnId = `TEST_${Date.now()}_${Math.random().toString(36).substring(7)}`;
            addLog(`Generated txnId: ${txnId}`);

            // 2. Mock Order Data
            const orderData = {
                orderItems: [
                    {
                        id: 999,
                        quantity: 1,
                        price: 500,
                        title: "Test Product (Simulation)",
                        handle: "test-product",
                        image_url: "/placeholder.jpg"
                    }
                ],
                totalAmount: 500,
                transactionPrice: 500,
                shippingMethod: "standard",
                shippingData: {
                    fullName: "Test User",
                    phone: "9999999999",
                    email: user?.email || "test@example.com",
                    houseNumber: "123",
                    area: "Test Area",
                    landmark: "Test Landmark",
                    pincode: "110001",
                    city: "New Delhi",
                    state: "Delhi",
                    country: "India",
                    productTitle: "1 x Test Product (Simulation)"
                },
                paymentMethod: "online",
                userId: user?.id || null, // Allow null if not logged in, though DB might warn
            };

            addLog("Sending session data to /api/payment/session...");

            // 3. Save Session
            const sessionRes = await fetch('/api/payment/session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ txnId, orderData })
            });

            if (!sessionRes.ok) {
                throw new Error(`Session API failed: ${sessionRes.statusText}`);
            }

            const sessionResult = await sessionRes.json();
            addLog("Session saved successfully.");

            // 4. Submit Form to /api/payment/success
            addLog("Submitting form to /api/payment/success...");

            const form = document.createElement('form');
            form.method = 'POST';
            form.action = '/api/payment/success';

            const fields = {
                status: 'success',
                txnid: txnId,
                amount: '500.00',
                firstname: 'Test User',
                email: user?.email || 'test@example.com',
                phone: '9999999999',
                productinfo: 'Test Product',
                // hash is technically required by the route if strict, but let's see if it works without it 
                // or if we need to mock it. The current route code comments out hash verification:
                // // const hash = formData.get('hash'); // Verify hash in production!
            };

            Object.entries(fields).forEach(([key, value]) => {
                const input = document.createElement('input');
                input.type = 'hidden';
                input.name = key;
                input.value = value as string;
                form.appendChild(input);
            });

            document.body.appendChild(form);
            form.submit();
            addLog("Form submitted. Redirecting...");

        } catch (err: any) {
            console.error(err);
            addLog(`Error: ${err.message}`);
            setLoading(false);
        }
    };

    return (
        <div style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
            <h1>Payment Simulation</h1>
            <p>Use this page to test the order creation and redirection flow without real money.</p>

            <div style={{ marginBottom: '1rem', padding: '1rem', border: '1px solid #ccc', borderRadius: '4px' }}>
                <strong>User Status:</strong> {user ? `Logged in as ${user.email}` : <span style={{ color: 'red' }}>Not Logged In (Please login for best results)</span>}
            </div>

            <button
                onClick={handleSimulatePayment}
                disabled={loading}
                style={{
                    padding: '10px 20px',
                    backgroundColor: '#0070f3',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontSize: '16px'
                }}
            >
                {loading ? 'Processing...' : 'Simulate Successful Payment'}
            </button>

            <div style={{ marginTop: '2rem', background: '#f5f5f5', padding: '1rem', borderRadius: '4px', minHeight: '100px' }}>
                <h3>Logs:</h3>
                {logs.length === 0 && <span style={{ color: '#888' }}>Waiting for action...</span>}
                {logs.map((log, i) => (
                    <div key={i} style={{ fontFamily: 'monospace', margin: '4px 0' }}>{log}</div>
                ))}
            </div>
        </div>
    );
}
