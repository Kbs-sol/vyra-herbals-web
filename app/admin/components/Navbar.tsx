'use client';

import React from 'react';

interface NavbarProps {
  toggleSidebar: () => void;
  pageTitle?: string;
}

export default function AdminNavbar({ toggleSidebar, pageTitle = 'Dashboard' }: NavbarProps) {
  return (
    <header className="admin-navbar">
      <div className="navbar-left">
        <button className="menu-toggle" onClick={toggleSidebar} aria-label="Toggle menu">
          <svg viewBox="0 0 24 24" fill="none" width="24" height="24">
            <path d="M3 12H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M3 6H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M3 18H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <h1 className="page-title">{pageTitle}</h1>
      </div>

      <div className="navbar-right"></div>

      <style jsx>{`
        .admin-navbar {
          position: fixed;
          top: 0;
          right: 0;
          left: 280px;
          height: 72px;
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 32px;
          border-bottom: 1px solid rgba(229, 231, 235, 0.8);
          z-index: 100;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        @media (max-width: 1024px) {
          .admin-navbar {
            left: 0;
          }
        }

        .navbar-left {
          display: flex;
          align-items: center;
          gap: 20px;
        }

        .menu-toggle {
          display: none;
          background: none;
          border: none;
          color: #6b7280;
          cursor: pointer;
          padding: 10px;
          border-radius: 10px;
          transition: all 0.2s;
        }

        .menu-toggle:hover {
          background: #f9fafb;
          color: #1f2937;
        }

        @media (max-width: 1024px) {
          .menu-toggle {
            display: block;
          }
        }

        .page-title {
          font-size: 22px;
          font-weight: 700;
          color: #1f2937;
          margin: 0;
          letter-spacing: -0.5px;
        }

        .navbar-right {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        @media (max-width: 640px) {
          .admin-navbar {
            padding: 0 16px;
            height: 64px;
          }

          .page-title {
            font-size: 18px;
          }
        }
      `}</style>
    </header>
  );
}
