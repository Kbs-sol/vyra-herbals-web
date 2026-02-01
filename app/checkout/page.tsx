'use client';

import React, { useEffect, useState } from 'react';
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
