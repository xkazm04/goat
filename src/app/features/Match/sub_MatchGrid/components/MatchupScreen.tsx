"use client";

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Zap, Trophy, ChevronUp, ChevronDown, Info } from 'lucide-react';
import { BracketMatchup, BracketParticipant } from '../../lib/bracketGenerator';
import { BacklogItemType } from '@/types/match';

interface MatchupScreenProps {
  matchup: BracketMatchup;
  onSelectWinner: (winnerId: string) => void;
  onClose: () => void;
  roundName: string;
  matchNumber: number;
  totalMatchesInRound: number;
}

/**
 * Participant card for head-to-head display
 */
function ParticipantCard({
  participant,
  position,
  isSelected,
  onSelect,
  isDisabled,
}: {
  participant: BracketParticipant;
  position: 'left' | 'right';
  isSelected: boolean;
  onSelect: () => void;
  isDisabled: boolean;
}) {
  const item = participant.item;
  if (!item) return null;

  const title = item.title || item.name || 'Unknown';

  return (
    <motion.div
      initial={{ opacity: 0, x: position === 'left' ? -50 : 50 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.2, type: 'spring', stiffness: 100 }}
      className={`
        relative flex-1 max-w-md
        ${position === 'left' ? 'mr-4' : 'ml-4'}
      `}
    >
      <motion.button
        onClick={onSelect}
        disabled={isDisabled}
        whileHover={!isDisabled ? { scale: 1.02 } : {}}
        whileTap={!isDisabled ? { scale: 0.98 } : {}}
        className={`
          relative w-full rounded-2xl overflow-hidden transition-all duration-300
          ${isSelected
            ? 'ring-4 ring-green-400 ring-offset-4 ring-offset-slate-900 shadow-2xl shadow-green-500/30'
            : 'ring-2 ring-slate-600 hover:ring-cyan-400/50 shadow-xl'
          }
          ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
        style={{
          background: isSelected
            ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.2) 0%, rgba(21, 128, 61, 0.2) 100%)'
            : 'linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(51, 65, 85, 0.9) 100%)',
        }}
      >
        {/* Seed badge */}
        <div
          className={`
            absolute top-3 ${position === 'left' ? 'left-3' : 'right-3'} z-10
            px-2 py-1 rounded-lg text-xs font-bold
            ${isSelected ? 'bg-green-500 text-white' : 'bg-slate-700 text-slate-300'}
          `}
        >
          #{participant.seed}
        </div>

        {/* Selected indicator */}
        {isSelected && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className={`
              absolute top-3 ${position === 'left' ? 'right-3' : 'left-3'} z-10
              w-8 h-8 rounded-full bg-green-500 flex items-center justify-center
            `}
          >
            <Trophy className="w-4 h-4 text-white" />
          </motion.div>
        )}

        {/* Image */}
        <div className="aspect-[3/4] w-full relative">
          {item.image_url ? (
            <img
              src={item.image_url}
              alt={title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center">
              <span className="text-6xl text-slate-600 font-bold">
                {title.charAt(0).toUpperCase()}
              </span>
            </div>
          )}

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent" />
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Title */}
          <h3 className="text-lg font-bold text-white mb-1 line-clamp-2">
            {title}
          </h3>

          {/* Year */}
          {item.item_year && (
            <div className="text-sm text-slate-400 mb-2">
              {item.item_year}
              {item.item_year_to && item.item_year_to !== item.item_year
                ? ` - ${item.item_year_to}`
                : ''}
            </div>
          )}

          {/* Description */}
          {item.description && (
            <p className="text-xs text-slate-400 line-clamp-2">
              {item.description}
            </p>
          )}

          {/* Tags */}
          {item.tags && item.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {item.tags.slice(0, 3).map((tag, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 rounded-full bg-slate-700/50 text-xs text-slate-400"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Click to select overlay */}
        {!isSelected && !isDisabled && (
          <motion.div
            initial={{ opacity: 0 }}
            whileHover={{ opacity: 1 }}
            className="absolute inset-0 bg-cyan-500/10 flex items-center justify-center"
          >
            <div className="px-4 py-2 rounded-full bg-cyan-500/90 text-white font-bold text-sm">
              Click to Select Winner
            </div>
          </motion.div>
        )}
      </motion.button>
    </motion.div>
  );
}

/**
 * VS divider component with animation
 */
function VSDivider() {
  return (
    <motion.div
      initial={{ scale: 0, rotate: -180 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
      className="relative flex flex-col items-center justify-center z-10"
    >
      {/* Glow effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/0 via-cyan-500/20 to-cyan-500/0 blur-xl" />

      {/* VS text */}
      <motion.div
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="relative"
      >
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-xl shadow-cyan-500/30">
          <span className="text-2xl font-black text-white tracking-wider">VS</span>
        </div>

        {/* Electric spark effects */}
        <motion.div
          className="absolute -left-2 top-1/2 -translate-y-1/2"
          animate={{ x: [-2, 2, -2], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 0.5, repeat: Infinity }}
        >
          <Zap className="w-4 h-4 text-yellow-400" />
        </motion.div>
        <motion.div
          className="absolute -right-2 top-1/2 -translate-y-1/2"
          animate={{ x: [2, -2, 2], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 0.5, repeat: Infinity, delay: 0.25 }}
        >
          <Zap className="w-4 h-4 text-yellow-400 rotate-180" />
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

/**
 * Main matchup screen component
 */
export function MatchupScreen({
  matchup,
  onSelectWinner,
  onClose,
  roundName,
  matchNumber,
  totalMatchesInRound,
}: MatchupScreenProps) {
  const [selectedWinnerId, setSelectedWinnerId] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);

  const handleSelect = useCallback((participantId: string) => {
    if (isConfirming) return;
    setSelectedWinnerId(participantId);
  }, [isConfirming]);

  const handleConfirm = useCallback(() => {
    if (!selectedWinnerId) return;
    setIsConfirming(true);

    // Small delay for animation
    setTimeout(() => {
      onSelectWinner(selectedWinnerId);
    }, 500);
  }, [selectedWinnerId, onSelectWinner]);

  const handleClear = useCallback(() => {
    if (isConfirming) return;
    setSelectedWinnerId(null);
  }, [isConfirming]);

  if (!matchup.participant1 || !matchup.participant2) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.98) 0%, rgba(30, 41, 59, 0.98) 100%)',
          backdropFilter: 'blur(8px)',
        }}
      >
        {/* Background pattern */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />

        {/* Close button */}
        <motion.button
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-slate-800/80 hover:bg-slate-700 transition-colors"
        >
          <X className="w-6 h-6 text-slate-400" />
        </motion.button>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-6 left-1/2 -translate-x-1/2 text-center"
        >
          <div className="text-cyan-400 text-sm font-medium uppercase tracking-wider">
            {roundName}
          </div>
          <div className="text-slate-400 text-xs mt-1">
            Match {matchNumber} of {totalMatchesInRound}
          </div>
        </motion.div>

        {/* Main content */}
        <div className="w-full max-w-5xl flex items-center justify-center">
          {/* Left participant */}
          <ParticipantCard
            participant={matchup.participant1}
            position="left"
            isSelected={selectedWinnerId === matchup.participant1.id}
            onSelect={() => handleSelect(matchup.participant1!.id)}
            isDisabled={isConfirming}
          />

          {/* VS divider */}
          <VSDivider />

          {/* Right participant */}
          <ParticipantCard
            participant={matchup.participant2}
            position="right"
            isSelected={selectedWinnerId === matchup.participant2.id}
            onSelect={() => handleSelect(matchup.participant2!.id)}
            isDisabled={isConfirming}
          />
        </div>

        {/* Bottom actions */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4"
        >
          {selectedWinnerId ? (
            <>
              <motion.button
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                onClick={handleClear}
                disabled={isConfirming}
                className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 font-medium transition-colors disabled:opacity-50"
              >
                Change Selection
              </motion.button>

              <motion.button
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                onClick={handleConfirm}
                disabled={isConfirming}
                className="px-6 py-3 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white font-bold transition-all disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-green-500/30"
              >
                {isConfirming ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    >
                      <Trophy className="w-5 h-5" />
                    </motion.div>
                    Advancing...
                  </>
                ) : (
                  <>
                    <Trophy className="w-5 h-5" />
                    Confirm Winner
                  </>
                )}
              </motion.button>
            </>
          ) : (
            <div className="flex items-center gap-2 text-slate-400 text-sm">
              <Info className="w-4 h-4" />
              <span>Click on a contestant to select them as the winner</span>
            </div>
          )}
        </motion.div>

        {/* Keyboard hint */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="absolute bottom-4 right-4 text-xs text-slate-600"
        >
          Press <kbd className="px-1 py-0.5 rounded bg-slate-700 text-slate-400">1</kbd> or{' '}
          <kbd className="px-1 py-0.5 rounded bg-slate-700 text-slate-400">2</kbd> to select •{' '}
          <kbd className="px-1 py-0.5 rounded bg-slate-700 text-slate-400">Enter</kbd> to confirm •{' '}
          <kbd className="px-1 py-0.5 rounded bg-slate-700 text-slate-400">Esc</kbd> to cancel
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
