"use client";

/**
 * PortalDragOverlay - Renders drag overlay via portal with direct pointer tracking
 *
 * This component solves coordinate system mismatches between:
 * - Fixed-position panels (viewport-relative)
 * - Scrollable content areas (document-relative)
 *
 * By tracking pointer position directly and rendering to document.body
 * with position:fixed, we bypass all CSS stacking/clipping/scroll issues.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { useDndMonitor } from "@dnd-kit/core";
import { PlaceholderImage } from "@/components/ui/placeholder-image";
import { useOptionalDropZoneHighlight } from "./DropZoneHighlightContext";

interface DraggableItem {
  id?: string;
  title: string;
  image_url?: string | null;
}

interface PortalDragOverlayProps {
  /** The item being dragged (null when not dragging) */
  item: DraggableItem | null;
  /** Target grid position for badge display */
  targetPosition?: number | null;
}

/**
 * Portal-based drag overlay that tracks pointer position directly
 */
export function PortalDragOverlay({ item, targetPosition }: PortalDragOverlayProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [mounted, setMounted] = useState(false);

  // Use ref for position to avoid stale closures in event handlers
  const positionRef = useRef({ x: 0, y: 0 });

  // Get optional highlight context to broadcast cursor position for magnetic glow effects
  const highlightContext = useOptionalDropZoneHighlight();
  const updateCursorPosition = highlightContext?.updateCursorPosition;

  // Ensure we only render portal on client
  useEffect(() => {
    setMounted(true);
  }, []);

  // Track pointer position directly via native events
  const handlePointerMove = useCallback((e: PointerEvent) => {
    const newPos = { x: e.clientX, y: e.clientY };
    positionRef.current = newPos;
    setPosition(newPos);
    // Broadcast to context for magnetic glow effects on drop zones
    updateCursorPosition?.(e.clientX, e.clientY);
  }, [updateCursorPosition]);

  // Monitor @dnd-kit drag state
  useDndMonitor({
    onDragStart: (event) => {
      setIsDragging(true);
      // Get initial position from the activator event
      const activatorEvent = event.activatorEvent;
      if (activatorEvent instanceof PointerEvent || activatorEvent instanceof MouseEvent) {
        const initialPos = { x: activatorEvent.clientX, y: activatorEvent.clientY };
        positionRef.current = initialPos;
        setPosition(initialPos);
        // Broadcast initial position to context
        updateCursorPosition?.(activatorEvent.clientX, activatorEvent.clientY);
      }
    },
    onDragEnd: () => {
      setIsDragging(false);
    },
    onDragCancel: () => {
      setIsDragging(false);
    },
  });

  // Add/remove pointer move listener based on drag state
  useEffect(() => {
    if (isDragging) {
      // Use pointer events for unified mouse/touch handling
      window.addEventListener("pointermove", handlePointerMove, { passive: true });
      return () => {
        window.removeEventListener("pointermove", handlePointerMove);
      };
    }
  }, [isDragging, handlePointerMove]);

  // Don't render if not mounted (SSR) or not dragging or no item
  if (!mounted || !isDragging || !item) {
    return null;
  }

  const overlayContent = (
    <div
      style={{
        position: "fixed",
        left: position.x - 40, // Center the 80px overlay
        top: position.y - 40,
        width: 80,
        height: 80,
        zIndex: 99999,
        pointerEvents: "none",
        borderRadius: 8,
        overflow: "hidden",
        boxShadow: `
          0 8px 32px rgba(0, 0, 0, 0.4),
          0 0 0 2px rgba(34, 211, 238, 0.8),
          0 0 20px rgba(34, 211, 238, 0.4)
        `,
        // Ensure no transform that could affect positioning
        transform: "none",
      }}
      data-testid="portal-drag-overlay"
    >
      {/* Image */}
      <PlaceholderImage
        src={item.image_url}
        alt={item.title}
        testId="drag-overlay-image"
        seed={item.id || item.title}
        eager={true}
        blurAmount={10}
        fallbackComponent={
          <div className="w-full h-full bg-gray-800 flex items-center justify-center">
            <span className="text-[10px] text-gray-400 text-center px-1 truncate">
              {item.title}
            </span>
          </div>
        }
      />

      {/* Target position badge */}
      {typeof targetPosition === "number" && (
        <div
          style={{
            position: "absolute",
            top: -4,
            right: -4,
            backgroundColor: "#06b6d4", // cyan-500
            color: "white",
            fontSize: 10,
            fontWeight: "bold",
            padding: "2px 6px",
            borderRadius: 6,
            boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
          }}
          data-testid="position-badge"
        >
          #{targetPosition + 1}
        </div>
      )}

      {/* Subtle glow border */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: 8,
          boxShadow: "inset 0 0 0 1px rgba(34, 211, 238, 0.3)",
          pointerEvents: "none",
        }}
      />
    </div>
  );

  // Render via portal to document.body
  return createPortal(overlayContent, document.body);
}

export default PortalDragOverlay;
