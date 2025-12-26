'use client';

import Orders from '@/Pages/Orders';

export const dynamic = 'force-dynamic';

export default async function OrderPage({ params }) {
  return <Orders />;
}
