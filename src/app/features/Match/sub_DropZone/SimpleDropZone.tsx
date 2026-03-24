"use client";

import { useDraggable, useDroppable } from "@dnd-kit/core";
import { ChevronUp, ChevronDown, Swords, X } from "lucide-react";
import { useState, useEffect, useRef, useMemo, memo } from "react";

import { createGridDragData, createGridSlotDropData, createGridReceiverId } from "@/lib/dnd";
import { useItemConsensus } from "./hooks/useItemConsensus";
import { useCriteriaStore, useActiveProfile } from '@/stores/criteria-store';
import { useListStore } from '@/stores/use-list-store';
import { GridItemType } from "@/types/match";


import { DropCelebration } from "./components/DropCelebration";
import { DropZoneCard, ActiveSelectionRing, HoverGlowBorder, ItemTitle } from "./components/DropZoneCard";
import { DropZoneEmpty, RankNumberBackground, HoloGridPattern } from "./components/DropZoneEmpty";
import { DropZoneOccupied } from "./components/DropZoneOccupied";
import { ValidDropIndicator, SnapConfirmationGlow } from "./components/MagneticGlowAura";
import { getMedalGradient, MEDAL_HINT_COLORS } from "../lib/medalStyling";
import { getRankConfig, isPodiumPosition } from "../lib/rankConfig";
import { useDropZoneHighlightStore } from "@/stores/drop-zone-highlight-store";


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
  hideTitle?: boolean;
  onFillViaBracket?: () => void;
}

/**
 * "Holo-slot" Drop Zone
 * A futuristic, glass-morphic drop zone with neon accents and dynamic states.
 * Decomposed into focused sub-components for maintainability.
 */
export const SimpleDropZone = memo(function SimpleDropZone({
  position, isOccupied, occupiedBy, imageUrl, gridItem,
  onRemove, dropId, tierAccent, tierGlow, showBadge = true, hideTitle = false, onFillViaBracket,
}: SimpleDropZoneProps) {
  const rankConfig = getRankConfig(position);
  const isTop3 = isPodiumPosition(position);
  const [justDropped, setJustDropped] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const prevOccupiedRef = useRef(isOccupied);
  const containerRef = useRef<HTMLDivElement>(null);

  // Global drag state — granular selectors ensure this component only re-renders
  // when isDragging or dragError changes, not on hoveredPosition/magneticState/etc.
  const isGlobalDragActive = useDropZoneHighlightStore((s) => s.isDragging);
  const registerDropZone = useDropZoneHighlightStore((s) => s.registerDropZone);
  const unregisterDropZone = useDropZoneHighlightStore((s) => s.unregisterDropZone);

  // Criteria score and display config
  const getItemScores = useCriteriaStore((s) => s.getItemScores);
  const activeProfileId = useCriteriaStore((s) => s.activeProfileId);
  const activeProfile = useActiveProfile();
  const category = useListStore((s) => s.currentList?.category);

  // Get item scores for weighted score and individual criterion scores
  const itemScoresData = useMemo(() => {
    if (!isOccupied || !activeProfileId || !gridItem?.item?.id) return null;
    return getItemScores(gridItem.item.id);
  }, [isOccupied, activeProfileId, gridItem?.item?.id, getItemScores]);

  const weightedScore = itemScoresData?.weightedScore ?? 0;

  // Get criteria with display configs from active profile
  const criteria = activeProfile?.criteria;
  const criteriaScores = itemScoresData?.scores;

  // Register drop zone with store (only on mount/unmount, not during drag)
  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    registerDropZone(position, el);
    return () => { unregisterDropZone(position); };
  }, [position, registerDropZone, unregisterDropZone]);

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
  const dragError = useDropZoneHighlightStore((s) => s.dragError);
  const hasError = dragError !== null && dragError.position === position;

  const accentColor = tierAccent || rankConfig.color;
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0) scale(1.05)`, zIndex: 100 } : undefined;
  const medalType = getMedalGradient(position);

  // Consensus average position for this item
  const consensus = useItemConsensus(gridItem?.item?.id, category ?? undefined);
  const userRank = position + 1;
  const avgRank = consensus?.averagePosition;
  const isAboveAvg = avgRank ? userRank < avgRank : false;
  const isBelowAvg = avgRank ? userRank > avgRank : false;

  return (
    <div ref={containerRef} className="flex flex-col" data-testid={`drop-zone-wrapper-${position}`}>
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
        {/* Overlay badge stripe — inside card, absolute top */}
        {isOccupied && showBadge && (
          <div className="absolute top-0 left-0 right-0 z-10 flex items-center h-6 px-1 bg-gradient-to-b from-black/70 to-transparent pointer-events-auto">
            {/* Position number */}
            <span className="text-[10px] font-bold ml-0.5" style={{ color: accentColor }}>
              {isTop3 && rankConfig.icon && (
                <rankConfig.icon className="w-2.5 h-2.5 inline mr-0.5" style={{ color: accentColor }} />
              )}
              #{userRank}
            </span>

            {/* Average consensus with arrow */}
            {avgRank && (
              <span className={`text-[10px] font-medium ml-1 flex items-center gap-px ${
                isAboveAvg ? 'text-emerald-400' : isBelowAvg ? 'text-red-400' : 'text-slate-400'
              }`}>
                {isAboveAvg ? <ChevronUp className="w-2.5 h-2.5" /> : isBelowAvg ? <ChevronDown className="w-2.5 h-2.5" /> : null}
                {avgRank}
              </span>
            )}

            {/* Spacer */}
            <div className="flex-1" />

            {/* Remove button */}
            {onRemove && (
              <button
                onClick={(e) => { e.stopPropagation(); onRemove(); }}
                className="p-0.5 rounded-full text-slate-400 hover:text-red-400 transition-colors"
                data-testid={`remove-item-btn-header-${position}`}
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        )}
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
          <>
            <DropZoneEmpty position={position} isTop3={isTop3} isOver={isOver} accentColor={accentColor} />
            {onFillViaBracket && (
              <button
                onClick={(e) => { e.stopPropagation(); onFillViaBracket(); }}
                className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 px-2 py-1 rounded-control bg-slate-800/80 backdrop-blur-xs text-slate-400 hover:text-amber-400 hover:bg-slate-700/80 transition-colors text-2xs border border-slate-700/50"
                aria-label={`Fill position ${position + 1} via bracket tournament`}
              >
                <Swords className="w-3 h-3" />
                <span className="hidden sm:inline">Bracket</span>
              </button>
            )}
          </>
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
      {!hideTitle && <ItemTitle isOccupied={isOccupied} title={occupiedBy} />}
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
