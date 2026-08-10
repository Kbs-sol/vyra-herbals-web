'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/Components/Contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabaseClient';
import styled, { css } from 'styled-components';
import { Container, Row, Col, Card, Badge, Spinner, Modal, Button, Nav, Tab, Form } from 'react-bootstrap';
import { FaBoxOpen, FaUser, FaSignOutAlt, FaShoppingBag, FaCog, FaHistory, FaCheckCircle, FaHeart, FaMapMarkerAlt, FaPlus, FaTrash, FaEdit, FaCreditCard } from 'react-icons/fa';
import Link from 'next/link';
import { useWishlist } from '@/Components/Contexts/WishlistContext';
import { useCart } from '@/Components/Contexts/CartContext';
import { toast } from 'react-toastify';
import LazyImage from '@/Components/Common/LazyImage';
import Utility from '@/utils/UtilityFunctions';
import { generateInvoice } from '@/utils/invoiceGenerator';
import { resolveCurrentHandle } from '@/utils/productHandle';

interface Order {
    id: number;
    order_id?: string;
    txn_id?: string;
    payment_method?: string;
    delivery_status?: string;
    created_at: string;
    total_amount: number;
    status: string;
    items?: any[];
    products?: any[];
    tracking_id?: string;
    status_timeline?: any[];
    shipping_data?: any;
    items_count?: number;
}

interface Address {
    id: number;
    full_name: string;
    phone: string;
    house_number: string;
    area: string;
    landmark: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
    address_type: string;
    is_default: boolean;
}

interface Transaction {
    id: number;
    amount: number;
    status: string;
    txn_id: string;
    created_at: string;
}

