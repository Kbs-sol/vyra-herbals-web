'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAdminAuth } from '../contexts/AdminAuthContext';
import AdminSidebar from './Sidebar';
import AdminNavbar from './Navbar';

interface AdminLayoutWrapperProps {
  children: React.ReactNode;
  pageTitle?: string;
}

export default function AdminLayoutWrapper({ children, pageTitle = 'Dashboard' }: AdminLayoutWrapperProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isAuthenticated, isLoading } = useAdminAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !isAuthenticated && pathname !== '/admin/login') {
      router.push('/admin/login');
    }
  }, [isAuthenticated, isLoading, pathname, router]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="admin-loading">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading...</p>
        </div>
        <style jsx>{`
          .admin-loading {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #f3f4f6;
          }
          .loading-spinner {
            text-align: center;
          }
          .spinner {
            width: 48px;
            height: 48px;
            border: 4px solid #e5e7eb;
            border-top-color: #10b981;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 16px;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
          .loading-spinner p {
            color: #6b7280;
            font-size: 14px;
          }
        `}</style>
      </div>
    );
  }

  // If on login page, just render children
  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  // If not authenticated, don't render (will redirect)
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="admin-layout">
      <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <AdminNavbar toggleSidebar={() => setSidebarOpen(!sidebarOpen)} pageTitle={pageTitle} />
      
      <main className="admin-main">
        {children}
      </main>

      <style jsx>{`
        .admin-layout {
          min-height: 100vh;
          background: #f8f9fa;
        }

        .admin-main {
          margin-left: 280px;
          padding: 88px 32px 32px;
          min-height: 100vh;
        }

        @media (max-width: 1024px) {
          .admin-main {
            margin-left: 0;
          }
        }

        @media (max-width: 640px) {
          .admin-main {
            padding: 80px 16px 16px;
          }
        }
      `}</style>
    </div>
  );
}
