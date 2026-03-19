"use client";

import { useDraggable, useDroppable } from "@dnd-kit/core";
import { GridItemType } from "@/types/match";

import { X } from "lucide-react";
import { useState, useEffect, useRef, useMemo, memo } from "react";
import { DropCelebration } from "./components/DropCelebration";
import { DropZoneOccupied } from "./components/DropZoneOccupied";
import { DropZoneEmpty, RankNumberBackground, HoloGridPattern } from "./components/DropZoneEmpty";
import { ValidDropIndicator, SnapConfirmationGlow } from "./components/MagneticGlowAura";
import { DropZoneCard, ActiveSelectionRing, HoverGlowBorder, ItemTitle } from "./components/DropZoneCard";
import { getMedalGradient, MEDAL_HINT_COLORS } from "../lib/medalStyling";
import { useOptionalDropZoneHighlight } from "../sub_MatchGrid/components/DropZoneHighlightContext";
import { createGridDragData, createGridSlotDropData, createGridReceiverId } from "@/lib/dnd";
import { getRankConfig, isPodiumPosition } from "../lib/rankConfig";
import { useCriteriaStore, useActiveProfile } from '@/stores/criteria-store';
import { useListStore } from '@/stores/use-list-store';
import { usePositionChange } from "../components/PositionHistoryContext";
import { PositionChangeIndicator } from "../components/PositionChangeIndicator";

interface SimpleDropZoneProps {
  position: number;
  isOccupied: boolean;
  occupiedBy?: string;
  imageUrl?: string | null;
  gridItem?: GridItemType;
  onRemove?: () => void;
  dropId?: string;
  tierAccent?: string;
  tierGlow?: string;
  showBadge?: boolean;
}

/**
 * "Holo-slot" Drop Zone
 * A futuristic, glass-morphic drop zone with neon accents and dynamic states.
 * Decomposed into focused sub-components for maintainability.
 */
