'use client';

import { Suspense } from 'react';
import TrackOrder from '@/Pages/TrackOrder';

export default function TrackOrderPage() {
  return (
    <Suspense fallback={<div className="text-center py-5">Loading order tracker...</div>}>
      <TrackOrder />
    </Suspense>
  );
}
