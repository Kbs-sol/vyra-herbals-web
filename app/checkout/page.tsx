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

    // IMPORTANT: do NOT conditionally swap the rendered tree based on cartItems.
    // The cart can briefly be empty during a refetch/transition, and any swap
    // here unmounts <Checkout/> and wipes the form data the user just typed.
    // Empty-cart UX is handled inside <Checkout/> (renders an empty modal/button).
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
