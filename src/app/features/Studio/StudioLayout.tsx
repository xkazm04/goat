'use client';

/**
 * StudioLayout
 * Main layout orchestrator for the List Creation Studio feature
 * Composes header, main content, and sidebar into a responsive grid
 * Uses NeonArenaTheme for consistent visual styling with landing page
 */

import { StudioHeader } from './components/StudioHeader';
import { StudioMain } from './components/StudioMain';
import { StudioSidebar } from './components/StudioSidebar';
import { NeonArenaTheme, SECTION_ORBS } from '@/app/features/Landing/shared';

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
 * Uses NeonArenaTheme for consistent visual design matching landing page
 */
export function StudioLayout({
  headerProps,
  mainContent,
  sidebarContent,
}: StudioLayoutProps = {}) {
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

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
          <StudioMain>{mainContent}</StudioMain>
          <StudioSidebar>{sidebarContent}</StudioSidebar>
        </div>
      </main>
    </NeonArenaTheme>
  );
}
