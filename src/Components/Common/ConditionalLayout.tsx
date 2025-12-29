'use client';

import { usePathname } from 'next/navigation';
import { Suspense } from 'react';
import Header from './Header';
import Footer from './Footer';

export default function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdminRoute = pathname?.startsWith('/admin');

  if (isAdminRoute) {
    // Admin routes - no customer header/footer
    return <>{children}</>;
  }

  // Customer routes - with header/footer
  return (
    <>
      <Suspense fallback={<div />}>
        <Header />
      </Suspense>
      {children}
      <Footer />
    </>
  );
}
