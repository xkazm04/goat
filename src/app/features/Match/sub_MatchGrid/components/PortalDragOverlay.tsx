"use client";

/**
 * PortalDragOverlay - Renders drag overlay via portal with direct pointer tracking
 *
 * Performance: Position updates bypass React entirely by writing
 * transform directly to the DOM element via ref. React only re-renders
 * for isDragging/item identity changes, never for coordinates.
 */

import { useDndMonitor } from "@dnd-kit/core";
import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";

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
  const [mounted, setMounted] = useState(false);

  // DOM ref for direct transform manipulation — bypasses React reconciliation
  const overlayRef = useRef<HTMLDivElement>(null);
  const positionRef = useRef({ x: 0, y: 0 });
  const rafRef = useRef<number>(0);

  // Get optional highlight context to broadcast cursor position for magnetic glow effects
  const highlightContext = useOptionalDropZoneHighlight();
  const updateCursorPosition = highlightContext?.updateCursorPosition;

  // Ensure we only render portal on client
  useEffect(() => {
    setMounted(true);
  }, []);

  // Apply position to DOM element directly via CSS transform
  const applyPosition = useCallback((x: number, y: number) => {
    const el = overlayRef.current;
    if (el) {
      // translate3d triggers GPU compositing — offset by 40px to center the 80px overlay
      el.style.transform = `translate3d(${x - 40}px, ${y - 40}px, 0)`;
    }
  }, []);

  // Track pointer position directly via native events, throttled to rAF
  const handlePointerMove = useCallback((e: PointerEvent) => {
    positionRef.current = { x: e.clientX, y: e.clientY };

    if (!rafRef.current) {
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = 0;
        const pos = positionRef.current;
        applyPosition(pos.x, pos.y);
        updateCursorPosition?.(pos.x, pos.y);
      });
    }
  }, [applyPosition, updateCursorPosition]);

  // Monitor @dnd-kit drag state
  useDndMonitor({
    onDragStart: (event) => {
      setIsDragging(true);
      // Get initial position from the activator event
      const activatorEvent = event.activatorEvent;
      if (activatorEvent instanceof PointerEvent || activatorEvent instanceof MouseEvent) {
        positionRef.current = { x: activatorEvent.clientX, y: activatorEvent.clientY };
        // Apply initial position on next frame after React renders the overlay element
        requestAnimationFrame(() => {
          applyPosition(activatorEvent.clientX, activatorEvent.clientY);
        });
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
        if (rafRef.current) {
          cancelAnimationFrame(rafRef.current);
          rafRef.current = 0;
        }
      };
    }
  }, [isDragging, handlePointerMove]);

  // Don't render if not mounted (SSR) or not dragging or no item
  if (!mounted || !isDragging || !item) {
    return null;
  }

  const overlayContent = (
    <div
      ref={overlayRef}
      style={{
        position: "fixed",
        left: 0,
        top: 0,
        width: 80,
        height: 80,
        zIndex: 99999,
        pointerEvents: "none",
        borderRadius: 8,
        overflow: "hidden",
        boxShadow: `
          var(--elevation-modal),
          0 0 0 2px rgba(34, 211, 238, 0.8),
          var(--glow-brand-lg)
        `,
        // will-change hints the browser to promote to its own compositor layer
        willChange: "transform",
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
            <span className="text-2xs text-gray-400 text-center px-1 truncate">
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
            backgroundColor: "#06b6d4", // brand
            color: "white",
            fontSize: 10,
            fontWeight: "bold",
            padding: "2px 6px",
            borderRadius: 6,
            boxShadow: "var(--elevation-card)",
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