const ProfilePage = () => {
    const { user, loading: authLoading, logout } = useAuth();
    const router = useRouter();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loadingOrders, setLoadingOrders] = useState(false);
    const [buyingAgainKey, setBuyingAgainKey] = useState<string | null>(null);

    // Addresses state
    const [addresses, setAddresses] = useState<Address[]>([]);
    const [loadingAddresses, setLoadingAddresses] = useState(false);
    const [showAddressModal, setShowAddressModal] = useState(false);
    const [editingAddress, setEditingAddress] = useState<Address | null>(null);
    const [addressForm, setAddressForm] = useState<Partial<Address>>({});
    const [savingAddress, setSavingAddress] = useState(false);

    // Transactions state
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loadingTransactions, setLoadingTransactions] = useState(false);

    // Wishlist from context
    const { wishlistItems, wishlistCount, removeFromWishlist } = useWishlist();
    const { addItemToCart, cartItems } = useCart();

    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const [activeTab, setActiveTab] = useState('orders');

    useEffect(() => {
        if (!authLoading && user) {
            fetchOrders();
            fetchAddresses();
            fetchTransactions();

            // Display success toast if redirected from payment
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.get('toast') === 'order_success') {
                toast.success('Payment successful! Your order has been placed.');

                // Remove the query param gracefully
                const newUrl = window.location.pathname + window.location.hash;
                window.history.replaceState({}, document.title, newUrl);
            }
        } else if (!authLoading && !user) {
            const urlParams = new URL(window.location.href).searchParams;
            const isSuccessMsg = urlParams.get('toast') === 'order_success';
            router.push(`/login?next=/profile${isSuccessMsg ? '&toast=order_success' : ''}`);
        }
    }, [user?.id, authLoading, router]);

    const fetchAddresses = async () => {
        if (!user) return;
        console.log("Fetching addresses for user:", user.id);
        setLoadingAddresses(true);
        try {
            const { data, error } = await supabase
                .from('user_addresses')
                .select('*')
                .eq('user_id', user.id)
                .order('is_default', { ascending: false })
                .order('created_at', { ascending: false });

            if (error) {
                console.error("Supabase fetch error:", error);
                // If table doesn't exist yet, just ignore to prevent crash
                if (error.code !== '42P01') throw error;
                console.log('User addresses table may not exist yet.');
            } else {
                console.log("Fetched addresses count:", data?.length || 0);
                setAddresses(data || []);
            }
        } catch (error) {
            console.error('Error fetching addresses:', error);
        } finally {
            setLoadingAddresses(false);
        }
    };

    const fetchTransactions = async () => {
        if (!user) return;
        setLoadingTransactions(true);
        try {
            let phoneToMatch = user.phone;
            // If phone isn't explicitly set, try to extract from dummy email
            if (!phoneToMatch && user.email?.includes('@phone.internal')) {
                phoneToMatch = user.email.split('@')[0];
            }

            const orQuery: string[] = [];
            if (user.email) orQuery.push(`email.eq.${user.email}`);

            if (phoneToMatch) {
                // Strip non-digits and optional +91 code
                const cleanPhone = phoneToMatch.replace(/^\+?91/, '').replace(/\D/g, '');
                if (cleanPhone) {
                    orQuery.push(`phone.eq.${cleanPhone}`);
                    // Check variations just in case it was saved differently
                    orQuery.push(`phone.eq.+91${cleanPhone}`);
                    orQuery.push(`phone.eq.91${cleanPhone}`);
                }
            }

            const queryStr = orQuery.join(',');

            // Default to empty array if no query fields
            if (!queryStr) {
                setTransactions([]);
                setLoadingTransactions(false);
                return;
            }

            const { data, error } = await supabase
                .from('transactions')
                .select('id, amount, status, txn_id, created_at')
                .or(queryStr)
                .order('id', { ascending: false });

            if (error) throw error;
            setTransactions(data || []);
        } catch (error) {
            console.error('Error fetching transactions:', error);
        } finally {
            setLoadingTransactions(false);
        }
    };

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

            const validOrders = (data || []).map((order) => {
                return {
                    ...order,
                    id: order.id || order.order_id,
                    items: order.items || order.products || [],
                    created_at: order.created_at || order.order_date || new Date().toISOString()
                };
            }).filter(order => order.id);

            setOrders(validOrders);

            // Retry every order without a shipment_id (except Failed payments) — sync is
            // idempotent and the server already short-circuits when shipment_id is set,
            // so this is safe even on every page load. We don't filter by delivery_status
            // because timeouts can leave the row in unexpected intermediate states (null,
            // 'Pending Sync', 'Sync Failed: …', or even an old success status that didn't
            // get overwritten because the row was never updated).
            const pending = validOrders.filter((o: any) =>
                !o.shipment_id && o.status !== 'Failed'
            );
            if (pending.length > 0) {
                const { data: { session } } = await supabase.auth.getSession();
                const token = session?.access_token;
                if (token) {
                    // Fire all retries in parallel; await so we can refresh the UI once
                    // they're done. Each call has its own ~25s server-side ceiling.
                    const results = await Promise.all(
                        pending.map((o: any) =>
                            fetch('/api/orders/sync-shipment', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    Authorization: `Bearer ${token}`,
                                },
                                body: JSON.stringify({ order_id: o.id }),
                                // Auth is via the Bearer header, not cookies — omit
                                // credentials so a large cookie jar can't push the
                                // request over the header limit (HTTP 431).
                                credentials: 'omit',
                            })
                                .then((r) => r.ok)
                                .catch((e) => {
                                    console.warn('sync-shipment retry failed:', e);
                                    return false;
                                })
                        )
                    );
                    // If any succeeded, re-fetch orders so the user sees the updated
                    // tracking id / delivery status without needing another reload.
                    if (results.some(Boolean)) {
                        const { data: refreshed } = await supabase
                            .from('orders')
                            .select('*')
                            .eq('user_id', user.id)
                            .order('created_at', { ascending: false });
                        if (refreshed) {
                            setOrders(
                                refreshed.map((order: any) => ({
                                    ...order,
                                    id: order.id || order.order_id,
                                    items: order.items || order.products || [],
                                    created_at: order.created_at || order.order_date || new Date().toISOString(),
                                })).filter((o: any) => o.id)
                            );
                        }
                    }
                }
            }
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

    const formatAddress = (shippingData: any) => {
        try {
            if (!shippingData) return null;
            const data = typeof shippingData === 'string' ? JSON.parse(shippingData) : shippingData;

            // Handle legacy simple address string
            if (data.address && !data.houseNumber) {
                return {
                    name: data.fullName || 'Valued Customer',
                    city: 'India'
                };
            }

            return {
                name: data.fullName || 'Valued Customer',
                city: data.city || 'India',
                state: data.state || ''
            };
        } catch (e) {
            return { name: 'Valued Customer', city: 'India' };
        }
    };

    const handleAddressSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        console.log("handleAddressSubmit triggered");
        if (!user) {
            console.error("No user found in handleAddressSubmit");
            return;
        }

        try {
            setSavingAddress(true);
            console.log("Submitting address form:", addressForm);

            // Clean the request data - remove fields that shouldn't be in the payload
            const { id, created_at, updated_at, user_id, ...submitData } = addressForm as any;

            if (editingAddress) {
                console.log("Updating existing address:", editingAddress.id);
                const { error } = await supabase
                    .from('user_addresses')
                    .update({ ...submitData, updated_at: new Date().toISOString() })
                    .eq('id', editingAddress.id);

                if (error) {
                    console.error("Supabase update error:", error);
                    throw error;
                }
                console.log("Update success");
                toast.success('Address updated successfully');
            } else {
                console.log("Inserting new address for user:", user.id);
                const { error } = await supabase
                    .from('user_addresses')
                    .insert([{ ...submitData, user_id: user.id }]);

                if (error) {
                    console.error("Supabase insert error:", error);
                    throw error;
                }
                console.log("Insert success");
                toast.success('Address added successfully');
            }

            setShowAddressModal(false);
            fetchAddresses();
        } catch (error) {
            console.error('Error saving address:', error);
            if (error && typeof error === 'object' && 'message' in error) {
                toast.error(`Failed to save address: ${error.message}`);
            } else {
                toast.error('Failed to save address');
            }
        } finally {
            setSavingAddress(false);
        }
    };

    const deleteAddress = async (id: number) => {
        if (!confirm('Are you sure you want to delete this address?')) return;
        try {
            const { error } = await supabase
                .from('user_addresses')
                .delete()
                .eq('id', id);
            if (error) throw error;
            toast.success('Address deleted');
            fetchAddresses();
        } catch (error) {
            console.error('Error deleting address:', error);
            toast.error('Failed to delete address');
        }
    };

    const setDefaultAddress = async (id: number) => {
        try {
            const { error } = await supabase
                .from('user_addresses')
                .update({ is_default: true, updated_at: new Date().toISOString() })
                .eq('id', id);
            if (error) throw error;
            toast.success('Default address set');
            fetchAddresses();
        } catch (error) {
            console.error('Error setting default address:', error);
            toast.error('Failed to set default address');
        }
    };

    const handleAddToCart = async (product: any) => {
        await addItemToCart(product.id, 1, product);
    };

    const isInCart = (productId: number) => {
        return cartItems.some((item) => item.id === productId);
    };

    // Re-buy an order's first item (matches the "Order Again" behaviour on the
    // order-detail page). Order line-items snapshot the product's handle at
    // purchase time, which can go stale if an admin later renames the
    // product's URL slug — resolve the CURRENT handle from the stable product
    // id before navigating.
    const handleBuyAgain = async (order: Order, key: string) => {
        const item: any = (order.products || order.items || [])[0] || {};
        const productId = item.product_id ?? item.id ?? null;
        const snapshotHandle = item.handle || item.product_handle || item.productHandle || '';

        if (!productId && !snapshotHandle) {
            toast.error('Could not find this product to reorder.');
            return;
        }

        setBuyingAgainKey(key);
        try {
            const handle = await resolveCurrentHandle(productId, snapshotHandle);
            if (!handle) {
                toast.error('This product is no longer available.');
                return;
            }
            router.push(`/product/${handle}?orderAgain=1`);
        } finally {
            setBuyingAgainKey(null);
        }
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
                {orders.map((order, index) => {
                    const address = formatAddress(order.shipping_data);
                    const itemCount = (order.products || order.items || []).reduce((acc: number, item: any) => acc + (Number(item.quantity) || 1), 0);

                    return (
                        <OrderItem
                            key={order.id ?? `order-${index}`}
                            className="shadow-sm border-0 mb-4"
                            onClick={() => router.push(`/orders/${order.id}`)}
                            style={{ cursor: 'pointer' }}
                        >
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
                                <div className="d-flex flex-column flex-lg-row gap-4 justify-content-between">
                                    <div className="flex-grow-1" style={{ minWidth: 0 }}>
                                        <div className="d-flex align-items-center flex-wrap gap-2 mb-3">
                                            <StatusChip status={order.status.toLowerCase()}>
                                                {order.status}
                                            </StatusChip>
                                            <span className="badge bg-light text-secondary border fw-normal">
                                                Order ID: {order.order_id || order.id}
                                            </span>
                                            <span className="badge bg-light text-secondary border fw-normal">
                                                {order.payment_method === 'cod' ? 'COD' : 'Prepaid'}
                                            </span>
                                            {order.txn_id && (
                                                <span className="badge bg-light text-secondary border fw-normal">
                                                    Txn: {order.txn_id}
                                                </span>
                                            )}
                                            {address && (
                                                <span className="badge bg-light text-secondary border fw-normal">
                                                    Shipped to {address.name} {address.city ? `(${address.city})` : ''}
                                                </span>
                                            )}
                                            <span className="badge bg-light text-secondary border fw-normal">
                                                {itemCount} {itemCount === 1 ? 'Item' : 'Items'}
                                            </span>
                                        </div>

                                        <div className="d-flex gap-2 flex-wrap">
                                            {(order.products || order.items || []).map((item: any, i: number) => (
                                                <div key={i} style={{ width: 56, height: 56, flexShrink: 0 }} className="border rounded p-1 position-relative bg-white">
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

                                    <div className="d-flex flex-row flex-lg-column gap-2 action-col">
                                        <Button
                                            className="w-100 rounded-pill buy-again-btn"
                                            size="sm"
                                            disabled={buyingAgainKey === String(order.id)}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleBuyAgain(order, String(order.id));
                                            }}
                                        >
                                            {buyingAgainKey === String(order.id) ? 'Please wait…' : 'Buy Again'}
                                        </Button>
                                        <Button
                                            variant="outline-dark"
                                            size="sm"
                                            className="w-100 rounded-pill"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                generateInvoice(order);
                                            }}
                                        >
                                            Invoice
                                        </Button>
                                        <Link href={`/contact?orderId=${order.id}`} passHref onClick={(e) => e.stopPropagation()} className="w-100">
                                            <Button variant="outline-secondary" size="sm" className="w-100 rounded-pill">Need Help?</Button>
                                        </Link>
                                    </div>
                                </div>
                            </Card.Body>
                        </OrderItem>
                    );
                })}
            </OrdersList>
        );
    };

    const renderTransactionsContent = () => {
        if (loadingTransactions) {
            return (
                <div className="text-center py-5">
                    <Spinner animation="border" variant="secondary" />
                </div>
            );
        }

        if (transactions.length === 0) {
            return (
                <EmptyState>
                    <FaCreditCard size={48} className="mb-3 text-secondary opacity-50" />
                    <h5>No transactions found</h5>
                    <p className="text-muted mb-4">You haven't made any online payments yet.</p>
                </EmptyState>
            );
        }

        return (
            <div className="table-responsive">
                <table className="table table-hover align-middle">
                    <thead className="table-light">
                        <tr>
                            <th>Date</th>
                            <th>Transaction ID</th>
                            <th>Amount</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {transactions.map((txn, index) => {
                            // Cross-reference with orders to find "true" success
                            // Legitimate orders store the transaction.id in their txn_id column
                            const matchedOrder = orders.find(o =>
                                String(o.txn_id) === String(txn.id) ||
                                (txn.txn_id && String(o.txn_id) === String(txn.txn_id))
                            );

                            const isSuccessful = txn.status === 'success' || !!matchedOrder;
                            const displayStatus = isSuccessful ? 'success' : txn.status;
                            const displayTxnId = txn.txn_id || (matchedOrder ? matchedOrder.order_id : null);

                            return (
                                <tr key={txn.id ?? `txn-${index}`}>
                                    <td>
                                        {txn.created_at
                                            ? new Date(txn.created_at).toLocaleDateString("en-IN", { day: 'numeric', month: 'short', year: 'numeric' })
                                            : '—'}
                                    </td>
                                    <td>
                                        <div className="d-flex flex-column">
                                            <span className="font-monospace text-muted" style={{ fontSize: '0.75rem' }}>{displayTxnId || '—'}</span>
                                            {matchedOrder && <small className="text-primary" style={{ fontSize: '0.65rem' }}>Order: {matchedOrder.order_id}</small>}
                                        </div>
                                    </td>
                                    <td className="fw-bold">₹{txn.amount}</td>
                                    <td>
                                        <Badge bg={
                                            displayStatus === 'success' ? 'success' :
                                                displayStatus === 'failed' ? 'danger' :
                                                    displayStatus === 'created' ? 'warning' : 'secondary'
                                        }>
                                            {displayStatus === 'success' ? 'Paid' :
                                                displayStatus === 'failed' ? 'Failed' :
                                                    displayStatus === 'created' ? 'Initiated' :
                                                        (displayStatus || 'Unknown').toUpperCase()}
                                        </Badge>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        );
    };

    const renderWishlistContent = () => {
        if (wishlistCount === 0) {
            return (
                <EmptyState>
                    <FaHeart size={48} className="mb-3 text-secondary opacity-50" />
                    <h5>Your wishlist is empty</h5>
                    <p className="text-muted mb-4">Start adding your favorite products to your wishlist!</p>
                    <Link href="/search?searchtext=all" passHref>
                        <Button variant="dark" className="px-4 rounded-pill">Browse Products</Button>
                    </Link>
                </EmptyState>
            );
        }

        return (
            <Row className="g-4">
                {wishlistItems.map((product) => (
                    <Col md={6} lg={4} key={product.id}>
                        <Card className="h-100 border-0 shadow-sm wishlist-card">
                            <div className="position-relative">
                                <Link href={`/product/${product.handle}`}>
                                    <div className="product-img-wrapper" style={{ height: '200px', padding: '1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8f9fa' }}>
                                        <LazyImage src={product.image_url} alt={product.title} className="img-fluid" style={{ maxHeight: '100%', objectFit: 'contain' }} />
                                    </div>
                                </Link>
                                <Button
                                    variant="light"
                                    className="position-absolute top-0 end-0 m-2 rounded-circle p-2 text-danger shadow-sm border"
                                    onClick={() => removeFromWishlist(product.id)}
                                    title="Remove from wishlist"
                                >
                                    <FaTrash size={12} />
                                </Button>
                            </div>
                            <Card.Body className="d-flex flex-column">
                                <h6 className="product-title text-truncate mb-2">
                                    <Link href={`/product/${product.handle}`} className="text-dark text-decoration-none">
                                        {product.title}
                                    </Link>
                                </h6>
                                <div className="product-price mb-3">
                                    <span className="fw-bold me-2">₹{product.price}</span>
                                    {product.regular_price && product.regular_price > product.price && (
                                        <span className="text-muted small text-decoration-line-through">₹{product.regular_price}</span>
                                    )}
                                </div>
                                <div className="mt-auto">
                                    {isInCart(product.id) ? (
                                        <Button
                                            variant="outline-success"
                                            className="w-100"
                                            onClick={() => router.push('/cart')}
                                        >
                                            Go to Cart
                                        </Button>
                                    ) : (
                                        <Button
                                            variant="dark"
                                            className="w-100"
                                            onClick={() => handleAddToCart(product)}
                                        >
                                            Add to Cart
                                        </Button>
                                    )}
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>
                ))}
            </Row>
        );
    };

    const renderAddressesContent = () => {
        return (
            <>
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <SectionTitle className="mb-0">Saved Addresses</SectionTitle>
                    <Button
                        variant="dark"
                        size="sm"
                        onClick={() => {
                            setEditingAddress(null);
                            setAddressForm({ address_type: 'home', country: 'India' });
                            setShowAddressModal(true);
                        }}
                    >
                        <FaPlus className="me-2" /> Add New Address
                    </Button>
                </div>

                {loadingAddresses ? (
                    <div className="text-center py-5">
                        <Spinner animation="border" variant="secondary" />
                    </div>
                ) : addresses.length === 0 ? (
                    <EmptyState>
                        <FaMapMarkerAlt size={48} className="mb-3 text-secondary opacity-50" />
                        <h5>No saved addresses</h5>
                        <p className="text-muted mb-4">Add an address for faster checkout.</p>
                    </EmptyState>
                ) : (
                    <Row className="g-4">
                        {addresses.map((addr) => (
                            <Col md={6} key={addr.id}>
                                <Card className={`h-100 border ${addr.is_default ? 'border-primary border-2 shadow-sm' : 'border-light shadow-sm'}`}>
                                    <Card.Body>
                                        <div className="d-flex justify-content-between align-items-start mb-2">
                                            <h6 className="fw-bold mb-0">
                                                {addr.full_name}
                                                <Badge bg="info" className="ms-2 text-uppercase" style={{ fontSize: '0.6rem' }}>{addr.address_type || 'home'}</Badge>
                                                {addr.is_default && <Badge bg="primary" className="ms-2">Default</Badge>}
                                            </h6>
                                        </div>
                                        <p className="text-muted small mb-3">{addr.phone}</p>
                                        <p className="mb-1 text-dark small">
                                            {addr.house_number ? `${addr.house_number}, ` : ''}{addr.area}
                                        </p>
                                        {addr.landmark && <p className="mb-1 text-dark small">Landmark: {addr.landmark}</p>}
                                        <p className="mb-3 text-dark small">
                                            {addr.city}, {addr.state} - {addr.pincode}
                                        </p>

                                        <div className="d-flex gap-2 pt-2 border-top">
                                            <Button
                                                variant="outline-secondary"
                                                size="sm"
                                                onClick={() => {
                                                    setEditingAddress(addr);
                                                    setAddressForm(addr);
                                                    setShowAddressModal(true);
                                                }}
                                            >
                                                <FaEdit className="me-1" /> Edit
                                            </Button>
                                            <Button
                                                variant="outline-danger"
                                                size="sm"
                                                onClick={() => deleteAddress(addr.id)}
                                            >
                                                <FaTrash />
                                            </Button>
                                            {!addr.is_default && (
                                                <Button
                                                    variant="link"
                                                    size="sm"
                                                    className="ms-auto text-decoration-none"
                                                    onClick={() => setDefaultAddress(addr.id)}
                                                >
                                                    Set as Default
                                                </Button>
                                            )}
                                        </div>
                                    </Card.Body>
                                </Card>
                            </Col>
                        ))}
                    </Row>
                )}
            </>
        );
    };

    const [stuckLoading, setStuckLoading] = useState(false);

    useEffect(() => {
        if (authLoading) {
            // Safety net only. AuthContext now resolves `loading` quickly and
            // reliably (immediately on INITIAL_SESSION, or via its own 3s
            // fallback), so this never fires for a genuinely logged-in user — it
            // just prevents an indefinite spinner if auth init ever stalls.
            const timer = setTimeout(() => {
                setStuckLoading(true);
            }, 8000);
            return () => clearTimeout(timer);
        }
    }, [authLoading]);

    if (authLoading && !stuckLoading) {
        return (
            <LoadingContainer>
                <Spinner animation="border" role="status" variant="secondary">
                    <span className="visually-hidden">Loading...</span>
                </Spinner>
            </LoadingContainer>
        );
    }

    if (stuckLoading && !user) {
        // Force redirect if stuck loading and no user
        const urlParams = new URLSearchParams(window.location.search);
        const isSuccessMsg = urlParams.get('toast') === 'order_success';
        router.push(`/login?next=/profile&redirected=auth_timeout${isSuccessMsg ? '&toast=order_success' : ''}`);
        return null;
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
                                                <FaBoxOpen className="me-3" /> Purchase History
                                            </Nav.Link>
                                        </Nav.Item>
                                        <Nav.Item>
                                            <Nav.Link eventKey="wishlist" className="d-flex align-items-center">
                                                <FaHeart className="me-3" /> Wishlist
                                                {wishlistCount > 0 && <Badge bg="danger" className="ms-auto" pill>{wishlistCount}</Badge>}
                                            </Nav.Link>
                                        </Nav.Item>
                                        <Nav.Item>
                                            <Nav.Link eventKey="addresses" className="d-flex align-items-center">
                                                <FaMapMarkerAlt className="me-3" /> Address Book
                                            </Nav.Link>
                                        </Nav.Item>
                                        <Nav.Item>
                                            <Nav.Link eventKey="settings" className="d-flex align-items-center">
                                                <FaCog className="me-3" /> Profile Settings
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
                                    <SectionTitle>Purchase History</SectionTitle>
                                    {renderOrdersContent()}
                                </Tab.Pane>

                                <Tab.Pane eventKey="wishlist">
                                    <SectionTitle>My Wishlist</SectionTitle>
                                    {renderWishlistContent()}
                                </Tab.Pane>

                                <Tab.Pane eventKey="addresses">
                                    {renderAddressesContent()}
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
                                                    <Col md={12}>
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

                <StyledModal show={showAddressModal} onHide={() => setShowAddressModal(false)} centered backdrop="static">
                    <Modal.Header closeButton>
                        <Modal.Title>{editingAddress ? 'Edit Address' : 'Add New Address'}</Modal.Title>
                    </Modal.Header>
                    <Form onSubmit={handleAddressSubmit}>
                        <Modal.Body>
                            <Row className="g-3">
                                <Col md={6}>
                                    <Form.Group>
                                        <Form.Label>Full Name*</Form.Label>
                                        <Form.Control required type="text" value={addressForm.full_name || ''} onChange={e => setAddressForm({ ...addressForm, full_name: e.target.value })} />
                                    </Form.Group>
                                </Col>
                                <Col md={6}>
                                    <Form.Group>
                                        <Form.Label>Mobile Number*</Form.Label>
                                        <Form.Control required type="tel" pattern="[0-9]{10}" value={addressForm.phone || ''} onChange={e => setAddressForm({ ...addressForm, phone: e.target.value })} />
                                    </Form.Group>
                                </Col>
                                <Col md={12}>
                                    <Form.Group>
                                        <Form.Label>House No./Building Name</Form.Label>
                                        <Form.Control type="text" value={addressForm.house_number || ''} onChange={e => setAddressForm({ ...addressForm, house_number: e.target.value })} />
                                    </Form.Group>
                                </Col>
                                <Col md={12}>
                                    <Form.Group>
                                        <Form.Label>Area/Street/Village*</Form.Label>
                                        <Form.Control required type="text" value={addressForm.area || ''} onChange={e => setAddressForm({ ...addressForm, area: e.target.value })} />
                                    </Form.Group>
                                </Col>
                                <Col md={12}>
                                    <Form.Group>
                                        <Form.Label>Landmark</Form.Label>
                                        <Form.Control type="text" value={addressForm.landmark || ''} onChange={e => setAddressForm({ ...addressForm, landmark: e.target.value })} />
                                    </Form.Group>
                                </Col>
                                <Col md={6}>
                                    <Form.Group>
                                        <Form.Label>Pincode*</Form.Label>
                                        <Form.Control required type="text" pattern="[0-9]{6}" value={addressForm.pincode || ''} onChange={e => setAddressForm({ ...addressForm, pincode: e.target.value })} />
                                    </Form.Group>
                                </Col>
                                <Col md={6}>
                                    <Form.Group>
                                        <Form.Label>City/District*</Form.Label>
                                        <Form.Control required type="text" value={addressForm.city || ''} onChange={e => setAddressForm({ ...addressForm, city: e.target.value })} />
                                    </Form.Group>
                                </Col>
                                <Col md={6}>
                                    <Form.Group>
                                        <Form.Label>State*</Form.Label>
                                        <Form.Control required type="text" value={addressForm.state || ''} onChange={e => setAddressForm({ ...addressForm, state: e.target.value })} />
                                    </Form.Group>
                                </Col>
                                <Col md={6}>
                                    <Form.Group>
                                        <Form.Label>Country*</Form.Label>
                                        <Form.Control required type="text" value={addressForm.country || 'India'} onChange={e => setAddressForm({ ...addressForm, country: e.target.value })} />
                                    </Form.Group>
                                </Col>
                                <Col md={12}>
                                    <Form.Group>
                                        <Form.Label className="d-block">Address Type</Form.Label>
                                        <div className="d-flex gap-3">
                                            {['home', 'work', 'other'].map((type) => (
                                                <Form.Check
                                                    key={type}
                                                    type="radio"
                                                    label={type.charAt(0).toUpperCase() + type.slice(1)}
                                                    name="address_type"
                                                    id={`type-${type}`}
                                                    checked={addressForm.address_type === type}
                                                    onChange={() => setAddressForm({ ...addressForm, address_type: type })}
                                                />
                                            ))}
                                        </div>
                                    </Form.Group>
                                </Col>
                                {!editingAddress?.is_default && (
                                    <Col md={12}>
                                        <Form.Check
                                            type="checkbox"
                                            label="Make this my default address"
                                            checked={addressForm.is_default || false}
                                            onChange={e => setAddressForm({ ...addressForm, is_default: e.target.checked })}
                                        />
                                    </Col>
                                )}
                            </Row>
                        </Modal.Body>
                        <Modal.Footer className="border-0 pb-4 px-4 pt-0">
                            <Button variant="light" onClick={() => setShowAddressModal(false)} className="rounded-pill px-4" disabled={savingAddress}>Cancel</Button>
                            <Button variant="dark" type="submit" className="rounded-pill px-4" disabled={savingAddress}>
                                {savingAddress ? (
                                    <>
                                        <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
                                        Saving...
                                    </>
                                ) : 'Save Address'}
                            </Button>
                        </Modal.Footer>
                    </Form>
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

    .action-col {
        flex-shrink: 0;
        width: 100%;

        @media (min-width: 992px) {
            width: 160px;
        }
    }

    .buy-again-btn {
        background-color: #556b2f;
        border-color: #556b2f;
        color: #fff;

        &:hover,
        &:focus {
            background-color: #465a26;
            border-color: #465a26;
            color: #fff;
        }

        &:disabled {
            background-color: #556b2f;
            border-color: #556b2f;
            opacity: 0.65;
        }
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
        border-radius: 20px;
        border: none;
        box-shadow: 0 15px 50px rgba(0,0,0,0.15);
        overflow: hidden;
        background-color: #fff;
    }

    .modal-header {
        border-bottom: none;
        padding: 1.5rem 1.5rem 0.5rem;
        
        .modal-title {
            font-weight: 800;
            font-size: 1.5rem;
            color: #1a1a1a;
        }
    }

    .modal-body {
        padding: 1.5rem;
    }

    .form-label {
        font-size: 0.8rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        color: #718096;
        margin-bottom: 0.4rem;
    }

    .form-control {
        border: 2px solid #edf2f7;
        border-radius: 12px;
        padding: 0.75rem 1rem;
        font-size: 0.95rem;
        color: #2d3748;
        transition: all 0.2s ease-in-out;
        background-color: #f8fafc;

        &:focus {
            background-color: #fff;
            border-color: #3182ce;
            box-shadow: 0 0 0 4px rgba(49, 130, 206, 0.1);
            outline: none;
        }

        &::placeholder {
            color: #a0aec0;
        }
    }

    .form-check-input {
        cursor: pointer;
        width: 1.25rem;
        height: 1.25rem;
        margin-top: 0.15rem;
        border: 2px solid #cbd5e0;

        &:checked {
            background-color: #3182ce;
            border-color: #3182ce;
        }
    }

    .form-check-label {
        font-size: 0.9rem;
        color: #4a5568;
        padding-left: 0.5rem;
        cursor: pointer;
    }
`;
