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

    // Checkout is the authentication boundary: guests browse and build a cart
    // freely, and are asked to sign in only here. This page needs its own guard
    // because it renders <Checkout show /> directly, bypassing the check inside
    // Checkout.handleCheckout that covers the "Proceed to Checkout" button.
    //
    // Waiting on `authLoading` is essential — AuthContext starts with loading:true
    // while it restores the session, so redirecting before it resolves would bounce
    // already-signed-in users to /login on a cold load.
    useEffect(() => {
        if (!authLoading && !user) {
            router.replace(`/login?next=${encodeURIComponent('/checkout')}`);
        }
    }, [authLoading, user, router]);

    if (!mounted) return null;

    // Render nothing while auth resolves or while the redirect above is in flight,
    // so a guest never sees the address form they aren't allowed to submit.
    if (authLoading || !user) return null;

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
