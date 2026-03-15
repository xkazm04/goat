"use client";

import { motion } from 'framer-motion';
import { Trophy } from 'lucide-react';
import { BracketParticipant } from '../../lib/bracketGenerator';
import { useBracketDimensions } from '../../lib/useBracketDimensions';

interface ParticipantCardProps {
  participant: BracketParticipant;
  position: 'left' | 'right';
  isSelected: boolean;
  onSelect: () => void;
  isDisabled: boolean;
  dims: ReturnType<typeof useBracketDimensions>;
}

/**
 * Participant card for head-to-head display
 * Uses dynamic sizing from useBracketDimensions hook
 */
export function ParticipantCard({
  participant,
  position,
  isSelected,
  onSelect,
  isDisabled,
  dims,
}: ParticipantCardProps) {
  const item = participant.item;
  if (!item) return null;

  const title = item.title || item.name || 'Unknown';
  const { cardMaxWidth, imageMaxHeight, isMobile, isTablet } = dims;

  return (
    <motion.div
      initial={{ opacity: 0, x: position === 'left' ? -30 : 30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.1, type: 'spring', stiffness: 120, damping: 20 }}
      className="flex-1 flex justify-center"
      style={{
        maxWidth: cardMaxWidth,
        minWidth: isMobile ? 140 : 200,
      }}
    >
      <motion.button
        onClick={onSelect}
        disabled={isDisabled}
        aria-label={`Select ${title} as winner${isSelected ? ' (currently selected)' : ''}`}
        aria-pressed={isSelected}
        whileHover={!isDisabled ? { scale: 1.02, y: -2 } : {}}
        whileTap={!isDisabled ? { scale: 0.98 } : {}}
        className={`
          relative w-full rounded-xl overflow-hidden transition-all duration-300
          focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-hover focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900
          ${isSelected
            ? 'ring-3 ring-green-400 ring-offset-2 ring-offset-slate-900 shadow-2xl shadow-green-500/40'
            : 'ring-1 ring-slate-600/50 hover:ring-brand-hover/50 shadow-xl'
          }
          ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
        style={{
          background: isSelected
            ? 'linear-gradient(160deg, rgba(34, 197, 94, 0.15) 0%, rgba(21, 128, 61, 0.2) 100%)'
            : 'linear-gradient(160deg, rgba(30, 41, 59, 0.95) 0%, rgba(51, 65, 85, 0.95) 100%)',
        }}
      >
        {/* Seed badge */}
        <div
          className={`
            absolute top-2 ${position === 'left' ? 'left-2' : 'right-2'} z-10
            px-1.5 py-0.5 rounded text-[10px] sm:text-xs font-bold
            ${isSelected ? 'bg-green-500 text-white' : 'bg-slate-700/90 text-slate-300'}
          `}
        >
          #{participant.seed}
        </div>

        {/* Selected trophy indicator */}
        {isSelected && (
          <motion.div
            initial={{ scale: 0, rotate: -45 }}
            animate={{ scale: 1, rotate: 0 }}
            className={`
              absolute top-2 ${position === 'left' ? 'right-2' : 'left-2'} z-10
              w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-green-500 flex items-center justify-center
              shadow-lg shadow-green-500/50
            `}
          >
            <Trophy className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
          </motion.div>
        )}

        {/* Image container - responsive height */}
        <div
          className="w-full relative overflow-hidden bg-slate-800"
          style={{
            maxHeight: imageMaxHeight,
            aspectRatio: isMobile ? '1 / 1.1' : isTablet ? '1 / 1.15' : '1 / 1.2',
          }}
        >
          {item.image_url ? (
            <img
              src={item.image_url}
              alt={title}
              className="w-full h-full object-cover"
              loading="eager"
            />
          ) : (
            <div className="w-full h-full bg-linear-to-br from-slate-700 to-slate-800 flex items-center justify-center">
              <span className="text-4xl sm:text-5xl text-slate-500 font-bold">
                {title.charAt(0).toUpperCase()}
              </span>
            </div>
          )}

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-linear-to-t from-slate-900/90 via-slate-900/20 to-transparent" />
        </div>

        {/* Content */}
        <div className="p-2 sm:p-3">
          <h3 className="text-sm sm:text-base font-bold text-white mb-0.5 line-clamp-2 leading-tight">
            {title}
          </h3>

          {/* Year */}
          {item.item_year && (
            <div className="text-xs text-slate-400">
              {item.item_year}
              {item.item_year_to && item.item_year_to !== item.item_year
                ? ` - ${item.item_year_to}`
                : ''}
            </div>
          )}

          {/* Tags - only on larger screens */}
          {!isMobile && item.tags && item.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {item.tags.slice(0, 2).map((tag, i) => (
                <span
                  key={i}
                  className="px-1.5 py-0.5 rounded bg-slate-700/50 text-[10px] text-slate-400"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Hover overlay */}
        {!isSelected && !isDisabled && (
          <motion.div
            initial={{ opacity: 0 }}
            whileHover={{ opacity: 1 }}
            className="absolute inset-0 bg-brand/10 flex items-center justify-center pointer-events-none"
          >
            <div className="px-3 py-1.5 rounded-full bg-brand/90 text-white font-bold text-xs sm:text-sm">
              Select Winner
            </div>
          </motion.div>
        )}
      </motion.button>
    </motion.div>
  );
}
