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
    items: any[];
    tracking_id?: string;
}

const ProfilePage = () => {
    const { user, loading: authLoading, logout } = useAuth();
    const router = useRouter();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loadingOrders, setLoadingOrders] = useState(false);
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const [activeTab, setActiveTab] = useState('orders');

    // Fetch orders only when user is available and not already loading
    useEffect(() => {
        if (!authLoading) {
            if (!user) {
                router.push('/login');
            } else if (!loadingOrders && orders.length === 0) {
                // Only fetch if we haven't already (or simple cache check)
                // Actually, let's fetch always on mount if user exists
                fetchOrders();
            }
        }
    }, [user, authLoading, router]);

    const fetchOrders = async () => {
        if (!user) return;
        setLoadingOrders(true);
        try {
            const { data, error } = await supabase
                .from('orders')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setOrders(data || []);
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

                                    {loadingOrders ? (
                                        <div className="text-center py-5">
                                            <Spinner animation="border" variant="secondary" />
                                        </div>
                                    ) : orders.length === 0 ? (
                                        <EmptyState>
                                            <FaBoxOpen size={48} className="mb-3 text-secondary opacity-50" />
                                            <h5>No orders yet</h5>
                                            <p className="text-muted mb-4">You haven't placed any orders. Start exploring our products!</p>
                                            <Link href="/search?searchtext=all" passHref>
                                                <Button variant="dark" className="px-4 rounded-pill">Start Shopping</Button>
                                            </Link>
                                        </EmptyState>
                                    ) : (
                                        <OrdersList>
                                            {orders.map((order, index) => (
                                                <OrderItem key={order.id ?? `order-${index}`} className="shadow-sm border-0 mb-3">
                                                    <Card.Body className="d-flex flex-wrap align-items-center justify-content-between gap-3">
                                                        <div>
                                                            <div className="text-uppercase text-muted small fw-bold mb-1">Order #{order.id}</div>
                                                            <div className="fw-bold fs-5">₹{order.total_amount}</div>
                                                        </div>

                                                        <div className="d-none d-md-block">
                                                            <div className="text-muted small mb-1">Date Placed</div>
                                                            <div>{new Date(order.created_at).toLocaleDateString()}</div>
                                                        </div>

                                                        <div>
                                                            <StatusChip status={order.status.toLowerCase()}>
                                                                {order.status}
                                                            </StatusChip>
                                                        </div>

                                                        <div className="text-end">
                                                            <div className="text-muted small mb-1">{order.items?.length || 0} Items</div>
                                                            {/* Placeholder for Details Button if needed */}
                                                        </div>
                                                    </Card.Body>
                                                </OrderItem>
                                            ))}
                                        </OrdersList>
                                    )}
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
