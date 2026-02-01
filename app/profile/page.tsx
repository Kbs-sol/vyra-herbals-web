'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/Components/Contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabaseClient'; // Direct supabase usage for fetching orders
import styled from 'styled-components';
import { Container, Row, Col, Card, Badge, Table, Spinner, Button } from 'react-bootstrap';
import { FaBoxOpen, FaUser, FaSignOutAlt, FaShoppingBag } from 'react-icons/fa';
import Link from 'next/link';
import { APP_NAME } from '@/constants';

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
    const [loadingOrders, setLoadingOrders] = useState(true);

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
        } else if (user) {
            fetchOrders();
        }
    }, [user, authLoading, router]);

    const fetchOrders = async () => {
        try {
            const { data, error } = await supabase
                .from('orders')
                .select('*')
                .eq('user_id', user?.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setOrders(data || []);
        } catch (error) {
            console.error('Error fetching orders:', error);
        } finally {
            setLoadingOrders(false);
        }
    };

    if (authLoading || (loadingOrders && user)) {
        return (
            <LoadingContainer>
                <Spinner animation="border" variant="success" />
                <p>Loading your profile...</p>
            </LoadingContainer>
        );
    }

    if (!user) return null; // Will redirect

    return (
        <PageWrapper>
            <Container className="py-5">
                <Row className="mb-4">
                    <Col>
                        <h2 className="mb-0">My Profile</h2>
                        <p className="text-muted">Manage your account and view orders</p>
                    </Col>
                </Row>

                <Row>
                    {/* Sidebar / User Info */}
                    <Col lg={4} className="mb-4">
                        <UserCard className="shadow-sm border-0 h-100">
                            <Card.Body className="text-center py-5">
                                <div className="avatar-circle mb-3">
                                    {user.name ? user.name.charAt(0).toUpperCase() : <FaUser />}
                                </div>
                                <h4 className="card-title mb-1">{user.name || 'Valued Customer'}</h4>
                                <p className="card-text text-muted mb-4">{user.email}</p>

                                <div className="d-grid gap-2">
                                    {/* <Button variant="outline-primary">Edit Profile</Button> */}
                                    <Button variant="outline-danger" onClick={() => logout()}>
                                        <FaSignOutAlt className="me-2" /> Logout
                                    </Button>
                                    {user.role === 2 && (
                                        <Link href="/admin/dashboard" passHref>
                                            <Button variant="dark" className="w-100 mt-2">Admin Dashboard</Button>
                                        </Link>
                                    )}
                                </div>
                            </Card.Body>
                        </UserCard>
                    </Col>

                    {/* Main Content / Orders */}
                    <Col lg={8}>
                        <Card className="shadow-sm border-0" id="orders">
                            <Card.Header className="bg-white border-bottom py-3">
                                <div className="d-flex justify-content-between align-items-center">
                                    <h5 className="mb-0"><FaShoppingBag className="me-2 text-primary" /> Order History</h5>
                                    <Badge bg="primary">{orders.length} Orders</Badge>
                                </div>
                            </Card.Header>
                            <Card.Body className="p-0">
                                {orders.length === 0 ? (
                                    <div className="text-center py-5">
                                        <FaBoxOpen size={50} className="text-muted mb-3" />
                                        <h5>No orders found</h5>
                                        <p className="text-muted">Looks like you haven't placed any orders yet.</p>
                                        <Link href="/search?searchtext=all">
                                            <Button variant="primary">Start Shopping</Button>
                                        </Link>
                                    </div>
                                ) : (
                                    <div className="table-responsive">
                                        <Table hover className="mb-0 align-middle">
                                            <thead className="bg-light">
                                                <tr>
                                                    <th className="ps-4">Order ID</th>
                                                    <th>Date</th>
                                                    <th>Status</th>
                                                    <th>Total</th>
                                                    <th className="text-end pe-4">Action</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {orders.map((order) => (
                                                    <tr key={order.id}>
                                                        <td className="ps-4 fw-bold">#{order.id}</td>
                                                        <td>{new Date(order.created_at).toLocaleDateString()}</td>
                                                        <td>
                                                            <StatusBadge status={order.status.toLowerCase()}>
                                                                {order.status}
                                                            </StatusBadge>
                                                        </td>
                                                        <td className="fw-bold">₹{order.total_amount}</td>
                                                        <td className="text-end pe-4">
                                                            {/* We could add an Order Details page later */}
                                                            {/* <Button size="sm" variant="outline-secondary">View</Button> */}
                                                            <small className="text-muted">{order.items?.length || 0} items</small>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </Table>
                                    </div>
                                )}
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
            </Container>
        </PageWrapper>
    );
};

export default ProfilePage;

const PageWrapper = styled.div`
    background-color: #f8f9fa;
    min-height: 80vh;
`;

const LoadingContainer = styled.div`
    min-height: 60vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    color: var(--primary);
`;

const UserCard = styled(Card)`
    .avatar-circle {
        width: 80px;
        height: 80px;
        background-color: var(--primary-light, #e9ecef);
        color: var(--primary);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 2.5rem;
        margin: 0 auto;
        font-weight: bold;
    }
`;

const StatusBadge = styled.span<{ status: string }>`
    padding: 0.35em 0.65em;
    font-size: 0.75em;
    font-weight: 700;
    line-height: 1;
    color: #fff;
    text-align: center;
    white-space: nowrap;
    vertical-align: baseline;
    border-radius: 0.25rem;
    text-transform: capitalize;
    
    background-color: ${props => {
        switch (props.status) {
            case 'delivered': return '#28a745';
            case 'shipped': return '#17a2b8';
            case 'placed':
            case 'created': return '#007bff';
            case 'cancelled': return '#dc3545';
            case 'pending': return '#ffc107';
            default: return '#6c757d';
        }
    }};
    
    color: ${props => props.status === 'pending' ? '#212529' : '#fff'};
`;
