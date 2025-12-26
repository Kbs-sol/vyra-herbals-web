'use client';

import Singleproducts from '@/Pages/Singleproducts';

export const dynamic = 'force-dynamic';

export default async function ProductPage({ params }) {
  return <Singleproducts />;
}
