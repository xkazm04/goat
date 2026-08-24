'use client';

/**
 * StudioSidebar
 * Glass-morphism sidebar for publish controls.
 */

import { MetadataPanel } from './MetadataPanel';

export interface StudioSidebarProps {
  children?: React.ReactNode;
}

export function StudioSidebar({ children }: StudioSidebarProps) {
  return (
    <aside>
      <div
        className="rounded-container p-4 border border-white/[0.06] backdrop-blur-xl"
        style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 50%, rgba(255,255,255,0.02) 100%)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
        }}
      >
        {children || <MetadataPanel />}
      </div>
    </aside>
  );
}
