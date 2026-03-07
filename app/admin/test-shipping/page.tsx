"use client";

import React, { useState } from 'react';
import styled from 'styled-components';
import AdminLayoutWrapper from '../components/AdminLayoutWrapper';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const PageContainer = styled.div`
  padding: 30px;
  background-color: #f8f9fa;
  min-height: calc(100vh - 70px);
`;

const Header = styled.div`
  margin-bottom: 30px;
  h2 {
    color: #333;
    font-size: 24px;
    font-weight: 600;
  }
`;

const ContentCard = styled.div`
  background: white;
  border-radius: 12px;
  padding: 30px;
  box-shadow: 0 4px 6px rgba(0,0,0,0.05);

  p {
    color: #555;
    margin-bottom: 20px;
  }
`;

const TestButton = styled.button`
  background-color: var(--primary);
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 200px;
  
  &:hover {
    background-color: var(--primaryHover, #2d6a4f);
    transform: translateY(-2px);
  }
  
  &:disabled {
    background-color: #ccc;
    cursor: not-allowed;
    transform: none;
  }
`;

const ResultBox = styled.pre`
  background: #1e1e1e;
  color: #d4d4d4;
  padding: 20px;
  border-radius: 8px;
  margin-top: 30px;
  overflow-x: auto;
  font-family: monospace;
  min-height: 100px;
`;

export default function ShippingTestPage() {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);

    const runTest = async () => {
        setLoading(true);
        setResult(null);
        try {
            const res = await fetch('/api/admin/test-shipping', {
                method: 'POST',
            });
            const data = await res.json();

            if (data.success) {
                toast.success('Test shipment created successfully in iCarry!');
            } else if (res.status === 403) {
                toast.error('iCarry API Blocked (Imunify360 / IP Whitelisting)');
            } else {
                toast.error(data.error || 'Failed to create shipment');
            }

            setResult(data);
        } catch (error) {
            console.error(error);
            toast.error('Test execution failed');
            setResult({ error: (error as Error).message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <AdminLayoutWrapper pageTitle="iCarry Integration Testing">
            <PageContainer>
                <Header>
                    <h2>iCarry Integration Testing</h2>
                </Header>
                <ContentCard>
                    <p>
                        Use this page to fire a dummy order to the iCarry shipping API without having to create real orders via Easebuzz checkout.
                        This allows you to quickly verify if the API credentials, User-Agent headers, and IP whitelisting rules are functioning properly.
                    </p>

                    <TestButton onClick={runTest} disabled={loading}>
                        {loading ? 'Testing iCarry Connection...' : 'Run Dummy Shipment Test'}
                    </TestButton>

                    {result && (
                        <div>
                            <h4 style={{ marginTop: '30px', marginBottom: '10px' }}>Test Result Output:</h4>
                            {result.message?.includes('Imunify360') && (
                                <div style={{ background: '#fef2f2', border: '1px solid #ef4444', padding: '15px', borderRadius: '8px', color: '#b91c1c', marginBottom: '15px' }}>
                                    <strong>ACTION REQUIRED:</strong> The iCarry API blocked the request using its Imunify360 security firewall. It explicitly states: <i>"{result.rawResponse}"</i>.
                                    <br /><br />
                                    <strong>To fix this forever:</strong> You must contact iCarry support and ask them to <u>whitelist your server's IP address</u> or to turn off the generic Imunify360 API IP-block for your merchant account.
                                </div>
                            )}
                            <ResultBox>
                                {JSON.stringify(result, null, 2)}
                            </ResultBox>
                        </div>
                    )}
                </ContentCard>
                <ToastContainer position="top-right" />
            </PageContainer>
        </AdminLayoutWrapper>
    );
}
