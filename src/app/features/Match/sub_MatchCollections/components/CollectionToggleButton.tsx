"use client";

import { useState, useEffect, useCallback } from "react";
import { Layers } from "lucide-react";
import { cn } from "@/lib/utils";

interface CollectionToggleButtonProps {
  isVisible: boolean;
  onToggle: () => void;
}

// Animation states for CSS-based transitions
type AnimationState = 'hidden' | 'entering' | 'visible' | 'exiting';

/**
 * Floating button to open the collection panel when hidden
 * Uses CSS animations instead of framer-motion to avoid transform-based containing blocks
 */
export function CollectionToggleButton({
  isVisible,
  onToggle,
}: CollectionToggleButtonProps) {
  // Button shows when panel is hidden
  const shouldShow = !isVisible;

  // Animation state machine
  const [animState, setAnimState] = useState<AnimationState>(
    shouldShow ? 'visible' : 'hidden'
  );

  // Handle visibility changes with animation states
  useEffect(() => {
    if (shouldShow && animState === 'hidden') {
      setAnimState('entering');
    } else if (!shouldShow && animState === 'visible') {
      setAnimState('exiting');
    }
  }, [shouldShow, animState]);

  // Handle animation end events
  const handleAnimationEnd = useCallback(() => {
    if (animState === 'entering') {
      setAnimState('visible');
    } else if (animState === 'exiting') {
      setAnimState('hidden');
    }
  }, [animState]);

  // Don't render when fully hidden
  if (animState === 'hidden') {
    return null;
  }

  return (
    <button
      onClick={onToggle}
      onAnimationEnd={handleAnimationEnd}
      aria-expanded={isVisible}
      aria-label="Open inventory panel"
      className={cn(
        // Base positioning and styles
        "fixed bottom-6 left-1/2 z-40",
        "bg-gray-900/90 dark:bg-gray-950/90 backdrop-blur-xl",
        "border border-cyan-500/30 dark:border-cyan-400/20",
        "text-cyan-400 dark:text-cyan-300",
        "px-6 py-3 rounded-full",
        "shadow-[0_0_20px_rgba(6,182,212,0.2)]",
        "hover:shadow-[0_0_30px_rgba(6,182,212,0.4)]",
        "hover:scale-105 active:scale-98",
        "flex items-center gap-2 font-bold tracking-wide",
        "transition-[transform,box-shadow] duration-200",
        // CSS animation classes
        animState === 'entering' && "animate-[toggle-btn-in_0.3s_cubic-bezier(0.34,1.56,0.64,1)_forwards]",
        animState === 'exiting' && "animate-[toggle-btn-out_0.2s_ease-in_forwards]",
        // Static transform for non-animating states (centered via -translate-x-1/2)
        (animState === 'visible') && "-translate-x-1/2"
      )}
      data-testid="open-inventory-btn"
    >
      <Layers className="w-4 h-4" />
      OPEN INVENTORY
    </button>
  );
}
