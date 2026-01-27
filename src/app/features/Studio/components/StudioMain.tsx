'use client';

/**
 * StudioMain
 * Main content area for the List Creation Studio
 * Placeholder for future AI generation UI
 */

import { Sparkles } from 'lucide-react';
import { ContainerProvider } from '@/lib/layout/ContainerProvider';

export interface StudioMainProps {
  /** Optional children to render instead of placeholder */
  children?: React.ReactNode;
}

/**
 * StudioMain Component
 * Wraps content in ContainerProvider for component-level responsiveness.
 * Currently displays placeholder content for the AI generation UI.
 */
export function StudioMain({ children }: StudioMainProps) {
  return (
    <ContainerProvider name="studio-main" className="flex-1">
      <div className="@container">
        {children || <StudioMainPlaceholder />}
      </div>
    </ContainerProvider>
  );
}

/**
 * Placeholder content for the main studio area
 */
function StudioMainPlaceholder() {
  return (
    <div className="min-h-[400px] flex items-center justify-center bg-gray-900/50 border border-gray-800 rounded-xl">
      <div className="text-center px-6 py-12">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-gray-700/50 mb-6">
          <Sparkles className="w-8 h-8 text-cyan-400" />
        </div>
        <h2 className="text-xl font-semibold text-white mb-2">
          Create Your List
        </h2>
        <p className="text-gray-400 max-w-md">
          Enter a topic to generate items with AI, or add items manually
        </p>
      </div>
    </div>
  );
}
