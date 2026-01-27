'use client';

/**
 * StudioSidebar
 * Sidebar for list metadata configuration in the List Creation Studio
 */

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
    <aside className="space-y-4">
      {children || <MetadataPanel />}
    </aside>
  );
}
