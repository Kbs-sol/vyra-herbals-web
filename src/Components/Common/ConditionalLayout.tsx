'use client';

import { usePathname } from 'next/navigation';
import { Suspense } from 'react';
import Header from './Header';
import Footer from './Footer';
import PendingTxnReconciler from './PendingTxnReconciler';

export default function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdminRoute = pathname?.startsWith('/admin');

  // Avoid rendering header/footer until pathname is available on the client
  // Also suppress header/footer for admin routes
  if (isAdminRoute || !pathname) {
    // Admin routes or unknown pathname - no customer header/footer
    return <>{children}</>;
  }

  // Customer routes - with header/footer
  return (
    <>
      <Suspense fallback={<div />}>
        <Header />
      </Suspense>
      <PendingTxnReconciler />
      {children}
      <Footer />
    </>
  );
}
