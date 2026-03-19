'use client';

/**
 * CardFlipReveal
 * Letterboxd-style card flip animation that reveals detailed metadata
 * on the back face when tapped or hovered.
 */

import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { DURATION, EASE } from '@/lib/animations/motion-presets';
import { cn } from '@/lib/utils';
import { Star } from 'lucide-react';
import { MetadataBadges, MetadataBadgeData } from './MetadataBadges';
import { RichItemData } from './RichItemCard';

export interface CardFlipRevealProps {
  /** Item data */
  item: RichItemData;
  /** Whether the card is flipped */
  isFlipped: boolean;
  /** Metadata badges */
  badges?: MetadataBadgeData[];
  /** Custom back face content */
  renderBackContent?: (item: RichItemData) => React.ReactNode;
  /** Custom class name */
  className?: string;
}

/**
 * Rating display with star fill
 */
const RatingDisplay = memo(function RatingDisplay({ rating }: { rating: number }) {
  const maxStars = 5;
  const normalizedRating = Math.min(rating, 10) / 2; // Normalize 0-10 to 0-5

  return (
    <div className="flex items-center gap-1">
      <div className="flex gap-0.5">
        {Array.from({ length: maxStars }, (_, i) => {
          const fill = Math.min(1, Math.max(0, normalizedRating - i));
          return (
            <div key={i} className="relative w-3.5 h-3.5">
              <Star className="w-3.5 h-3.5 text-gray-600" />
              {fill > 0 && (
                <div
                  className="absolute inset-0 overflow-hidden"
                  style={{ width: `${fill * 100}%` }}
                >
                  <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                </div>
              )}
            </div>
          );
        })}
      </div>
      <span className="text-xs text-gray-400 ml-1">{rating.toFixed(1)}</span>
    </div>
  );
});

/**
 * Back face content showing detailed metadata
 */
const BackFaceContent = memo(function BackFaceContent({
  item,
  badges = [],
  renderBackContent,
}: {
  item: RichItemData;
  badges?: MetadataBadgeData[];
  renderBackContent?: (item: RichItemData) => React.ReactNode;
}) {
  if (renderBackContent) {
    return <>{renderBackContent(item)}</>;
  }

  return (
    <div className="flex flex-col h-full p-3 overflow-hidden">
      {/* Title */}
      <h3 className="font-semibold text-sm text-white leading-tight">
        {item.title}
      </h3>
      {item.subtitle && (
        <p className="text-xs text-gray-400 mt-0.5 truncate">{item.subtitle}</p>
      )}

      {/* Rating */}
      {item.rating !== undefined && (
        <div className="mt-2">
          <RatingDisplay rating={item.rating} />
        </div>
      )}

      {/* Badges */}
      {badges.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          <MetadataBadges
            badges={badges}
            position="top-left"
            size="xs"
            maxVisible={4}
            className="relative static"
          />
        </div>
      )}

      {/* Description */}
      {item.description && (
        <p className="text-xs text-gray-300 leading-relaxed mt-2 line-clamp-3 flex-1">
          {item.description}
        </p>
      )}

      {/* Tags */}
      {item.tags && item.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-auto pt-2">
          {item.tags.slice(0, 4).map((tag) => (
            <span
              key={tag}
              className="px-1.5 py-0.5 text-2xs bg-brand/10 text-brand-hover rounded-badge border border-brand/20"
            >
              {tag}
            </span>
          ))}
          {item.tags.length > 4 && (
            <span className="px-1.5 py-0.5 text-2xs text-gray-500">
              +{item.tags.length - 4}
            </span>
          )}
        </div>
      )}
    </div>
  );
});

/**
 * CardFlipReveal Component
 *
 * A 3D card flip animation that transitions between a front face
 * (image + title) and a back face (detailed metadata).
 * Uses CSS 3D transforms via Framer Motion for smooth performance.
 */
export const CardFlipReveal = memo(function CardFlipReveal({
  item,
  isFlipped,
  badges = [],
  renderBackContent,
  className,
}: CardFlipRevealProps) {
  return (
    <div
      className={cn('absolute inset-0 z-20', className)}
      style={{ perspective: '800px' }}
    >
      <motion.div
        className="relative w-full h-full"
        style={{ transformStyle: 'preserve-3d' }}
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{
          duration: DURATION.slow,
          ease: EASE.inOut,
        }}
      >
        {/* Front face - transparent so the underlying card shows through */}
        <div
          className="absolute inset-0"
          style={{ backfaceVisibility: 'hidden' }}
        />

        {/* Back face - metadata reveal */}
        <div
          className="absolute inset-0 rounded-card overflow-hidden bg-gray-900 border border-gray-700"
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
          }}
        >
          {/* Blurred image background */}
          {item.image && (
            <div className="absolute inset-0 overflow-hidden">
              <img
                src={item.image}
                alt=""
                className="w-full h-full object-cover opacity-15 blur-md scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-gray-900/80 via-gray-900/90 to-gray-900" />
            </div>
          )}

          {/* Content */}
          <div className="relative h-full">
            <BackFaceContent
              item={item}
              badges={badges}
              renderBackContent={renderBackContent}
            />
          </div>
        </div>
      </motion.div>
    </div>
  );
});

export default CardFlipReveal;
