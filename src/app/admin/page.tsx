"use client";

import { Suspense } from 'react';
import { LazyMissingImagesSection, AdminContentSkeleton } from '@/app/features/Admin/LazyAdminContent';

/**
 * Admin Page - Administrative dashboard for G.O.A.T.
 *
 * Uses lazy loading for the main content since this page is accessed
 * infrequently. The admin components include heavy dependencies like
 * MasonryGrid and image processing utilities.
 */
export default function AdminPage() {
  return (
    <div className="min-h-screen bg-gray-950" data-testid="admin-page">
      {/* Header - loads immediately */}
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
          <p className="text-sm text-gray-400 mt-1">Manage and maintain the G.O.A.T. database</p>
        </div>
      </header>

      {/* Main Content - lazy loaded */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <Suspense fallback={<AdminContentSkeleton />}>
          <div className="space-y-8">
            <LazyMissingImagesSection />
          </div>
        </Suspense>
      </main>
    </div>
  );
}
