'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Checkout from '@/PageComponents/Checkout';
import { useCart } from '@/Components/Contexts/CartContext';

const CheckoutPage = () => {
    const router = useRouter();
    const { cartItems } = useCart();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null;

    const hasItems = (cartItems || []).some((i: any) => i?.price);

    if (!hasItems) {
        return (
            <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f4f6f8', padding: '24px' }}>
                <div style={{ textAlign: 'center', maxWidth: '480px' }}>
                    <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px', color: '#1f2937' }}>Your cart is empty</h2>
                    <p style={{ color: '#6b7280', marginBottom: '20px' }}>Add some products to your cart before proceeding to checkout.</p>
                    <Link href="/" style={{ display: 'inline-block', padding: '10px 24px', background: '#704a0d', color: '#fff', borderRadius: '6px', fontWeight: 600, textDecoration: 'none' }}>
                        Continue Shopping
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', background: '#f4f6f8' }}>
            <Checkout
                show={true}
                onHide={() => router.push('/cart')}
                cartItems={cartItems}
                product={null}
            />
        </div>
    );
};

export default CheckoutPage;
