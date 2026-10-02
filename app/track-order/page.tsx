'use client';

import { Suspense } from 'react';
import TrackOrder from '@/Pages/TrackOrder';

export default function TrackOrderPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>}>
      <TrackOrder />
    </Suspense>
  );
}
