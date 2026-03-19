"use client";

import { useDroppable } from "@dnd-kit/core";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { DropCelebration } from "../../sub_DropZone/components/DropCelebration";
import { createGridSlotDropData } from "@/lib/dnd";
import { getRankColor, isPodiumPosition } from "../../lib/rankConfig";
import { getPositionAwareSpringConfig, getFramerSpringConfig } from "../lib/physicsEngine";
import { triggerHaptic, isHapticSupported } from "../lib/hapticFeedback";
import { PositionBadge } from "../../components/PositionBadge";
import { SlotSuggestionOverlay, QuickPlaceIndicator } from "../../components/SuggestionOverlay";
import { useIndicatorAtPosition, useIsDragging as usePlacementDragging } from "@/stores/placement-store";
import { DropZoneIndicator } from "@/lib/placement/DropZoneScorer";
import { useCurrentList } from "@/stores/use-list-store";
import { CategorySlotIllustration } from "@/components/illustrations/EmptyStateIllustrations";
import { ImageFallback } from "@/components/ui/ImageFallback";
import { DURATION } from '@/lib/animations/motion-presets';

interface PhysicsGridSlotProps {
  position: number;
  gridItem: any;
  size?: "small" | "medium" | "large";
  selectedBacklogItem?: string | null;
  selectedGridItem?: string | null;
  onGridItemClick?: (id: string) => void;
  /** Item tenure in ms for resistance calculation */
  itemTenure?: number;
  /** Whether to enable physics effects */
  enablePhysics?: boolean;
  /** Whether item is being swapped */
  isSwapping?: boolean;
  /** Swap animation path if swapping */
  swapPath?: Array<{ x: number; y: number }>;
  /** Register ref for gravity well calculations */
  onRegisterSlot?: (position: number, element: HTMLElement | null) => void;
  /** Gravity well influence (0-1) for visual effect */
  gravityInfluence?: number;
  /** Optional external suggestion indicator (overrides store) */
  suggestionIndicator?: DropZoneIndicator | null;
  /** Whether to show quick-place keyboard hints */
  showQuickPlaceHint?: boolean;
  /** Quick-place keyboard shortcut for this position */
  quickPlaceShortcut?: string;
}

/**
 * PhysicsGridSlot - Enhanced grid slot with physics-based animations
 *
 * Performance optimizations:
 * - Infinite FM animations replaced with CSS @keyframes (no per-frame JS)
 * - useSpring removed; gravity glow uses a static computed value
 * - Spring config only computed when physics enabled
 * - Bounce/rotation keyframes memoized
 */
