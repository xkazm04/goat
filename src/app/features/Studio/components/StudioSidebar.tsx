'use client';

/**
 * StudioSidebar
 * Sidebar for list metadata configuration in the List Creation Studio
 * Contains publish controls (criteria is now in the main content tabs)
 */

import { Surface } from '@/components/visual';
import { MetadataPanel } from './MetadataPanel';

export interface StudioSidebarProps {
  /** Optional children to render instead of default content */
  children?: React.ReactNode;
}

/**
 * StudioSidebar Component
 * Renders publish controls panel.
 */
export function StudioSidebar({ children }: StudioSidebarProps) {
  return (
    <aside>
      <Surface elevation="raised" className="rounded-xl p-4">
        {children || <MetadataPanel />}
      </Surface>
    </aside>
  );
}
