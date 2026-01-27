'use client';

/**
 * StudioLayout
 * Main layout orchestrator for the List Creation Studio feature
 * Composes header, main content, and sidebar into a responsive grid
 * with premium visual styling matching the match interface
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
 * Premium visual design with:
 * - Radial gradient background
 * - Grid line pattern overlay
 * - Glow accents
 */
export function StudioLayout({
  headerProps,
  mainContent,
  sidebarContent,
}: StudioLayoutProps = {}) {
  return (
    <div
      className="min-h-screen relative overflow-hidden"
      style={{
        background: `
          radial-gradient(ellipse 80% 50% at 50% -20%, rgba(6, 182, 212, 0.15), transparent),
          radial-gradient(ellipse 60% 40% at 80% 100%, rgba(139, 92, 246, 0.1), transparent),
          linear-gradient(to bottom, #030712, #0a0a0f)
        `,
      }}
      data-testid="studio-layout"
    >
      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(0deg, transparent 24%, rgba(34, 211, 238, 0.3) 25%, rgba(34, 211, 238, 0.3) 26%, transparent 27%, transparent 74%, rgba(34, 211, 238, 0.3) 75%, rgba(34, 211, 238, 0.3) 76%, transparent 77%),
            linear-gradient(90deg, transparent 24%, rgba(34, 211, 238, 0.3) 25%, rgba(34, 211, 238, 0.3) 26%, transparent 27%, transparent 74%, rgba(34, 211, 238, 0.3) 75%, rgba(34, 211, 238, 0.3) 76%, transparent 77%)
          `,
          backgroundSize: '60px 60px',
        }}
      />

      {/* Top glow accent */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(6, 182, 212, 0.08) 0%, transparent 70%)',
        }}
      />

      {/* Content */}
      <div className="relative z-10">
        <StudioHeader {...headerProps} />

        <main className="max-w-7xl mx-auto px-6 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
            <StudioMain>{mainContent}</StudioMain>
            <StudioSidebar>{sidebarContent}</StudioSidebar>
          </div>
        </main>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-gray-950 to-transparent pointer-events-none" />
    </div>
  );
}