export function PhysicsGridSlot({
  position,
  gridItem,
  size = "medium",
  selectedBacklogItem,
  selectedGridItem,
  onGridItemClick,
  itemTenure = 0,
  enablePhysics = true,
  isSwapping = false,
  swapPath,
  onRegisterSlot,
  gravityInfluence = 0,
  suggestionIndicator: externalIndicator,
  showQuickPlaceHint = false,
  quickPlaceShortcut,
}: PhysicsGridSlotProps) {
  const isOccupied = gridItem?.matched;
  const slotRef = useRef<HTMLDivElement>(null);
  const currentList = useCurrentList();

  // Smart placement indicators from store
  const storeIndicator = useIndicatorAtPosition(position);
  const isPlacementDragging = usePlacementDragging();

  // Use external indicator if provided, otherwise use store
  const suggestionIndicator = externalIndicator ?? storeIndicator;

  const { setNodeRef, isOver } = useDroppable({
    id: `grid-${position}`,
    data: createGridSlotDropData(position, isOccupied, gridItem),
  });

  // Combine refs
  const combinedRef = useCallback((node: HTMLDivElement | null) => {
    setNodeRef(node);
    (slotRef as any).current = node;
    onRegisterSlot?.(position, node);
  }, [setNodeRef, onRegisterSlot, position]);

  const isSelected = selectedGridItem === gridItem?.id;
  const isTop3 = isPodiumPosition(position);
  const rankColor = getRankColor(position);

  // Physics state
  const [justDropped, setJustDropped] = useState(false);
  const [bounceCount, setBounceCount] = useState(0);
  const prevOccupiedRef = useRef(isOccupied);

  // Only compute spring config when physics is enabled
  const framerConfig = useMemo(() => {
    if (!enablePhysics) return { type: "spring" as const, duration: DURATION.fast };
    const springConfig = getPositionAwareSpringConfig(position);
    return getFramerSpringConfig(springConfig);
  }, [enablePhysics, position]);

  // Static gravity glow value (replaces useSpring which ran rAF on every slot)
  const gravityGlowPx = Math.round(gravityInfluence * 100);

  // Calculate resistance visual intensity
  const resistanceLevel = Math.min(itemTenure / 60000, 1); // Max at 1 minute

  // Trigger celebration when item becomes occupied
  useEffect(() => {
    const wasEmpty = !prevOccupiedRef.current;
    const isNowOccupied = isOccupied;

    if (wasEmpty && isNowOccupied) {
      setJustDropped(true);

      // Calculate bounce count based on position (top positions get more bounces)
      const bounces = isTop3 ? 3 : position < 10 ? 2 : 1;
      setBounceCount(bounces);

      const timer = setTimeout(() => {
        setJustDropped(false);
        setBounceCount(0);
      }, 800);

      return () => clearTimeout(timer);
    }

    prevOccupiedRef.current = isOccupied;
  }, [isOccupied, isTop3, position]);

  // Haptic feedback on hover (subtle)
  useEffect(() => {
    if (isOver && isHapticSupported()) {
      triggerHaptic('dragOver');
    }
  }, [isOver]);

  const sizeClasses = {
    small: "w-20 h-20",
    medium: "w-28 h-28",
    large: "w-36 h-36",
  };

  const handleClick = () => {
    if (isOccupied && gridItem?.id && onGridItemClick) {
      onGridItemClick(gridItem.id);
      if (isHapticSupported()) {
        triggerHaptic('buttonPress');
      }
    }
  };

  // Memoize bounce/rotation keyframes so they're only recalculated when state changes
  const bounceKeyframes = useMemo(() => {
    if (!justDropped || bounceCount === 0) return [1];

    const bounces = [];
    let amplitude = isTop3 ? 0.2 : 0.15;
    bounces.push(1);

    for (let i = 0; i < bounceCount; i++) {
      bounces.push(1 + amplitude);
      amplitude *= 0.6;
      bounces.push(1 - amplitude * 0.5);
    }

    bounces.push(1);
    return bounces;
  }, [justDropped, bounceCount, isTop3]);

  const rotationKeyframes = useMemo(() => {
    if (!justDropped || !isTop3) return [0];
    return [0, -2, 2, -1.5, 1.5, -0.5, 0.5, 0];
  }, [justDropped, isTop3]);

  return (
    <motion.div
      ref={combinedRef}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{
        opacity: 1,
        scale: justDropped ? bounceKeyframes : isOver ? 1.05 : 1,
        rotate: justDropped ? rotationKeyframes : 0,
      }}
      transition={{
        opacity: { delay: position * 0.02 },
        scale: justDropped
          ? {
            duration: DURATION.dramatic,
            ease: [0.34, 1.56, 0.64, 1],
            times: justDropped ? bounceKeyframes.map((_, i, arr) => i / (arr.length - 1)) : undefined,
          }
          : {
            ...framerConfig,
            duration: DURATION.fast,
          },
        rotate: { duration: DURATION.emphasis, ease: "easeOut" },
      }}
      onClick={handleClick}
      className={`
        ${sizeClasses[size]}
        relative rounded-card border-2 transition-colors duration-200
        ${isOver
          ? "border-blue-500 bg-blue-500/10"
          : "border-gray-700 bg-gray-800/50"
        }
        ${isOccupied ? "border-green-500" : ""}
        ${isSelected ? "border-yellow-500 ring-2 ring-yellow-500/50" : ""}
        hover:border-gray-600 hover:bg-gray-800/70
        ${isOccupied && onGridItemClick ? "cursor-pointer" : ""}
        flex flex-col items-center justify-center
      `}
      data-testid={`physics-grid-slot-${position}`}
      data-position={position}
      data-occupied={isOccupied}
      data-gravity-well={gravityInfluence > 0}
    >
      {/* Gravity Well Glow Effect - CSS animation replaces FM infinite loop */}
      {gravityInfluence > 0 && enablePhysics && (
        <div
          className="absolute inset-0 rounded-card pointer-events-none z-0 animate-gravity-glow"
          style={{
            boxShadow: `0 0 ${gravityGlowPx}px rgba(34, 211, 238, ${gravityInfluence * 0.5})`,
          }}
          data-testid="gravity-well-glow"
        />
      )}

      {/* Position Resistance Indicator */}
      {isOccupied && resistanceLevel > 0.1 && enablePhysics && (
        <div
          className="absolute -inset-1 rounded-card pointer-events-none z-0"
          style={{
            opacity: resistanceLevel * 0.3,
            border: `${1 + resistanceLevel * 2}px solid rgba(147, 51, 234, ${resistanceLevel * 0.5})`,
          }}
          data-testid="resistance-indicator"
        />
      )}

      {/* Position Number - Tier-based visual hierarchy */}
      <PositionBadge position={position} className="absolute top-1 left-1 z-10" />

      {/* Gravity Well Badge for Top 5 - CSS animation replaces FM infinite loop */}
      {position < 5 && !isOccupied && (
        <div
          className="absolute top-1 right-1 z-10 animate-gravity-badge"
          data-testid="gravity-badge"
        >
          <svg
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="3" className="text-brand-hover" fill="currentColor" opacity="0.5" />
            <circle cx="12" cy="12" r="6" className="text-brand-hover" opacity="0.3" />
            <circle cx="12" cy="12" r="9" className="text-brand-hover" opacity="0.1" />
          </svg>
        </div>
      )}

      {/* Year badge on occupied slot */}
      {isOccupied && gridItem?.item_year && (
        <span className="absolute top-1 right-1 z-20 text-3xs leading-tight font-medium text-white/90 bg-black/50 rounded-full px-1 py-px pointer-events-none">
          {gridItem.item_year_to && gridItem.item_year_to !== gridItem.item_year
            ? `${gridItem.item_year}–${gridItem.item_year_to}`
            : gridItem.item_year}
        </span>
      )}

      {/* Tags richness indicator on occupied slot */}
      {isOccupied && gridItem?.tags?.length > 0 && (
        <span
          className="absolute z-20 w-1.5 h-1.5 rounded-full bg-brand/70 pointer-events-none"
          style={gridItem?.item_year ? { top: '1.25rem', right: '0.25rem' } : { top: '0.375rem', right: '0.375rem' }}
        />
      )}

      {/* Item Content */}
      <AnimatePresence mode="wait">
        {isOccupied ? (
          <motion.div
            key={gridItem.id}
            initial={{ opacity: 0, y: -20, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.8 }}
            transition={framerConfig}
            className="w-full h-full p-1 flex flex-col items-center justify-center"
          >
            {gridItem.image_url && (
              <motion.img
                src={gridItem.image_url}
                alt={gridItem.title || ""}
                className="w-full h-full object-cover rounded"
                layoutId={`grid-item-${gridItem.backlogItemId || gridItem.id}`}
              />
            )}
            {!gridItem.image_url && (
              <ImageFallback
                title={gridItem.title || gridItem.name || "Untitled"}
                category={gridItem.category || currentList?.category}
                size="sm"
              />
            )}
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center"
          >
            {isOver ? (
              <span className="text-brand-hover text-sm font-bold animate-drop-hint">
                Drop!
              </span>
            ) : (
              <CategorySlotIllustration category={currentList?.category} />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Swap Animation Overlay */}
      {isSwapping && (
        <motion.div
          className="absolute inset-0 rounded-card pointer-events-none z-30"
          initial={{ opacity: 0 }}
          animate={{
            opacity: [0, 0.5, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{ duration: DURATION.normal }}
          style={{
            background: "radial-gradient(circle, rgba(34, 211, 238, 0.3) 0%, transparent 70%)",
            border: "2px solid rgba(34, 211, 238, 0.5)",
          }}
          data-testid="swap-overlay"
        />
      )}

      {/* Drop Celebration with physics-enhanced confetti */}
      <DropCelebration
        isActive={justDropped}
        isPodium={isTop3}
        rankColor={rankColor}
        position={position}
      />

      {/* Hover Target Zone Indicator - CSS animation replaces FM infinite loop */}
      {isOver && !isOccupied && (
        <div
          className="absolute inset-0 rounded-card pointer-events-none z-20 animate-hover-glow"
          style={{
            border: "2px dashed rgba(34, 211, 238, 0.7)",
          }}
          data-testid="hover-indicator"
        />
      )}

      {/* Smart Placement Suggestion Overlay */}
      {!isOccupied && suggestionIndicator && (
        <SlotSuggestionOverlay
          indicator={suggestionIndicator}
          isHovered={isOver}
          isDragging={isPlacementDragging}
        />
      )}

      {/* Quick-Place Keyboard Shortcut Hint */}
      {showQuickPlaceHint && quickPlaceShortcut && !isOccupied && suggestionIndicator && (
        <QuickPlaceIndicator
          position={position}
          shortcut={quickPlaceShortcut}
          confidence={suggestionIndicator.confidence}
          isActive={isOver}
        />
      )}
    </motion.div>
  );
}

export default PhysicsGridSlot;
