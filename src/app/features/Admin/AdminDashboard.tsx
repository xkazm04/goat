"use client";

import { MissingImagesSection } from './MissingImagesSection';

/**
 * Admin Dashboard - Main admin interface
 */
export function AdminDashboard() {
  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
          <p className="text-sm text-gray-400 mt-1">Manage and maintain the G.O.A.T. database</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="space-y-8">
          {/* Missing Images Section */}
          <MissingImagesSection />
        </div>
      </main>
    </div>
  );
}
