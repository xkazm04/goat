"use client";

import { useDroppable } from "@dnd-kit/core";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, X, Sparkles, Crown, Award, Plus, Share2 } from "lucide-react";
import { GridItemType } from "@/types/match";
import { TopList } from "@/types/top-lists";
import { ProgressiveImage } from "@/components/ui/progressive-image";
import { useState, useEffect } from "react";
import { useClickAssign } from "../AwardList";

interface AwardCandidate {
  id: string;
  title: string;
  image_url?: string | null;
}

interface AwardItemProps {
  list: TopList;
  gridItem: GridItemType | null;
  candidates: AwardCandidate[];
  onRemove: () => void;
  onAddCandidate?: () => void;
  onShare?: (listId: string, winnerTitle: string) => void;
  getItemTitle: (item: any) => string;
  index?: number;
  hasSelectedItem?: boolean;
}

/**
 * Premium Award Item Card
 * Displays award category with 5 candidate slots and a winner podium (2x larger)
 * Supports both drag-and-drop and click-to-assign
 */
export function AwardItem({
  list,
  gridItem,
  candidates = [],
  onRemove,
  onAddCandidate,
  onShare,
  getItemTitle,
  index = 0,
  hasSelectedItem = false
}: AwardItemProps) {
  const [justAwarded, setJustAwarded] = useState(false);
  const isOccupied = !!(gridItem && gridItem.matched);
  const dropId = `award-${list.id}`;
  const clickAssign = useClickAssign();

  // Use droppable hook for the winner slot
  const { isOver, setNodeRef } = useDroppable({
    id: dropId,
    data: {
      type: 'award-slot',
      listId: list.id,
      dropId: dropId
    }
  });

  // Trigger celebration animation when winner is set
  useEffect(() => {
    if (isOccupied) {
      setJustAwarded(true);
      const timer = setTimeout(() => setJustAwarded(false), 1500);
      return () => clearTimeout(timer);
    }
  }, [isOccupied, gridItem?.id]);

  // Handle click-to-assign for winner slot
  const handleWinnerClick = () => {
    if (hasSelectedItem && clickAssign && !isOccupied) {
      clickAssign.assignToAward(list.id);
    }
  };

  // Pad candidates to always show 5 slots
  const displayCandidates = [...candidates];
  while (displayCandidates.length < 5) {
    displayCandidates.push({ id: `empty-${displayCandidates.length}`, title: '', image_url: null });
  }

  const showClickHint = hasSelectedItem && !isOccupied;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, type: "spring", stiffness: 100 }}
      className="group"
    >
      {/* Main Card */}
      <div className={`
        relative overflow-hidden rounded-2xl
        bg-gradient-to-br from-gray-900/95 via-gray-900/90 to-gray-950/95
        border transition-all duration-300
        ${isOver ? 'border-yellow-500/50 shadow-[0_0_40px_rgba(234,179,8,0.15)]' : 'border-white/5 shadow-xl shadow-black/50'}
      `}>
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-[0.03]">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `radial-gradient(circle at 2px 2px, rgba(234,179,8,0.5) 1px, transparent 0)`,
              backgroundSize: '20px 20px'
            }}
          />
        </div>

        {/* Header - Title & Description (Compact, at top) */}
        <div className="relative px-5 pt-4 pb-3 border-b border-white/5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              {/* Trophy Icon */}
              <div className="flex-shrink-0 p-2 bg-gradient-to-br from-yellow-500/20 to-orange-500/10 rounded-xl border border-yellow-500/20">
                <Trophy className="w-5 h-5 text-yellow-500" />
              </div>

              {/* Title & Description */}
              <div className="min-w-0">
                <h3 className="text-lg font-bold text-white truncate">
                  {list.title}
                </h3>
                <p className="text-xs text-gray-500 truncate mt-0.5">
                  {list.description || `Choose the best for ${list.title}`}
                </p>
              </div>
            </div>

            {/* Category Badge */}
            <div className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1 bg-yellow-500/10 rounded-full border border-yellow-500/20">
              <Award className="w-3 h-3 text-yellow-500" />
              <span className="text-[10px] font-semibold text-yellow-500 uppercase tracking-wider">
                Award
              </span>
            </div>
          </div>
        </div>

        {/* Content Area - Candidates + Winner */}
        <div className="relative p-5">
          <div className="flex items-start gap-6">

            {/* Candidates Section (5 slots) */}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                  Nominees
                </span>
                <div className="flex-1 h-px bg-gradient-to-r from-gray-700/50 to-transparent" />
                <span className="text-[10px] text-gray-600">
                  {candidates.filter(c => c.title).length}/5
                </span>
              </div>

              <div className="grid grid-cols-5 gap-2">
                {displayCandidates.slice(0, 5).map((candidate, idx) => (
                  <CandidateSlot
                    key={candidate.id}
                    candidate={candidate}
                    index={idx}
                    listId={list.id}
                    hasSelectedItem={hasSelectedItem}
                  />
                ))}
              </div>
            </div>

            {/* Divider */}
            <div className="flex flex-col items-center gap-2 px-2 self-center">
              <div className="w-px h-12 bg-gradient-to-b from-transparent via-yellow-500/30 to-transparent" />
              <Sparkles className="w-5 h-5 text-yellow-500/40" />
              <div className="w-px h-12 bg-gradient-to-b from-transparent via-yellow-500/30 to-transparent" />
            </div>

            {/* Winner Podium - 2X LARGER */}
            <div className="flex-shrink-0">
              <div className="flex items-center gap-2 mb-3">
                <Crown className="w-4 h-4 text-yellow-500" />
                <span className="text-xs font-semibold text-yellow-500 uppercase tracking-wider">
                  Winner
                </span>
              </div>

              <motion.div
                ref={setNodeRef}
                onClick={handleWinnerClick}
                animate={{
                  scale: isOver ? 1.02 : justAwarded ? [1, 1.05, 1] : 1,
                }}
                transition={{ duration: 0.3 }}
                className={`relative ${showClickHint ? 'cursor-pointer' : ''}`}
              >
                {/* Winner Display Box - 2X SIZE: w-56 h-72 (was w-28 h-36) */}
                <div className={`
                  relative w-56 h-72 rounded-2xl overflow-hidden
                  transition-all duration-300
                  ${isOccupied
                    ? 'bg-gradient-to-b from-yellow-500/20 to-yellow-600/10 border-yellow-500/40'
                    : 'bg-gradient-to-b from-gray-800/60 to-gray-900/60 border-white/10'
                  }
                  ${isOver ? 'ring-2 ring-yellow-500 ring-offset-2 ring-offset-gray-900 border-yellow-500/50' : 'border-2'}
                  ${showClickHint ? 'ring-2 ring-cyan-500/50 ring-offset-2 ring-offset-gray-900 hover:ring-cyan-400' : ''}
                `}>

                  <AnimatePresence mode="wait">
                    {isOccupied ? (
                      /* Winner Display */
                      <motion.div
                        key="winner"
                        initial={{ opacity: 0, scale: 0.8, rotateY: -90 }}
                        animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                        exit={{ opacity: 0, scale: 0.8, rotateY: 90 }}
                        transition={{ type: "spring", stiffness: 200 }}
                        className="absolute inset-0"
                      >
                        {/* Winner Image */}
                        <ProgressiveImage
                          src={gridItem?.image_url}
                          alt={getItemTitle(gridItem)}
                          itemTitle={getItemTitle(gridItem)}
                          autoFetchWiki={true}
                          className="w-full h-full object-cover"
                        />

                        {/* Gradient overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-black/30" />

                        {/* Crown badge - larger */}
                        <motion.div
                          initial={{ scale: 0, rotate: -20 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{ delay: 0.3, type: "spring" }}
                          className="absolute top-4 left-1/2 -translate-x-1/2 p-2.5 bg-yellow-500 rounded-full shadow-lg shadow-yellow-500/50"
                        >
                          <Crown className="w-6 h-6 text-black" />
                        </motion.div>

                        {/* Winner name - larger text */}
                        <div className="absolute bottom-0 left-0 right-0 p-4 text-center">
                          <p className="text-lg font-bold text-white truncate drop-shadow-lg">
                            {getItemTitle(gridItem)}
                          </p>
                          <p className="text-sm text-yellow-400 uppercase tracking-wider font-medium mt-1">
                            Winner
                          </p>
                        </div>

                        {/* Action buttons container */}
                        <div className="absolute top-3 right-3 flex items-center gap-2 z-30 opacity-0 group-hover:opacity-100 transition-opacity">
                          {/* Share button */}
                          {onShare && (
                            <motion.button
                              initial={{ opacity: 0, scale: 0.5 }}
                              animate={{ opacity: 1, scale: 1 }}
                              whileHover={{ scale: 1.1, backgroundColor: 'rgba(6, 182, 212, 0.8)' }}
                              onClick={(e) => {
                                e.stopPropagation();
                                onShare(list.id, getItemTitle(gridItem));
                              }}
                              className="p-1.5 rounded-full bg-black/50 text-white/70 hover:text-white backdrop-blur-sm border border-white/20"
                              title="Share this award"
                            >
                              <Share2 className="w-4 h-4" />
                            </motion.button>
                          )}

                          {/* Remove button */}
                          <motion.button
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            whileHover={{ scale: 1.1, backgroundColor: 'rgba(239, 68, 68, 0.8)' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              onRemove();
                            }}
                            className="p-1.5 rounded-full bg-black/50 text-white/70 hover:text-white backdrop-blur-sm border border-white/20"
                            title="Remove winner"
                          >
                            <X className="w-4 h-4" />
                          </motion.button>
                        </div>

                        {/* Celebration sparkles */}
                        {justAwarded && (
                          <>
                            {[...Array(8)].map((_, i) => (
                              <motion.div
                                key={i}
                                initial={{ opacity: 1, scale: 0, x: 0, y: 0 }}
                                animate={{
                                  opacity: 0,
                                  scale: 1,
                                  x: (Math.random() - 0.5) * 120,
                                  y: (Math.random() - 0.5) * 120
                                }}
                                transition={{ duration: 0.8, delay: i * 0.08 }}
                                className="absolute top-1/2 left-1/2 pointer-events-none"
                              >
                                <Sparkles className="w-4 h-4 text-yellow-400" />
                              </motion.div>
                            ))}
                          </>
                        )}
                      </motion.div>
                    ) : (
                      /* Empty Drop Zone */
                      <motion.div
                        key="empty"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 flex flex-col items-center justify-center p-6"
                      >
                        {/* Trophy outline - larger */}
                        <motion.div
                          animate={{
                            scale: isOver || showClickHint ? 1.2 : 1,
                            opacity: isOver || showClickHint ? 1 : 0.3,
                          }}
                          transition={{ duration: 0.2 }}
                          className="mb-4"
                        >
                          <Trophy className={`w-16 h-16 ${isOver ? 'text-yellow-500' : showClickHint ? 'text-cyan-500' : 'text-gray-600'}`} />
                        </motion.div>

                        {/* Drop/Click hint - larger text */}
                        <motion.p
                          animate={{ opacity: isOver || showClickHint ? 1 : 0.5 }}
                          className={`text-sm text-center font-medium leading-tight ${isOver ? 'text-yellow-400' : showClickHint ? 'text-cyan-400' : 'text-gray-500'}`}
                        >
                          {isOver ? 'Release to Award!' : showClickHint ? 'Click to Assign!' : 'Drop or Click'}
                        </motion.p>

                        {/* Animated border */}
                        {(isOver || showClickHint) && (
                          <motion.div
                            className={`absolute inset-0 border-2 border-dashed rounded-2xl ${isOver ? 'border-yellow-500/60' : 'border-cyan-500/60'}`}
                            animate={{ opacity: [0.4, 1, 0.4] }}
                            transition={{ duration: 1, repeat: Infinity }}
                          />
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Glow effect */}
                {(isOver || isOccupied || showClickHint) && (
                  <div className={`absolute -inset-3 rounded-3xl blur-xl -z-10 ${showClickHint && !isOccupied ? 'bg-cyan-500/10' : 'bg-yellow-500/10'}`} />
                )}
              </motion.div>
            </div>
          </div>
        </div>

        {/* Bottom accent line */}
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-yellow-500/20 to-transparent" />
      </div>
    </motion.div>
  );
}

/**
 * Individual Candidate Slot Component
 */
function CandidateSlot({
  candidate,
  index,
  listId,
  hasSelectedItem = false
}: {
  candidate: AwardCandidate;
  index: number;
  listId: string;
  hasSelectedItem?: boolean;
}) {
  const isEmpty = !candidate.title;
  const dropId = `candidate-${listId}-${index}`;
  const clickAssign = useClickAssign();

  // Each candidate slot is also a drop zone
  const { isOver, setNodeRef } = useDroppable({
    id: dropId,
    data: {
      type: 'candidate-slot',
      listId,
      slotIndex: index,
      dropId
    }
  });

  // Handle click-to-assign for candidate slot
  const handleClick = () => {
    if (hasSelectedItem && clickAssign && isEmpty) {
      clickAssign.assignToCandidate(listId, index);
    }
  };

  const showClickHint = hasSelectedItem && isEmpty;

  return (
    <motion.div
      ref={setNodeRef}
      onClick={handleClick}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.05 }}
      whileHover={isEmpty ? { scale: 1.05, borderColor: 'rgba(234, 179, 8, 0.3)' } : { scale: 1.03 }}
      className={`
        relative aspect-[3/4] rounded-lg overflow-hidden
        transition-all duration-200
        ${isEmpty
          ? 'bg-gray-800/30 border border-dashed border-gray-700/50'
          : 'bg-gray-800/50 border border-white/10'
        }
        ${isOver ? 'ring-2 ring-yellow-500/50 border-yellow-500/50 bg-yellow-500/5' : ''}
        ${showClickHint ? 'ring-2 ring-cyan-500/50 border-cyan-500/50 bg-cyan-500/5 cursor-pointer' : ''}
      `}
    >
      {isEmpty ? (
        /* Empty Slot */
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <Plus className={`w-4 h-4 ${isOver ? 'text-yellow-500' : showClickHint ? 'text-cyan-500' : 'text-gray-600'}`} />
          {(isOver || showClickHint) && (
            <span className={`text-[8px] mt-1 ${isOver ? 'text-yellow-500' : 'text-cyan-500'}`}>
              {isOver ? 'Drop' : 'Click'}
            </span>
          )}
        </div>
      ) : (
        /* Filled Slot */
        <>
          <ProgressiveImage
            src={candidate.image_url}
            alt={candidate.title}
            itemTitle={candidate.title}
            autoFetchWiki={true}
            className="w-full h-full object-cover"
          />

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

          {/* Nominee number badge */}
          <div className="absolute top-1 left-1 w-4 h-4 rounded-full bg-black/60 border border-white/20 flex items-center justify-center">
            <span className="text-[8px] font-bold text-white">{index + 1}</span>
          </div>

          {/* Title */}
          <div className="absolute bottom-0 left-0 right-0 p-1.5">
            <p className="text-[8px] font-medium text-white truncate leading-tight">
              {candidate.title}
            </p>
          </div>
        </>
      )}
    </motion.div>
  );
}
