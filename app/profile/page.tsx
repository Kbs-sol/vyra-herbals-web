'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/Components/Contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabaseClient';
import styled, { css } from 'styled-components';
import { Container, Row, Col, Card, Badge, Table, Spinner, Modal, Button, Nav, Tab, Form } from 'react-bootstrap';
import { FaBoxOpen, FaUser, FaSignOutAlt, FaShoppingBag, FaCog, FaHistory, FaCheckCircle } from 'react-icons/fa';
import Link from 'next/link';

interface Order {
    id: number;
    created_at: string;
    total_amount: number;
    status: string;
    items?: any[];
    products?: any[];
    tracking_id?: string;
    status_timeline?: any[];
}

const ProfilePage = () => {
    const { user, loading: authLoading, logout } = useAuth();
    const router = useRouter();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loadingOrders, setLoadingOrders] = useState(false);
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const [activeTab, setActiveTab] = useState('orders');

    // Fetch orders only when user is available and not already loading
    // Fetch orders only when user is available
    // Fetch orders only when user is available and not already loading
    // Fetch orders only when user is available
    useEffect(() => {
        if (!authLoading && user) {
            fetchOrders();
        } else if (!authLoading && !user) {
            router.push('/login');
        }
    }, [user?.id, authLoading, router]);

    const fetchOrders = async () => {
        if (!user) return;
        setLoadingOrders(true);
        // Log removed
        try {
            const { data, error } = await supabase
                .from('orders')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });


            // Logs removed

            if (error) throw error;

            // Filter out invalid orders and handle missing data
            // Filter out invalid orders and handle missing data
            // Filter out invalid orders and handle missing data
            const validOrders = (data || []).map((order) => {
                return {
                    ...order,
                    id: order.id || order.order_id, // Ensure we have a valid ID
                    items: order.items || order.products || [], // Normalize items
                    created_at: order.created_at || order.order_date || new Date().toISOString() // Fallback date
                };
            }).filter(order => order.id); // Only keep orders with an ID

            setOrders(validOrders);
        } catch (error) {
            console.error('Error fetching orders:', error);
        } finally {
            setLoadingOrders(false);
        }
    };

    const handleLogout = async () => {
        await logout();
        setShowLogoutModal(false);
    };

    const renderOrdersContent = () => {
        if (loadingOrders) {
            return (
                <div className="text-center py-5">
                    <Spinner animation="border" variant="secondary" />
                </div>
            );
        }

        if (orders.length === 0) {
            return (
                <EmptyState>
                    <FaBoxOpen size={48} className="mb-3 text-secondary opacity-50" />
                    <h5>No orders yet</h5>
                    <p className="text-muted mb-4">You haven't placed any orders. Start exploring our products!</p>
                    <Link href="/search?searchtext=all" passHref>
                        <Button variant="dark" className="px-4 rounded-pill">Start Shopping</Button>
                    </Link>
                </EmptyState>
            );
        }

        return (
            <OrdersList>
                {orders.map((order, index) => (
                    <OrderItem key={order.id ?? `order-${index}`} className="shadow-sm border-0 mb-4">
                        <Card.Header className="bg-white border-bottom p-3 d-flex justify-content-between align-items-center">
                            <div>
                                <span className="text-uppercase fw-bold text-secondary small me-2">Order Placed</span>
                                <span className="fw-medium text-dark">{new Date(order.created_at).toLocaleDateString("en-IN", { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                            </div>
                            <div className="d-flex align-items-center gap-3">
                                <span className="text-uppercase fw-bold text-secondary small">Total</span>
                                <span className="fw-bold text-dark">₹{order.total_amount}</span>
                            </div>
                        </Card.Header>
                        <Card.Body className="p-4">
                            <div className="d-flex flex-column flex-md-row gap-4 justify-content-between align-items-md-center">
                                <div className="flex-grow-1">
                                    <div className="d-flex align-items-center mb-3">
                                        <StatusChip status={order.status.toLowerCase()} className="me-3">
                                            {order.status}
                                        </StatusChip>
                                        <span className="text-muted small">Order # {order.id}</span>
                                    </div>

                                    <div className="d-flex gap-3 overflow-auto pb-2" style={{ maxWidth: '100%' }}>
                                        {(order.products || order.items || []).map((item: any, i: number) => (
                                            <div key={i} style={{ width: 60, height: 60, flexShrink: 0 }} className="border rounded p-1 position-relative">
                                                <img
                                                    src={item.product_image || item.image_url || '/home-hair-oil.jpg'}
                                                    alt={item.product_title || item.title || 'Product'}
                                                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                                    onError={(e) => {
                                                        (e.target as HTMLImageElement).src = '/home-hair-oil.jpg';
                                                    }}
                                                />
                                                {item.quantity > 1 && (
                                                    <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-secondary" style={{ fontSize: '0.6rem' }}>
                                                        {item.quantity}
                                                    </span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="d-flex flex-column gap-2" style={{ minWidth: '140px' }}>
                                    <Button
                                        variant="primary"
                                        className="w-100 rounded-pill fw-medium"
                                        onClick={() => {
                                            router.push(`/orders/${order.id}`);
                                        }}
                                    >
                                        View Details
                                    </Button>
                                    <Link href={`/contact?orderId=${order.id}`} passHref>
                                        <Button variant="outline-secondary" size="sm" className="w-100 rounded-pill">Need Help?</Button>
                                    </Link>
                                </div>
                            </div>
                        </Card.Body>
                    </OrderItem>
                ))}
            </OrdersList>
        );
    };

    if (authLoading) {
        return (
            <LoadingContainer>
                <Spinner animation="border" role="status" variant="secondary">
                    <span className="visually-hidden">Loading...</span>
                </Spinner>
            </LoadingContainer>
        );
    }

    if (!user) return null;

    return (
        <PageWrapper>
            <Container className="py-5">
                <HeaderSection className="mb-5">
                    <h1 className="display-5 fw-bold text-dark">My Account</h1>
                    <p className="text-secondary">Manage your profile, settings, and orders.</p>
                </HeaderSection>

                <Tab.Container id="profile-tabs" activeKey={activeTab} onSelect={(k) => setActiveTab(k || 'orders')}>
                    <Row>
                        <Col lg={3} className="mb-4">
                            <SidebarCard className="border-0 shadow-sm">
                                <Card.Body className="p-0">
                                    <UserInfo className="p-4 text-center border-bottom">
                                        <div className="avatar mb-3">
                                            {user.name ? user.name.charAt(0).toUpperCase() : <FaUser />}
                                        </div>
                                        <h5 className="fw-bold mb-1">{user.name || 'User'}</h5>
                                        <small className="text-muted">{user.email}</small>
                                    </UserInfo>

                                    <Nav variant="pills" className="flex-column p-2 custom-nav">
                                        <Nav.Item>
                                            <Nav.Link eventKey="orders" className="d-flex align-items-center">
                                                <FaShoppingBag className="me-3" /> Orders
                                            </Nav.Link>
                                        </Nav.Item>
                                        <Nav.Item>
                                            <Nav.Link eventKey="settings" className="d-flex align-items-center">
                                                <FaCog className="me-3" /> Settings
                                            </Nav.Link>
                                        </Nav.Item>
                                    </Nav>

                                    <div className="p-3 border-top mt-2">
                                        <LogoutButton variant="link" onClick={() => setShowLogoutModal(true)}>
                                            <FaSignOutAlt className="me-2" /> Log Out
                                        </LogoutButton>
                                    </div>
                                </Card.Body>
                            </SidebarCard>
                        </Col>

                        <Col lg={9}>
                            <Tab.Content>
                                <Tab.Pane eventKey="orders">
                                    <SectionTitle>Order History</SectionTitle>
                                    {renderOrdersContent()}
                                </Tab.Pane>

                                <Tab.Pane eventKey="settings">
                                    <SectionTitle>Account Settings</SectionTitle>
                                    <Card className="border-0 shadow-sm">
                                        <Card.Body className="p-4">
                                            <Form>
                                                <Row className="mb-3">
                                                    <Col md={6}>
                                                        <Form.Group className="mb-3">
                                                            <Form.Label>Full Name</Form.Label>
                                                            <Form.Control type="text" value={user.name || ''} readOnly className="bg-light" />
                                                        </Form.Group>
                                                    </Col>
                                                    <Col md={6}>
                                                        <Form.Group className="mb-3">
                                                            <Form.Label>Email Address</Form.Label>
                                                            <Form.Control type="email" value={user.email || ''} readOnly className="bg-light" />
                                                        </Form.Group>
                                                    </Col>
                                                </Row>
                                                <Row>
                                                    <Col md={6}>
                                                        <Form.Group className="mb-3">
                                                            <Form.Label>User ID</Form.Label>
                                                            <Form.Control type="text" value={user.id} readOnly className="bg-light" />
                                                        </Form.Group>
                                                    </Col>
                                                    <Col md={6}>
                                                        <Form.Group className="mb-3">
                                                            <Form.Label>Account Status</Form.Label>
                                                            <div><Badge bg="success"><FaCheckCircle className="me-1" /> Active</Badge></div>
                                                        </Form.Group>
                                                    </Col>
                                                </Row>
                                                {/* <div className="mt-4 pt-3 border-top">
                                                     <Button variant="primary" disabled>Save Changes (Coming Soon)</Button>
                                                </div> */}
                                            </Form>
                                        </Card.Body>
                                    </Card>
                                </Tab.Pane>
                            </Tab.Content>
                        </Col>
                    </Row>
                </Tab.Container>

                <StyledModal show={showLogoutModal} onHide={() => setShowLogoutModal(false)} centered>
                    <Modal.Body className="text-center p-5">
                        <h4 className="mb-3 fw-bold">Log Out?</h4>
                        <p className="text-muted mb-4">Are you sure you want to log out of your account?</p>
                        <div className="d-flex justify-content-center gap-3">
                            <Button variant="light" onClick={() => setShowLogoutModal(false)} className="rounded-pill px-4">Cancel</Button>
                            <Button variant="danger" onClick={handleLogout} className="rounded-pill px-4">Log Out</Button>
                        </div>
                    </Modal.Body>
                </StyledModal>
            </Container>

        </PageWrapper>
    );
};

export default ProfilePage;

// --- Styled Components ---

const PageWrapper = styled.div`
    background-color: #f4f6f8;
    min-height: 100vh;
`;

const LoadingContainer = styled.div`
    height: 100vh;
    display: flex;
    justify-content: center;
    align-items: center;
`;

const HeaderSection = styled.div`
    h1 { letter-spacing: -0.5px; }
`;

const SectionTitle = styled.h4`
    font-weight: 700;
    color: #333;
    margin-bottom: 1.5rem;
`;

const SidebarCard = styled(Card)`
    border-radius: 12px;
    overflow: hidden;
    
    .custom-nav {
         .nav-link {
             color: #555;
             font-weight: 500;
             padding: 0.75rem 1rem;
             margin-bottom: 0.25rem;
             border-radius: 8px;
             transition: all 0.2s;
             
             &:hover {
                 background-color: #f8f9fa;
                 color: #000;
             }
             
             &.active {
                 background-color: var(--primary);
                 color: white;
                 box-shadow: 0 4px 12px rgba(var(--primary-rgb), 0.2);
             }
         }
    }
`;

const UserInfo = styled.div`
    .avatar {
        width: 72px;
        height: 72px;
        background-color: #e2e8f0;
        color: #64748b;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.75rem;
        margin: 0 auto;
    }
`;

const LogoutButton = styled(Button)`
    color: #ef4444;
    text-decoration: none;
    font-weight: 500;
    width: 100%;
    text-align: left;
    padding-left: 1rem;
    
    &:hover {
        color: #dc2626;
        background-color: #fef2f2;
        text-decoration: none;
    }
`;

const OrderItem = styled(Card)`
    border-radius: 12px;
    transition: transform 0.2s;
    &:hover {
        transform: translateY(-2px);
    }
`;

const OrdersList = styled.div``;

const EmptyState = styled.div`
    background: white;
    border-radius: 12px;
    padding: 4rem 2rem;
    text-align: center;
    box-shadow: 0 4px 6px rgba(0,0,0,0.02);
`;

const StatusChip = styled.span<{ status: string }>`
    display: inline-block;
    padding: 0.4rem 1rem;
    border-radius: 50px;
    font-size: 0.85rem;
    font-weight: 600;
    text-transform: capitalize;
    
    ${props => {
        switch (props.status) {
            case 'delivered':
                return css`background-color: #dcfce7; color: #166534;`;
            case 'shipped':
                return css`background-color: #e0f2fe; color: #075985;`;
            case 'placed':
            case 'created':
                return css`background-color: #dbeafe; color: #1e40af;`;
            case 'cancelled':
                return css`background-color: #fee2e2; color: #991b1b;`;
            case 'pending':
                return css`background-color: #fef3c7; color: #92400e;`;
            default:
                return css`background-color: #f1f5f9; color: #475569;`;
        }
    }}
`;

const StyledModal = styled(Modal)`
    .modal-content {
        border-radius: 16px;
        border: none;
        box-shadow: 0 10px 25px rgba(0,0,0,0.1);
    }
`;
