'use client';

/**
 * StudioSidebar
 * Sidebar for list metadata configuration in the List Creation Studio
 */

import { Surface } from '@/components/visual';
import { MetadataPanel } from './MetadataPanel';

export interface StudioSidebarProps {
  /** Optional children to render instead of default content */
  children?: React.ReactNode;
}

/**
 * StudioSidebar Component
 * Renders the metadata configuration panel for the list.
 */
export function StudioSidebar({ children }: StudioSidebarProps) {
  return (
    <aside>
      <Surface elevation="raised" className="rounded-xl p-4 space-y-4">
        {children || <MetadataPanel />}
      </Surface>
    </aside>
  );
}
