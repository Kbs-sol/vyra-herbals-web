'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabaseClient';

export default function WelcomeCouponTestPage() {
    const [logs, setLogs] = useState<string[]>([]);
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    const addLog = (msg: string) => {
        console.log(msg);
        setLogs(prev => [...prev, `${new Date().toLocaleTimeString()} - ${msg}`]);
    };

    useEffect(() => {
        checkUser();
        const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
            setUser(session?.user || null);
        });
        return () => authListener.subscription.unsubscribe();
    }, []);

    const checkUser = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user || null);
        if (session?.user) {
            addLog(`Authenticated as: ${session.user.email}`);
        } else {
            addLog(`Not authenticated. Please create a test account.`);
        }
    };

    const createTestAccount = async () => {
        try {
            setLoading(true);
            const randomEmail = `test_user_${Date.now()}@example.com`;
            const password = 'TestPassword123!';
            addLog(`Creating test account: ${randomEmail}...`);

            const { data, error } = await supabase.auth.signUp({
                email: randomEmail,
                password: password,
            });

            if (error) throw error;

            addLog(`Successfully registered and logged in as ${randomEmail}`);
            setUser(data.user);
        } catch (e: any) {
            addLog(`Error creating account: ${e.message}`);
        } finally {
            setLoading(false);
        }
    };

    const testEligibilityAPI = async () => {
        try {
            setLoading(true);
            addLog(`Testing /api/coupon/welcome...`);
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                addLog('No active session.');
                return;
            }

            const res = await fetch('/api/coupon/welcome', {
                headers: { 'Authorization': `Bearer ${session.access_token}` }
            });
            const data = await res.json();

            addLog(`Eligibility Response: ${JSON.stringify(data, null, 2)}`);
        } catch (e: any) {
            addLog(`Eligibility Error: ${e.message}`);
        } finally {
            setLoading(false);
        }
    };

    const testCODCheckout = async () => {
        try {
            setLoading(true);
            addLog(`Starting End-to-End COD Feature Test...`);

            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                addLog('No active session. Create account first.');
                return;
            }

            // Step 1: Check Eligibility
            addLog('Step 1: Checking Welcome Coupon Eligibility...');
            const eligRes = await fetch('/api/coupon/welcome', {
                headers: { 'Authorization': `Bearer ${session.access_token}` }
            });
            const eligData = await eligRes.json();
            addLog(`Eligibility: ${eligData.eligible ? 'Yes' : 'No'} (${eligData.discount_percent || 0}%)`);

            // Mock Cart Data
            const mockItems = [{
                id: 'test-item-1',
                title: 'Test Ayurvedic Product',
                price: 1000,
                regular_price: 1200,
                quantity: 1,
                image_url: ''
            }];
            const itemsTotal = 1000;
            let appliedDiscount = 0;
            let couponApplied = false;

            // Step 2: Calculate Discount
            if (eligData.eligible && eligData.discount_percent > 0) {
                appliedDiscount = Math.round(itemsTotal * eligData.discount_percent / 100);
                couponApplied = true;
                addLog(`Step 2: Applied ${eligData.discount_percent}% discount. Amount: ₹${appliedDiscount}`);
            } else {
                addLog('Step 2: No discount applied (Not eligible or disabled).');
            }

            const orderData = {
                orderItems: mockItems,
                totalAmount: (itemsTotal - appliedDiscount) + 69, // 69 COD charges
                transactionPrice: itemsTotal - appliedDiscount,
                shippingMethod: "standard",
                shippingData: {
                    firstName: "Test",
                    lastName: "User",
                    email: session.user?.email,
                    phone: "9999999999",
                    address: "123 Test Street",
                    city: "Test City",
                    state: "Test State",
                    zip: "123456",
                    productTitle: "Test Ayurvedic Product"
                },
                paymentMethod: "cod",
                userId: session.user?.id,
                welcomeCouponApplied: couponApplied,
                welcomeCouponDiscount: appliedDiscount,
            };

            // Step 3: Call COD API
            addLog(`Step 3: Creating COD Order with payload...`);
            const codRes = await fetch('/api/payment/cod', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderData })
            });

            const codData = await codRes.json();

            if (codRes.ok) {
                addLog(`✅ Order successfully created! Order ID: ${codData.data?.[0]?.order_id || 'Unknown'}`);
                addLog(`Server recorded discount: ₹${codData.data?.[0]?.welcome_coupon_discount || 0}`);
                addLog(`Order total amount: ₹${codData.data?.[0]?.total_amount}`);
                if (couponApplied) {
                    addLog(`🎉 SUCCESS! The feature works perfectly end-to-end.`);
                } else {
                    addLog(`Order placed without coupon (as expected for non-eligible users).`);
                }
            } else {
                addLog(`❌ Order creation failed: ${codData.error || 'Unknown error'}`);
            }

        } catch (e: any) {
            addLog(`Checkout Test Error: ${e.message}`);
        } finally {
            setLoading(false);
        }
    };

    const testHackingAttempt = async () => {
        try {
            setLoading(true);
            addLog(`Starting Hack Attempt (Forcing true for an ineligible user)...`);
            const { data: { session } } = await supabase.auth.getSession();

            // We will forcefully send welcomeCouponApplied: true and discount 500
            const orderData = {
                orderItems: [{ price: 1000, quantity: 1 }],
                totalAmount: 569, // forcefully discounted
                transactionPrice: 500,
                shippingData: { firstName: "Hacker" },
                paymentMethod: "cod",
                userId: session?.user?.id,
                welcomeCouponApplied: true, // Forcing it
                welcomeCouponDiscount: 500, // Forcing it
            };

            addLog(`Sending fake payload to COD API...`);
            const codRes = await fetch('/api/payment/cod', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderData })
            });
            const codData = await codRes.json();

            if (codRes.ok) {
                const recordedDiscount = codData.data?.[0]?.welcome_coupon_discount || 0;
                addLog(`Order created. Server recorded discount: ₹${recordedDiscount}`);
                if (recordedDiscount === 0) {
                    addLog(`✅ SUCCESS! Server protected against the hack and recorded ₹0 discount.`);
                } else {
                    addLog(`❌ FAILED! Server allowed the hacked discount: ₹${recordedDiscount}.`);
                }
            }
        } catch (e: any) {
            addLog(`Hack Test Error: ${e.message}`);
        } finally {
            setLoading(false);
        }
    };

    const logout = async () => {
        await supabase.auth.signOut();
        addLog('Logged out.');
    };

    return (
        <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto', fontFamily: 'system-ui' }}>
            <h1>🎟️ Welcome Coupon Feature - Verification Test Page</h1>
            <p style={{ color: '#666', lineHeight: 1.5 }}>
                This page uses production APIs to simulate the complete checkout flow for a first-time user.
                It safely creates a temporary random account so you can verify the feature without modifying your existing account.
            </p>

            <div style={{
                background: '#f8f9fa',
                padding: '15px',
                borderRadius: '8px',
                border: '1px solid #e9ecef',
                marginBottom: '20px'
            }}>
                <strong>Current Status: </strong>
                {user ? (
                    <span style={{ color: '#059669' }}>Logged in as {user.email}</span>
                ) : (
                    <span style={{ color: '#dc2626' }}>Not logged in</span>
                )}
            </div>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '20px' }}>
                {!user ? (
                    <button
                        onClick={createTestAccount}
                        disabled={loading}
                        style={btnStyle('#2563eb')}
                    >
                        1. Create New Fresh Test Account
                    </button>
                ) : (
                    <>
                        <button
                            onClick={testEligibilityAPI}
                            disabled={loading}
                            style={btnStyle('#4b5563')}
                        >
                            Check API Eligibility
                        </button>
                        <button
                            onClick={testCODCheckout}
                            disabled={loading}
                            style={btnStyle('#059669')}
                        >
                            2. Run End-to-End Checkout Test (COD)
                        </button>
                        <button
                            onClick={testHackingAttempt}
                            disabled={loading}
                            style={btnStyle('#dc2626')}
                        >
                            Test Hack (Server Validation)
                        </button>
                        <button
                            onClick={logout}
                            disabled={loading}
                            style={btnStyle('#6b7280')}
                        >
                            Log Out
                        </button>
                    </>
                )}
            </div>

            <div style={{
                background: '#1e1e1e',
                color: '#00ff00',
                padding: '15px',
                borderRadius: '8px',
                fontFamily: 'monospace',
                minHeight: '300px',
                maxHeight: '500px',
                overflowY: 'auto'
            }}>
                <div style={{ borderBottom: '1px solid #333', paddingBottom: '10px', marginBottom: '10px', color: '#888' }}>
                    Test Console Output...
                </div>
                {logs.map((log, idx) => (
                    <div key={idx} style={{ marginBottom: '5px' }}>{log}</div>
                ))}
                {logs.length === 0 && <div style={{ color: '#555' }}>Waiting for actions...</div>}
            </div>
        </div>
    );
}

const btnStyle = (bg: string) => ({
    backgroundColor: bg,
    color: 'white',
    border: 'none',
    padding: '10px 16px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '14px',
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
});
