'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Checkout from '@/PageComponents/Checkout';
import { useCart } from '@/Components/Contexts/CartContext';
import { useAuth } from '@/Components/Contexts/AuthContext';

const CheckoutPage = () => {
    const router = useRouter();
    const { cartItems } = useCart();
    const { user, loading: authLoading } = useAuth();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Checkout uses OTPModal for auth. We no longer redirect to /login here.
    // However, if the page mounts and there's no user, we might want to pop up the OTP modal instantly.
    // The Checkout component handles its own display logic.
    useEffect(() => {
        // Nothing needed here anymore; OTPModal is triggered when they interact.
    }, [authLoading, user, router]);

    if (!mounted) return null;

    // Render while auth resolves so a guest sees the checkout UI (which might pop OTP)
    if (authLoading) return null;

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
