"use client";

import { Suspense } from 'react';
import { StudioLayout, StudioSkeleton } from '@/app/features/Studio';

/**
 * Studio Page - List Creation Studio
 *
 * Full-page interface for creating custom ranking lists with AI-powered
 * item generation. Uses lazy loading for the main content components.
 */
export default function StudioPage() {
  return (
    <div className="min-h-screen bg-gray-950" data-testid="studio-page">
      <Suspense fallback={<StudioSkeleton />}>
        <StudioLayout />
      </Suspense>
    </div>
  );
}
