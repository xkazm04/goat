'use client';

/**
 * StudioLayout
 * Main layout orchestrator for the List Creation Studio feature
 * Layout: Form + Sidebar on top, Full-width items grid below
 * Uses NeonArenaTheme for consistent visual styling with landing page
 */

import { StudioHeader } from './components/StudioHeader';
import { StudioFormPanel } from './components/StudioFormPanel';
import { StudioSidebar } from './components/StudioSidebar';
import { StudioItemsGrid } from './components/StudioItemsGrid';
import { NeonArenaTheme, SECTION_ORBS } from '@/app/features/Landing/shared';
import { AudioPlayer } from '@/components/AudioPlayer';

export interface StudioLayoutProps {
  /** Optional header props override */
  headerProps?: {
    title?: string;
    subtitle?: string;
  };
}

/**
 * StudioLayout Component
 * Layout structure:
 * - Header
 * - Top row: Form panel (left) + Sidebar (right)
 * - Bottom row: Full-width items grid
 */
export function StudioLayout({ headerProps }: StudioLayoutProps = {}) {
  return (
    <NeonArenaTheme
      variant="fullPage"
      config={{
        variant: 'fullPage',
        showCenterGlow: true,
        glowIntensity: 0.12,
        showGrid: true,
        showMesh: false,
        showLineAccents: true,
        orbs: SECTION_ORBS,
        gridOpacity: 0.03,
      }}
      data-testid="studio-layout"
    >
      <StudioHeader {...headerProps} />

      <main className="max-w-7xl mx-auto px-4 py-6 pb-24 space-y-6">
        {/* Top row: Form + Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
          <StudioFormPanel />
          <StudioSidebar />
        </div>

        {/* Bottom row: Full-width items grid */}
        <StudioItemsGrid />
      </main>

      {/* Audio Player for Music category */}
      <AudioPlayer />
    </NeonArenaTheme>
  );
}
