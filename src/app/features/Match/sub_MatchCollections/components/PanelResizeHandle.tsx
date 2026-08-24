"use client";

import { cn } from "@/lib/utils";

interface PanelResizeHandleProps {
  isResizing: boolean;
  isDndActive?: boolean;
  onResizeStart: (e: React.MouseEvent | React.TouchEvent) => void;
}

/**
 * Styled resize handle for the collection panel.
 * Disables itself during active DnD operations to prevent interference.
 */
export function PanelResizeHandle({ isResizing, isDndActive, onResizeStart }: PanelResizeHandleProps) {
  return (
    <div
      onMouseDown={isDndActive ? undefined : onResizeStart}
      onTouchStart={isDndActive ? undefined : onResizeStart}
      className={cn(
        "absolute -top-3 left-0 right-0 h-6 z-10",
        "flex items-center justify-center group",
        isDndActive ? "pointer-events-none" : "cursor-ns-resize",
        isResizing && 'bg-linear-to-b from-brand/10 to-transparent'
      )}
      data-testid="panel-resize-handle"
    >
      <div className={cn(
        "flex items-center gap-1 px-3 py-1 rounded-full transition-all duration-200",
        isResizing
          ? "bg-brand/20 border border-brand/30"
          : "bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/15"
      )}>
        <div className={cn(
          "w-8 h-0.5 rounded-full transition-all",
          isResizing ? "bg-brand-hover" : "bg-white/30 group-hover:bg-white/50"
        )} />
      </div>
    </div>
  );
}
