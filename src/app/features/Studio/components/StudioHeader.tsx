'use client';

/**
 * StudioHeader
 * Sticky header for the List Creation Studio with navigation and title
 */

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export interface StudioHeaderProps {
  /** Optional custom title override */
  title?: string;
  /** Optional custom subtitle override */
  subtitle?: string;
}

/**
 * StudioHeader Component
 * Provides navigation and page context for the Studio feature
 */
export function StudioHeader({
  title = 'List Creation Studio',
  subtitle = 'Create custom ranking lists with AI-powered item generation',
}: StudioHeaderProps) {
  return (
    <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-sticky">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center gap-4">
          {/* Back navigation */}
          <Link
            href="/"
            className="flex items-center justify-center w-10 h-10 rounded-lg bg-gray-800/50 hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
            aria-label="Back to home"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>

          {/* Title section */}
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-white">{title}</h1>
            <p className="text-sm text-gray-400 mt-1">{subtitle}</p>
          </div>

          {/* Right section - placeholder for future actions */}
          <div className="flex items-center gap-2">
            {/* Save/Publish buttons will be added here */}
          </div>
        </div>
      </div>
    </header>
  );
}
