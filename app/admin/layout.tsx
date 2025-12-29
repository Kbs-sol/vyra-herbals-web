import { AdminAuthProvider } from './contexts/AdminAuthContext';

export const metadata = {
  title: 'Admin Panel | Vyra Herbals',
  description: 'Vyra Herbals Admin Dashboard - Manage products, orders, reviews, and more.',
  robots: 'noindex, nofollow',
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminAuthProvider>
      {children}
    </AdminAuthProvider>
  );
}
