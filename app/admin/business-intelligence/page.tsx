'use client';

import React, { useEffect, useState } from 'react';
import AdminLayoutWrapper from '../components/AdminLayoutWrapper';
import { useRouter } from 'next/navigation';
import { Card, Row, Col, Button, Spinner, Badge } from 'react-bootstrap';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function BusinessIntelligencePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/analytics');
      const json = await res.json();
      if (json.success) {
        setData(json);
      } else {
        console.error('Failed to fetch analytics:', json.error);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleBroadcast = (segment: string) => {
    router.push(`/admin/whatsapp?segment=${segment}`);
  };

  if (loading) {
    return (
      <AdminLayoutWrapper>
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
          <Spinner animation="border" variant="primary" />
        </div>
      </AdminLayoutWrapper>
    );
  }

  if (!data) {
    return (
      <AdminLayoutWrapper>
        <div className="alert alert-danger">Failed to load analytics data.</div>
      </AdminLayoutWrapper>
    );
  }

  return (
    <AdminLayoutWrapper>
      <div className="container-fluid py-4">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h2 className="m-0 fw-bold">Business Intelligence</h2>
          <Badge bg="primary" className="p-2">Last 30 Days</Badge>
        </div>

        {/* --- KPI SECTION --- */}
        <Row className="mb-4 g-3">
          <Col md={3}>
            <Card className="shadow-sm border-0 h-100">
              <Card.Body>
                <div className="text-muted small fw-bold mb-2">GROSS REVENUE</div>
                <h3 className="m-0 text-primary fw-bold">₹{data.revenue.total.toLocaleString()}</h3>
                <div className="text-success small mt-2">
                  <i className="bi bi-arrow-up-short"></i> Active
                </div>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="shadow-sm border-0 h-100">
              <Card.Body>
                <div className="text-muted small fw-bold mb-2">AVERAGE ORDER VALUE</div>
                <h3 className="m-0 text-dark fw-bold">₹{data.revenue.aov}</h3>
                <div className="text-muted small mt-2">Per transaction</div>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="shadow-sm border-0 h-100">
              <Card.Body>
                <div className="text-muted small fw-bold mb-2">PLATFORM SPLIT</div>
                <div className="d-flex justify-content-between align-items-end mt-2">
                  <div>
                    <h5 className="m-0 fw-bold">{data.splits.web}</h5>
                    <small className="text-muted">Web</small>
                  </div>
                  <div>
                    <h5 className="m-0 fw-bold text-success">{data.splits.whatsapp}</h5>
                    <small className="text-success">WhatsApp</small>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="shadow-sm border-0 h-100">
              <Card.Body>
                <div className="text-muted small fw-bold mb-2">PAYMENT SPLIT</div>
                <div className="d-flex justify-content-between align-items-end mt-2">
                  <div>
                    <h5 className="m-0 fw-bold">{data.splits.online}</h5>
                    <small className="text-muted">Prepaid</small>
                  </div>
                  <div>
                    <h5 className="m-0 fw-bold text-warning">{data.splits.cod}</h5>
                    <small className="text-warning">COD</small>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* --- CHARTS SECTION --- */}
        <Row className="mb-4">
          <Col md={12}>
            <Card className="shadow-sm border-0">
              <Card.Body>
                <h5 className="fw-bold mb-4">Revenue Trend (30 Days)</h5>
                <div style={{ width: '100%', height: 300 }}>
                  <ResponsiveContainer>
                    <LineChart data={data.revenue.trend}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                      <XAxis 
                        dataKey="date" 
                        tick={{ fill: '#888', fontSize: 12 }} 
                        tickFormatter={(val) => {
                          const date = new Date(val);
                          return `${date.getDate()}/${date.getMonth() + 1}`;
                        }}
                      />
                      <YAxis 
                        tick={{ fill: '#888', fontSize: 12 }} 
                        tickFormatter={(val) => `₹${val/1000}k`}
                      />
                      <Tooltip 
                        formatter={(value) => [`₹${value}`, 'Revenue']}
                        labelFormatter={(label) => `Date: ${label}`}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="revenue" 
                        stroke="#704a0d" 
                        strokeWidth={3}
                        dot={{ r: 4, strokeWidth: 2 }}
                        activeDot={{ r: 6 }} 
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* --- LEAD GENERATION ENGINE --- */}
        <h4 className="fw-bold mb-3 mt-5">Lead Generation Engine</h4>
        <Row className="g-3">
          <Col md={4}>
            <Card className="shadow-sm border-0 h-100" style={{ borderTop: '4px solid #dc3545 !important' }}>
              <Card.Body className="d-flex flex-column">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h5 className="m-0 fw-bold text-danger">🔥 Hot Leads</h5>
                  <Badge bg="danger" pill className="fs-6">{data.leads.hot}</Badge>
                </div>
                <p className="text-muted small mb-4">
                  Users who added items to their cart and entered their phone number, or initiated a checkout but did not complete payment.
                </p>
                <div className="mt-auto d-flex flex-column gap-2">
                  <Button variant="danger" className="w-100 fw-bold" onClick={() => router.push('/admin/customer-intelligence?tab=abandoned')}>
                    View Hot Leads List ({data.leads.hot}) &rarr;
                  </Button>
                  <Button variant="outline-danger" className="w-100 fw-bold btn-sm" onClick={() => handleBroadcast('abandoned')}>
                    Broadcast Recovery Campaign
                  </Button>
                </div>
              </Card.Body>
            </Card>
          </Col>
          <Col md={4}>
            <Card className="shadow-sm border-0 h-100" style={{ borderTop: '4px solid #ffc107 !important' }}>
              <Card.Body className="d-flex flex-column">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h5 className="m-0 fw-bold text-warning">🟡 Warm Leads</h5>
                  <Badge bg="warning" text="dark" pill className="fs-6">{data.leads.warm}</Badge>
                </div>
                <p className="text-muted small mb-4">
                  Users with items in their wishlist but no recent purchases, or users who interacted with the WhatsApp bot but dropped off.
                </p>
                <div className="mt-auto d-flex flex-column gap-2">
                  <Button variant="warning" className="w-100 fw-bold text-dark" onClick={() => router.push('/admin/customer-intelligence?tab=wishlist')}>
                    View Warm Leads List ({data.leads.warm}) &rarr;
                  </Button>
                  <Button variant="outline-warning" className="w-100 fw-bold text-dark btn-sm" onClick={() => handleBroadcast('wishlist')}>
                    Send Nurture Campaign
                  </Button>
                </div>
              </Card.Body>
            </Card>
          </Col>
          <Col md={4}>
            <Card className="shadow-sm border-0 h-100" style={{ borderTop: '4px solid #0dcaf0 !important' }}>
              <Card.Body className="d-flex flex-column">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h5 className="m-0 fw-bold text-info">❄️ Cold Leads</h5>
                  <Badge bg="info" text="dark" pill className="fs-6">{data.leads.cold}</Badge>
                </div>
                <p className="text-muted small mb-4">
                  Historical leads imported via CSV or past customers who haven't returned in over 90 days.
                </p>
                <div className="mt-auto d-flex flex-column gap-2">
                  <Button variant="info" className="w-100 fw-bold text-dark" onClick={() => router.push('/admin/customer-intelligence?tab=leads')}>
                    View Cold Leads List ({data.leads.cold}) &rarr;
                  </Button>
                  <Button variant="outline-info" className="w-100 fw-bold text-dark btn-sm" onClick={() => handleBroadcast('historical')}>
                    Send Reactivation Campaign
                  </Button>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </div>
    </AdminLayoutWrapper>
  );
}
