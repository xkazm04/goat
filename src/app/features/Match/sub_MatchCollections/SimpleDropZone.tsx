"use client";

import { useDraggable, useDroppable } from "@dnd-kit/core";
import { GridItemType } from "@/types/match";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useState, useEffect, useRef, useMemo } from "react";
import { ProgressiveImage } from "@/components/ui/progressive-image";
import { DropCelebration } from "./components/DropCelebration";
import { useOptionalDropZoneHighlight } from "../sub_MatchGrid/components/DropZoneHighlightContext";
import { createGridDragData, createGridSlotDropData } from "@/lib/dnd";
import { getRankConfig, isPodiumPosition } from "../lib/rankConfig";
import { GradientBorder, Shimmer, Glow, GRADIENT_PRESETS } from '@/components/visual';

// Constants for magnetic snap effect
const MAGNETIC_THRESHOLD = 120; // pixels from center to activate magnetism
const MAGNETIC_STRENGTH_MIN = 0.3;
const MAGNETIC_STRENGTH_MAX = 0.7;

// Medal styling helper for positions 0-2
function getMedalGradient(position: number): 'gold' | 'silver' | 'bronze' | null {
  if (position === 0) return 'gold';
  if (position === 1) return 'silver';
  if (position === 2) return 'bronze';
  return null;
}

// Medal color hints for empty slots (very subtle)
const MEDAL_HINT_COLORS = {
  gold: 'rgba(250, 204, 21, 0.06)',    // yellow-400 at 6%
  silver: 'rgba(203, 213, 225, 0.06)', // slate-300 at 6%
  bronze: 'rgba(251, 146, 60, 0.06)',  // orange-400 at 6%
} as const;

interface SimpleDropZoneProps {
  position: number;
  isOccupied: boolean;
  occupiedBy?: string;
  imageUrl?: string | null;
  gridItem?: GridItemType;
  onRemove?: () => void;
  dropId?: string;
  /** Optional tier accent color (overrides default rank color) */
  tierAccent?: string;
  /** Optional tier glow color */
  tierGlow?: string;
  /** Whether to show position badge */
  showBadge?: boolean;
}

/**
 * "Holo-slot" Drop Zone
 * A futuristic, glass-morphic drop zone with neon accents and dynamic states.
 * - Image covers the whole card
 * - Rank number overlay on top of the image
 * - Title displayed below the card with animation
 */
