'use client';

/**
 * StudioLayout
 * Main layout orchestrator for the List Creation Studio feature.
 *
 * Layout phases:
 * - Initial: Centered hero input (no sidebar/grid visible)
 * - Active: Form panel + sidebar on top, full-width items grid below
 *
 * Uses NeonArenaTheme with enhanced aurora + mesh for premium feel.
 */

import { motion, AnimatePresence } from 'framer-motion';
import { DURATION } from '@/lib/animations/motion-presets';
import { StudioHeader } from './components/StudioHeader';
import { StudioFormPanel } from './components/StudioFormPanel';
import { StudioSidebar } from './components/StudioSidebar';
import { StudioItemsGrid } from './components/StudioItemsGrid';
import { NeonArenaTheme, FEATURED_ORBS } from '@/app/features/Landing/shared';
import { AudioPlayer } from '@/components/AudioPlayer';
import { useStudioItems, useStudioGeneration } from '@/stores/studio-store';

export interface StudioLayoutProps {
  headerProps?: {
    title?: string;
    subtitle?: string;
  };
}

export function StudioLayout({ headerProps }: StudioLayoutProps = {}) {
  const { generatedItems } = useStudioItems();
  const { isGenerating } = useStudioGeneration();

  const hasContent = generatedItems.length > 0 || isGenerating;

  return (
    <NeonArenaTheme
      variant="fullPage"
      config={{
        variant: 'fullPage',
        showCenterGlow: true,
        glowIntensity: 0.1,
        showGrid: true,
        showMesh: true,
        showLineAccents: true,
        orbs: FEATURED_ORBS,
        gridOpacity: 0.025,
      }}
      data-testid="studio-layout"
    >
      <StudioHeader {...headerProps} />

      <main className="max-w-7xl mx-auto px-4 pb-24">
        {/* Phase 1: Centered hero form when no content */}
        {!hasContent && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: DURATION.slow, ease: [0.23, 1, 0.32, 1] }}
            className="flex items-center justify-center min-h-[60vh]"
          >
            <div className="w-full max-w-2xl">
              <StudioFormPanel />
            </div>
          </motion.div>
        )}

        {/* Phase 2: Full layout when content exists */}
        <AnimatePresence>
          {hasContent && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: DURATION.normal }}
              className="py-6 space-y-6"
            >
              {/* Top row: Form + Sidebar */}
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
                <StudioFormPanel />
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15, duration: DURATION.normal }}
                >
                  <StudioSidebar />
                </motion.div>
              </div>

              {/* Bottom row: Full-width items grid */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25, duration: DURATION.normal }}
              >
                <StudioItemsGrid />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <AudioPlayer />
    </NeonArenaTheme>
  );
}