export const SimpleDropZone = memo(function SimpleDropZone({
  position, isOccupied, occupiedBy, imageUrl, gridItem,
  onRemove, dropId, tierAccent, tierGlow, showBadge = true,
}: SimpleDropZoneProps) {
  const rankConfig = getRankConfig(position);
  const isTop3 = isPodiumPosition(position);
  const [justDropped, setJustDropped] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const prevOccupiedRef = useRef(isOccupied);
  const containerRef = useRef<HTMLDivElement>(null);

  // Position change tracking (Billboard-style movement indicators)
  const positionChange = usePositionChange(gridItem?.backlogItemId);

  // Global drag state from highlight context (read only what's needed to avoid re-renders)
  const highlightContext = useOptionalDropZoneHighlight();
  const isGlobalDragActive = highlightContext?.dragState.isDragging ?? false;

  // Criteria score and display config
  const getItemScores = useCriteriaStore((s) => s.getItemScores);
  const activeProfileId = useCriteriaStore((s) => s.activeProfileId);
  const activeProfile = useActiveProfile();
  const category = useListStore((s) => s.currentList?.category);

  // Get item scores for weighted score and individual criterion scores
  const itemScoresData = useMemo(() => {
    if (!isOccupied || !activeProfileId || !gridItem?.backlogItemId) return null;
    return getItemScores(gridItem.backlogItemId);
  }, [isOccupied, activeProfileId, gridItem?.backlogItemId, getItemScores]);

  const weightedScore = itemScoresData?.weightedScore ?? 0;

  // Get criteria with display configs from active profile
  const criteria = activeProfile?.criteria;
  const criteriaScores = itemScoresData?.scores;

  // Register drop zone with highlight context (only on mount/unmount, not during drag)
  useEffect(() => {
    const register = highlightContext?.registerDropZone;
    const unregister = highlightContext?.unregisterDropZone;
    if (!register || !unregister || !containerRef.current) return;
    const el = containerRef.current;
    register(position, el);
    return () => { unregister(position); };
  }, [position, highlightContext?.registerDropZone, highlightContext?.unregisterDropZone]);

  // DnD hooks
  const { attributes, listeners, setNodeRef: setDragRef, transform, isDragging } = useDraggable({
    id: gridItem?.id || `empty-${dropId || createGridReceiverId(position)}`,
    disabled: !isOccupied || !gridItem,
    data: gridItem ? createGridDragData(gridItem) : undefined,
  });
  const { isOver, setNodeRef: setDropRef } = useDroppable({
    id: dropId || createGridReceiverId(position),
    data: createGridSlotDropData(position, isOccupied, gridItem),
  });
  const setNodeRef = (n: HTMLElement | null) => { setDragRef(n); setDropRef(n); };

  // Celebration trigger
  useEffect(() => {
    if (!prevOccupiedRef.current && isOccupied && !isDragging) {
      setJustDropped(true);
      setShowCelebration(true);
      const t1 = setTimeout(() => setJustDropped(false), 600);
      const t2 = setTimeout(() => setShowCelebration(false), 1200);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
    prevOccupiedRef.current = isOccupied;
  }, [isOccupied, isDragging]);

  // Drag error state for this position
  const dragError = highlightContext?.dragState.dragError ?? null;
  const hasError = dragError !== null && dragError.position === position;

  const accentColor = tierAccent || rankConfig.color;
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0) scale(1.05)`, zIndex: 100 } : undefined;
  const medalType = getMedalGradient(position);

  return (
    <div ref={containerRef} className="flex flex-col" data-testid={`drop-zone-wrapper-${position}`}>
      {/* Header row above card: Badge (center) + Change indicator + Remove button (right) */}
      {isOccupied && (
        <div className="flex items-center justify-center h-6 mb-1 relative">
          {/* Centered position badge + change indicator (hidden when showBadge is false) */}
          {showBadge && (
            <div className="flex items-center gap-1">
              <div
                className="px-2.5 py-0.5 rounded-control backdrop-blur-md border flex items-center gap-1 shadow-md text-xs font-bold"
                style={{
                  backgroundColor: `${accentColor}20`,
                  borderColor: `${accentColor}40`,
                  color: accentColor,
                }}
              >
                {isTop3 && rankConfig.icon && (
                  <rankConfig.icon className="w-3 h-3" style={{ color: accentColor }} />
                )}
                #{position + 1}
              </div>
              <PositionChangeIndicator change={positionChange} size="xs" />
            </div>
          )}
          {/* Remove button - absolute right */}
          {onRemove && (
            <button
              onClick={(e) => { e.stopPropagation(); onRemove(); }}
              className="absolute right-0 p-1 rounded-full bg-black/40 text-white/60 hover:text-red-400 hover:bg-red-500/20 border border-white/10 transition-colors"
              data-testid={`remove-item-btn-header-${position}`}
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      )}
      <DropZoneCard
        ref={setNodeRef}
        position={position}
        isOccupied={isOccupied}
        isOver={isOver}
        isTop3={isTop3}
        justDropped={justDropped}
        showValidDropZoneHighlight={false}
        shouldDimFilledSlot={false}
        accentColor={accentColor}
        medalType={medalType}
        medalHintColor={medalType ? MEDAL_HINT_COLORS[medalType] : undefined}
        hasError={hasError}
        style={style}
        attributes={attributes}
        listeners={listeners}
      >
        <ValidDropIndicator isActive={isOver && !isOccupied} testId={`valid-drop-zone-indicator-${position}`} />
        <InvalidDropIndicator isActive={hasError} />
        <HoloGridPattern accentColor={accentColor} isVisible={!isOccupied} />
        <RankNumberBackground position={position} accentColor={accentColor} isOver={isOver} isOccupied={isOccupied} />
        {isOccupied && occupiedBy ? (
          <DropZoneOccupied
            position={position} title={occupiedBy} imageUrl={imageUrl} isTop3={isTop3}
            accentColor={accentColor} icon={rankConfig.icon ?? undefined} onRemove={undefined}
            isDragging={isDragging} weightedScore={weightedScore} category={category} showBadge={false}
            criteria={criteria} criteriaScores={criteriaScores}
          />
        ) : (
          <DropZoneEmpty position={position} isTop3={isTop3} isOver={isOver} accentColor={accentColor} />
        )}
        <HoverGlowBorder accentColor={accentColor} />
        <ActiveSelectionRing isActive={isOver} accentColor={accentColor} />
        {/* Skip decorative effects during drag - they can't be active and save component overhead across 50 slots */}
        {!isGlobalDragActive && (
          <>
            <SnapConfirmationGlow isActive={justDropped} accentColor={accentColor} testId="snap-glow" />
            <DropCelebration isActive={showCelebration} isPodium={isTop3} rankColor={accentColor} position={position} />
          </>
        )}
      </DropZoneCard>
      <ItemTitle isOccupied={isOccupied} title={occupiedBy} />
    </div>
  );
});

/**
 * InvalidDropIndicator
 * Shows a crossed-circle SVG icon with red-400 pulse when a drop is invalid.
 * Displays for 600ms matching the error animation duration.
 */
function InvalidDropIndicator({ isActive }: { isActive: boolean }) {
  if (!isActive) return null;

  return (
    <div
      className="absolute inset-0 z-sticky flex items-center justify-center pointer-events-none"
      style={{ animation: 'invalid-drop-pulse 600ms ease-out forwards' }}
      data-testid="invalid-drop-indicator"
    >
      <svg
        width="32"
        height="32"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#f87171"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="drop-shadow-[0_0_8px_rgba(248,113,113,0.6)]"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
      </svg>
    </div>
  );
}
