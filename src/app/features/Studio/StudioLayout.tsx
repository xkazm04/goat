'use client';

/**
 * StudioLayout
 * Main layout orchestrator for the List Creation Studio feature
 * Composes header, main content, and sidebar into a responsive grid
 */

import { StudioHeader } from './components/StudioHeader';
import { StudioMain } from './components/StudioMain';
import { StudioSidebar } from './components/StudioSidebar';

export interface StudioLayoutProps {
  /** Optional header props override */
  headerProps?: {
    title?: string;
    subtitle?: string;
  };
  /** Optional custom main content */
  mainContent?: React.ReactNode;
  /** Optional custom sidebar content */
  sidebarContent?: React.ReactNode;
}

/**
 * StudioLayout Component
 * Orchestrates the studio page layout with:
 * - Sticky header with navigation
 * - Main content area (for AI generation UI)
 * - Sidebar (for list metadata configuration)
 *
 * Responsive behavior:
 * - Mobile: sidebar stacks below main content (grid-cols-1)
 * - Desktop: sidebar beside main content (lg:grid-cols-[1fr_300px])
 */
export function StudioLayout({
  headerProps,
  mainContent,
  sidebarContent,
}: StudioLayoutProps = {}) {
  return (
    <div className="min-h-screen bg-gray-950" data-testid="studio-layout">
      <StudioHeader {...headerProps} />

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8">
          <StudioMain>{mainContent}</StudioMain>
          <StudioSidebar>{sidebarContent}</StudioSidebar>
        </div>
      </main>
    </div>
  );
}
