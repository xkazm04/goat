"use client";

import { memo, useMemo } from "react";
import { motion } from "framer-motion";
import { X, LucideIcon } from "lucide-react";
import { ProgressiveImage } from "@/components/ui/progressive-image";
import { Glow } from '@/components/visual';
import { ThemedScoreDisplay } from '@/components/ui/themed-scores';
import { ScoreOverlayContainer } from '@/components/ui/score-overlays';
import { getMedalGradient, type MedalType } from "../../lib/medalStyling";
import type { Criterion, CriterionScore } from '@/lib/criteria/types';

export interface DropZoneOccupiedProps {
  /** Position in the grid (0-based) */
  position: number;
  /** Item title/name */
  title: string;
  /** Image URL for the item */
  imageUrl?: string | null;
  /** Whether this is a top-3 position */
  isTop3: boolean;
  /** Accent color for styling */
  accentColor: string;
  /** Optional icon component for top-3 positions */
  icon?: LucideIcon;
  /** Callback when remove button is clicked */
  onRemove?: () => void;
  /** Whether this item is currently being dragged */
  isDragging: boolean;
  /** Weighted score value (0 if not scored) */
  weightedScore?: number;
  /** Category for themed score display */
  category?: string;
  /** Whether to show the position badge */
  showBadge?: boolean;
  /** Criteria configuration for overlay display */
  criteria?: Criterion[];
  /** Criterion scores for this item */
  criteriaScores?: CriterionScore[];
}

/**
 * DropZoneOccupied
 * Renders the occupied state of a drop zone with image, medal overlay, badge, and score.
 */
export const DropZoneOccupied = memo(function DropZoneOccupied({
  position,
  title,
  imageUrl,
  isTop3,
  accentColor,
  icon: IconComponent,
  onRemove,
  isDragging,
  weightedScore = 0,
  category,
  showBadge = true,
  criteria,
  criteriaScores,
}: DropZoneOccupiedProps) {
  const medalType = getMedalGradient(position);

  // Check if any criteria have visible display configs
  const hasVisibleOverlays = useMemo(() => {
    if (!criteria || !criteriaScores || criteriaScores.length === 0) return false;
    return criteria.some(
      (c) => c.displayConfig?.displayType && c.displayConfig.displayType !== 'hidden'
    );
  }, [criteria, criteriaScores]);

  return (
    <motion.div
      key="content"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className="absolute inset-0"
    >
      {/* Position #1 Extra Glow - behind content */}
      {position === 0 && (
        <Glow
          color="gold"
          intensity="subtle"
          asBackground
          className="absolute inset-0 rounded-xl z-0 pointer-events-none"
        />
      )}

      {/* Medal Gradient Border - top 3 only, as inset box-shadow */}
      {medalType && (
        <div
          className="absolute inset-0 rounded-xl z-35 pointer-events-none"
          style={{
            boxShadow: `inset 0 0 0 ${position === 0 ? 3 : 2}px ${
              medalType === 'gold' ? '#fbbf24' :
              medalType === 'silver' ? '#94a3b8' : '#fb923c'
            }`,
          }}
        />
      )}

      {/* Image - Full coverage using ProgressiveImage with wiki fallback */}
      <motion.div
        className="absolute inset-0"
        initial={{ scale: 1.1 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        <ProgressiveImage
          src={imageUrl}
          alt={title}
          itemTitle={title}
          autoFetchWiki={true}
          testId={`drop-zone-image-${position}`}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          fallbackComponent={
            <div className="w-full h-full bg-linear-to-br from-slate-800 to-slate-900 flex items-center justify-center">
              <span className="text-xs text-gray-500 text-center px-2">{title}</span>
            </div>
          }
        />
        {/* Subtle gradient overlay for number visibility */}
        <div className="absolute inset-0 bg-linear-to-b from-black/40 via-transparent to-black/20 pointer-events-none" />
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
            {isTop3 && IconComponent && (
              <IconComponent
                className="w-4 h-4"
                style={{ color: accentColor }}
              />
            )}
            <span
              className="text-sm font-black font-grotesk tracking-wide"
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

      {/* Score Overlays - Show criteria overlays if configured, otherwise themed display */}
      {hasVisibleOverlays && criteria && criteriaScores ? (
        <ScoreOverlayContainer
          criteria={criteria}
          scores={criteriaScores}
          className="z-25"
        />
      ) : weightedScore > 0 && (
        <div className="absolute bottom-1 left-1 right-1 z-25 pointer-events-none">
          <ThemedScoreDisplay
            score={weightedScore}
            category={category}
            variant="compact"
            showLabel={false}
            animated={false}
          />
        </div>
      )}

      {/* Active Drag Overlay */}
      {isDragging && (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px] flex items-center justify-center z-40">
          <div className="w-8 h-8 rounded-full border-2 border-white/30 border-t-white animate-spin" />
        </div>
      )}
    </motion.div>
  );
});

export default DropZoneOccupied;
