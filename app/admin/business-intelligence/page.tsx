'use client';

import React, { useEffect, useState } from 'react';
import AdminLayoutWrapper from '../components/AdminLayoutWrapper';
import { useRouter } from 'next/navigation';
import { Card, Row, Col, Button, Spinner, Badge } from 'react-bootstrap';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

// ─── Types ────────────────────────────────────────────────────────────────────

interface RevenueTrendPoint {
  date: string;
  revenue: number;
}

interface AnalyticsData {
  success: boolean;
  revenue: {
    total: number;
    aov: string | number;
    trend: RevenueTrendPoint[];
  };
  splits: {
    web: number;
    whatsapp: number;
    cod: number;
    online: number;
  };
  leads: {
    hot: number;
    warm: number;
    cold: number;
  };
  totalOrders30Days: number;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function BusinessIntelligencePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/analytics');
      const json: AnalyticsData = await res.json();
      if (json.success) {
        setData(json);
      } else {
        setError('Failed to load analytics data. Please try again.');
      }
    } catch (e) {
      console.error(e);
      setError('Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleBroadcast = (segment: string) => {
    router.push(`/admin/whatsapp/broadcast?segment=${segment}`);
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

  if (error || !data) {
    return (
      <AdminLayoutWrapper>
        <div className="container-fluid py-4">
          <div className="alert alert-danger d-flex align-items-center justify-content-between">
            <span>{error ?? 'Failed to load analytics data.'}</span>
            <Button variant="outline-danger" size="sm" onClick={fetchAnalytics}>
              Retry
            </Button>
          </div>
        </div>
      </AdminLayoutWrapper>
    );
  }

  return (
    <AdminLayoutWrapper>
      <div className="container-fluid py-4">
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h2 className="m-0 fw-bold">Business Intelligence</h2>
            <p className="text-muted small mb-0 mt-1">
              {data.totalOrders30Days} orders in the last 30 days
            </p>
          </div>
          <div className="d-flex align-items-center gap-2">
            <Badge bg="primary" className="p-2">Last 30 Days</Badge>
            <Button variant="outline-secondary" size="sm" onClick={fetchAnalytics}>
              ↻ Refresh
            </Button>
          </div>
        </div>

        {/* ── KPI Cards ───────────────────────────────────────────────────── */}
        <Row className="mb-4 g-3">
          <Col md={3}>
            <Card className="shadow-sm border-0 h-100">
              <Card.Body>
                <div className="text-muted small fw-bold mb-2">GROSS REVENUE</div>
                <h3 className="m-0 text-primary fw-bold">
                  ₹{data.revenue.total.toLocaleString('en-IN')}
                </h3>
                <div className="text-success small mt-2">
                  <i className="bi bi-arrow-up-short" /> Active
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

        {/* ── Revenue Trend Chart ─────────────────────────────────────────── */}
        <Row className="mb-5">
          <Col md={12}>
            <Card className="shadow-sm border-0">
              <Card.Body>
                <h5 className="fw-bold mb-4">Revenue Trend (30 Days)</h5>
                {data.revenue.trend.length === 0 ? (
                  <div className="text-center text-muted py-5">No revenue data for this period.</div>
                ) : (
                  <div style={{ width: '100%', height: 300 }}>
                    <ResponsiveContainer>
                      <LineChart data={data.revenue.trend}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                        <XAxis
                          dataKey="date"
                          tick={{ fill: '#888', fontSize: 12 }}
                          tickFormatter={(val: string) => {
                            const d = new Date(val);
                            return `${d.getDate()}/${d.getMonth() + 1}`;
                          }}
                        />
                        <YAxis
                          tick={{ fill: '#888', fontSize: 12 }}
                          tickFormatter={(val: number) => `₹${val / 1000}k`}
                        />
                        <Tooltip
                          formatter={(value: number) => [`₹${value.toLocaleString('en-IN')}`, 'Revenue']}
                          labelFormatter={(label: string) => `Date: ${label}`}
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
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* ── Lead Generation Engine ──────────────────────────────────────── */}
        <h4 className="fw-bold mb-3">Lead Generation Engine</h4>
        <Row className="g-3">
          {/* Hot Leads */}
          <Col md={4}>
            <Card className="shadow-sm border-0 h-100" style={{ borderTop: '4px solid #dc3545' }}>
              <Card.Body className="d-flex flex-column">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h5 className="m-0 fw-bold text-danger">🔥 Hot Leads</h5>
                  <Badge bg="danger" pill className="fs-6">{data.leads.hot}</Badge>
                </div>
                <p className="text-muted small mb-4">
                  Users who added items to cart or started checkout but did not complete payment. Highest intent — recover fast.
                </p>
                <div className="mt-auto d-flex flex-column gap-2">
                  <Button
                    variant="danger"
                    className="w-100 fw-bold"
                    onClick={() => router.push('/admin/customers?tab=abandoned')}
                  >
                    View Hot Leads ({data.leads.hot}) &rarr;
                  </Button>
                  <Button
                    variant="outline-danger"
                    className="w-100 fw-bold btn-sm"
                    onClick={() => handleBroadcast('abandoned')}
                  >
                    Broadcast Recovery Campaign
                  </Button>
                </div>
              </Card.Body>
            </Card>
          </Col>

          {/* Warm Leads */}
          <Col md={4}>
            <Card className="shadow-sm border-0 h-100" style={{ borderTop: '4px solid #ffc107' }}>
              <Card.Body className="d-flex flex-column">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h5 className="m-0 fw-bold text-warning">🟡 Warm Leads</h5>
                  <Badge bg="warning" text="dark" pill className="fs-6">{data.leads.warm}</Badge>
                </div>
                <p className="text-muted small mb-4">
                  Users with wishlist items but no recent purchases, or WhatsApp bot interactions without a completed order.
                </p>
                <div className="mt-auto d-flex flex-column gap-2">
                  <Button
                    variant="warning"
                    className="w-100 fw-bold text-dark"
                    onClick={() => router.push('/admin/customers?tab=wishlist')}
                  >
                    View Warm Leads ({data.leads.warm}) &rarr;
                  </Button>
                  <Button
                    variant="outline-warning"
                    className="w-100 fw-bold text-dark btn-sm"
                    onClick={() => handleBroadcast('wishlist')}
                  >
                    Send Nurture Campaign
                  </Button>
                </div>
              </Card.Body>
            </Card>
          </Col>

          {/* Cold Leads */}
          <Col md={4}>
            <Card className="shadow-sm border-0 h-100" style={{ borderTop: '4px solid #0dcaf0' }}>
              <Card.Body className="d-flex flex-column">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h5 className="m-0 fw-bold text-info">❄️ Cold Leads</h5>
                  <Badge bg="info" text="dark" pill className="fs-6">{data.leads.cold}</Badge>
                </div>
                <p className="text-muted small mb-4">
                  Historical leads imported via CSV, or past customers who have not returned in over 90 days.
                </p>
                <div className="mt-auto d-flex flex-column gap-2">
                  <Button
                    variant="info"
                    className="w-100 fw-bold text-dark"
                    onClick={() => router.push('/admin/customers?tab=leads')}
                  >
                    View Cold Leads ({data.leads.cold}) &rarr;
                  </Button>
                  <Button
                    variant="outline-info"
                    className="w-100 fw-bold text-dark btn-sm"
                    onClick={() => handleBroadcast('historical')}
                  >
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