export function SimpleDropZone({
  position,
  isOccupied,
  occupiedBy,
  imageUrl,
  gridItem,
  onRemove,
  dropId,
  tierAccent,
  tierGlow,
  showBadge = true,
}: SimpleDropZoneProps) {
  // Get rank styling config early (needed for magnetic physics registration)
  const rankConfig = getRankConfig(position);
  const isTop3 = isPodiumPosition(position);

  // Track when item was just dropped for snap animation
  const [justDropped, setJustDropped] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const prevOccupiedRef = useRef(isOccupied);
  const containerRef = useRef<HTMLDivElement>(null);

  // Get optional highlight context for global drag state
  const highlightContext = useOptionalDropZoneHighlight();
  const isGlobalDragging = highlightContext?.dragState.isDragging ?? false;
  const hoveredPosition = highlightContext?.dragState.hoveredPosition;
  const cursorPosition = highlightContext?.dragState.cursorPosition ?? { x: 0, y: 0 };

  // Extract stable callback references from context
  const registerDropZone = highlightContext?.registerDropZone;
  const unregisterDropZone = highlightContext?.unregisterDropZone;

  // Register this drop zone with the highlight context
  useEffect(() => {
    if (!registerDropZone || !unregisterDropZone || !containerRef.current) return;

    const element = containerRef.current;
    registerDropZone(position, element);

    // Update position on resize
    const resizeObserver = new ResizeObserver(() => {
      registerDropZone(position, element);
    });
    resizeObserver.observe(element);

    return () => {
      resizeObserver.disconnect();
      unregisterDropZone(position);
    };
  }, [position, registerDropZone, unregisterDropZone]);

  // Make occupied items draggable for swapping
  const { attributes, listeners, setNodeRef: setDragNodeRef, transform, isDragging } = useDraggable({
    id: gridItem?.id || `empty-${dropId || position}`,
    disabled: !isOccupied || !gridItem,
    data: gridItem ? createGridDragData(gridItem) : undefined
  });

  // Always accept drops
  const { isOver, setNodeRef: setDropNodeRef } = useDroppable({
    id: dropId || `drop-${position}`,
    data: createGridSlotDropData(position, isOccupied, gridItem)
  });

  // Trigger bounce animation and celebration when item becomes occupied
  useEffect(() => {
    // Only trigger celebration when transitioning from empty to occupied
    const wasEmpty = !prevOccupiedRef.current;
    const isNowOccupied = isOccupied && !isDragging;

    if (wasEmpty && isNowOccupied) {
      setJustDropped(true);
      setShowCelebration(true);

      const bounceTimer = setTimeout(() => setJustDropped(false), 600);
      const celebrationTimer = setTimeout(() => setShowCelebration(false), 1200);

      return () => {
        clearTimeout(bounceTimer);
        clearTimeout(celebrationTimer);
      };
    }

    prevOccupiedRef.current = isOccupied;
  }, [isOccupied, isDragging]);

  // Combine refs
  const setNodeRef = (node: HTMLElement | null) => {
    setDragNodeRef(node);
    setDropNodeRef(node);
  };

  // Use tier accent color if provided, otherwise fall back to rank config
  const accentColor = tierAccent || rankConfig.color;
  const glowColor = tierGlow || `${accentColor}40`;

  // Apply drag transform
  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0) scale(1.05)`,
    zIndex: 100,
  } : undefined;

  // Determine if this slot should show the "valid drop zone" highlight
  const showValidDropZoneHighlight = isGlobalDragging && !isOccupied && !isDragging;

  // Determine if this filled slot should be dimmed during drag
  const shouldDimFilledSlot = isGlobalDragging && isOccupied && !isDragging;

  // Calculate magnetic strength based on cursor proximity to this drop zone
  const magneticStrength = useMemo(() => {
    if (!isGlobalDragging || !showValidDropZoneHighlight || !containerRef.current) {
      return 0;
    }

    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = cursorPosition.x - centerX;
    const dy = cursorPosition.y - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance >= MAGNETIC_THRESHOLD) {
      return 0;
    }

    // Calculate strength: closer = stronger (0.3 to 0.7 range)
    const normalizedDistance = distance / MAGNETIC_THRESHOLD;
    const strength = MAGNETIC_STRENGTH_MIN + (1 - normalizedDistance) * (MAGNETIC_STRENGTH_MAX - MAGNETIC_STRENGTH_MIN);
    return Math.min(MAGNETIC_STRENGTH_MAX, Math.max(MAGNETIC_STRENGTH_MIN, strength));
  }, [isGlobalDragging, showValidDropZoneHighlight, cursorPosition.x, cursorPosition.y]);

  // Check if this drop zone is in magnetic range
  const isInMagneticRange = magneticStrength > 0;

  return (
    <div
      ref={containerRef}
      className="flex flex-col"
      data-testid={`drop-zone-wrapper-${position}`}
    >
      {/* Card Container */}
      <motion.div
        ref={setNodeRef}
        style={{
          ...style,
          // Medal color hint for empty medal slots
          ...((!isOccupied && getMedalGradient(position)) && {
            backgroundColor: MEDAL_HINT_COLORS[getMedalGradient(position)!],
          }),
        } as React.CSSProperties}
        initial={false}
        animate={{
          scale: justDropped
            ? (isTop3
              ? [1, 1.2, 0.92, 1.08, 0.98, 1.02, 1] // More dramatic bounce for podium
              : [1, 1.15, 0.95, 1.02, 1])
            : isOver ? 1.08 : showValidDropZoneHighlight ? 1.05 : 1, // Enhanced scale-105 for valid drop zones
          borderColor: isOver ? accentColor : isOccupied ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)',
          rotate: justDropped && isTop3 ? [0, -2, 2, -1, 1, 0] : 0,
          opacity: shouldDimFilledSlot ? 0.6 : 1, // Dim filled positions during drag
        }}
        transition={{
          scale: justDropped
            ? {
              duration: isTop3 ? 0.8 : 0.6, // Longer animation for podium
              ease: [0.34, 1.56, 0.64, 1], // Spring-like easing
            }
            : { duration: 0.2 },
          rotate: justDropped && isTop3
            ? {
              duration: 0.6,
              ease: "easeOut",
            }
            : { duration: 0 },
          opacity: { duration: 0.3, ease: "easeOut" },
        }}
        className={`
          relative aspect-[4/5] rounded-xl overflow-hidden group
          border-2 transition-colors duration-300
          ${isOccupied ? 'bg-gray-900/80' : 'bg-gray-900/20'}
          ${!isOccupied && 'shadow-[inset_0_2px_8px_rgba(0,0,0,0.3)]'}
          ${isOver ? `shadow-[0_0_30px_${accentColor}40]` : ''}
        `}
        data-testid={`drop-zone-${position}`}
        {...(isOccupied ? attributes : {})}
        {...(isOccupied ? listeners : {})}
      >
      {/* Valid Drop Zone Indicator - Static cyan glow for empty slots during drag (no infinite animation) */}
      <AnimatePresence>
        {showValidDropZoneHighlight && (
          <motion.div
            className="absolute -inset-[2px] rounded-xl pointer-events-none z-40"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 0.7, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            style={{
              border: '2px solid rgb(34, 211, 238)', // cyan-400
              boxShadow: `
                0 0 15px rgba(6, 182, 212, 0.4),
                0 0 30px rgba(6, 182, 212, 0.2),
                inset 0 0 10px rgba(6, 182, 212, 0.1)
              `,
            }}
            data-testid={`valid-drop-zone-indicator-${position}`}
          />
        )}
      </AnimatePresence>

      {/* Magnetic Snap Glow Aura - Intensifies as cursor gets closer */}
      <AnimatePresence>
        {isInMagneticRange && (
          <motion.div
            className="absolute -inset-[4px] rounded-xl pointer-events-none z-50"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{
              opacity: magneticStrength,
              scale: 1 + magneticStrength * 0.05,
            }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{
              duration: 0.15,
              ease: "easeOut",
            }}
            style={{
              // Box shadow intensity scales with magnetic strength (30% to 60%)
              // Using cyan (22, 211, 238) for neon arena theme
              boxShadow: `
                0 0 ${15 + magneticStrength * 25}px rgba(22, 211, 238, ${0.3 + magneticStrength * 0.3}),
                0 0 ${30 + magneticStrength * 40}px rgba(22, 211, 238, ${0.2 + magneticStrength * 0.2}),
                inset 0 0 ${10 + magneticStrength * 15}px rgba(22, 211, 238, ${0.1 + magneticStrength * 0.15})
              `,
              border: `2px solid rgba(22, 211, 238, ${0.4 + magneticStrength * 0.4})`,
            }}
            data-testid={`magnetic-glow-${position}`}
          />
        )}
      </AnimatePresence>
      {/* Background Grid Pattern (Holo Effect) */}
      {!isOccupied && (
        <div className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `radial-gradient(${accentColor} 1px, transparent 1px)`,
            backgroundSize: '10px 10px'
          }}
        />
      )}

      {/* Rank Number Background */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
        <span
          className="text-[6rem] font-black select-none transition-all duration-500"
          style={{
            color: accentColor,
            opacity: isOver ? 0.2 : isOccupied ? 0 : 0.15,
            transform: isOver ? 'scale(1.2)' : 'scale(1)'
          }}
        >
          {position + 1}
        </span>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {isOccupied && occupiedBy ? (
          <motion.div
            key="content"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="absolute inset-0"
          >
            {/* Image - Full coverage using ProgressiveImage with wiki fallback */}
            <motion.div 
              className="absolute inset-0"
              initial={{ scale: 1.1 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            >
              <ProgressiveImage
                src={imageUrl}
                alt={occupiedBy || 'Item'}
                itemTitle={occupiedBy}
                autoFetchWiki={true}
                testId={`drop-zone-image-${position}`}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                fallbackComponent={
                  <div className="w-full h-full bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
                    <span className="text-xs text-gray-500 text-center px-2">{occupiedBy}</span>
                  </div>
                }
              />
              {/* Subtle gradient overlay for number visibility */}
              <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/20 pointer-events-none" />
            </motion.div>

            {/* Rank Number Overlay - Top center, above the image */}
            {showBadge && (
              <motion.div
                className="absolute top-2 left-1/2 -translate-x-1/2 z-20"
                initial={{ opacity: 0, y: -10, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: 0.1, duration: 0.3, type: "spring", stiffness: 300 }}
              >
                <div
                  className="px-3 py-1 rounded-lg backdrop-blur-md border flex items-center gap-1.5 shadow-lg"
                  style={{
                    backgroundColor: `${accentColor}25`,
                    borderColor: `${accentColor}50`,
                    boxShadow: `0 0 15px ${accentColor}30`
                  }}
                >
                  {isTop3 && rankConfig.icon && (
                    <rankConfig.icon
                      className="w-4 h-4"
                      style={{ color: accentColor }}
                    />
                  )}
                  <span
                    className="text-sm font-black tracking-wide"
                    style={{ color: accentColor }}
                  >
                    {position + 1}
                  </span>
                </div>
              </motion.div>
            )}

            {/* Remove Button (Top Right) */}
            {onRemove && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                whileHover={{ scale: 1.1, backgroundColor: 'rgba(239, 68, 68, 0.3)' }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove();
                }}
                className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 text-white/70 hover:text-red-400 backdrop-blur-md border border-white/20 z-30 opacity-0 group-hover:opacity-100 transition-opacity"
                data-testid={`remove-item-btn-${position}`}
              >
                <X className="w-3 h-3" />
              </motion.button>
            )}

            {/* Active Drag Overlay */}
            {isDragging && (
              <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px] flex items-center justify-center z-40">
                <div className="w-8 h-8 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center"
          >
            {isOver ? (
              <div className="text-cyan-400 font-bold text-xs tracking-widest uppercase">
                Drop Here
              </div>
            ) : (
              <div className="text-white/20 text-[10px] font-mono uppercase tracking-widest">
                {isTop3 ? 'Podium' : 'Empty Slot'}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hover Glow Border */}
      <div
        className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{ boxShadow: `inset 0 0 20px ${accentColor}20` }}
      />

      {/* Active Selection Ring */}
      {isOver && (
        <motion.div
          layoutId="active-ring"
          className="absolute -inset-[2px] rounded-xl border-2 pointer-events-none z-50"
          style={{ borderColor: accentColor }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.15 }}
        />
      )}

      {/* Snap Confirmation Glow */}
      {justDropped && (
        <motion.div
          className="absolute -inset-[4px] rounded-xl pointer-events-none z-50"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{
            opacity: [0, 1, 0.7, 0],
            scale: [0.9, 1.1, 1.05, 1]
          }}
          transition={{
            duration: 0.6,
            ease: "easeOut"
          }}
          style={{
            boxShadow: `0 0 30px 8px ${accentColor}, inset 0 0 20px ${accentColor}`,
            border: `2px solid ${accentColor}`
          }}
          data-testid="snap-glow"
        />
      )}

      {/* Celebratory Microanimations */}
      <DropCelebration
        isActive={showCelebration}
        isPodium={isTop3}
        rankColor={accentColor}
        position={position}
      />
    </motion.div>

    {/* Title Below Card - Outside the card container */}
    <AnimatePresence>
      {isOccupied && occupiedBy && (
        <motion.div 
          className="mt-2 px-1"
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -5 }}
          transition={{ delay: 0.2, duration: 0.3, type: "spring", stiffness: 200 }}
        >
          <p 
            className="text-[11px] font-medium text-white/90 text-center leading-tight line-clamp-2"
            title={occupiedBy}
          >
            {occupiedBy}
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
  );
}

