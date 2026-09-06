'use client';

import { Suspense } from 'react';
import SearchResult from '@/Pages/SearchResult';

export const dynamic = 'force-dynamic';

export default function SearchPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SearchResult />
    </Suspense>
  );
}
