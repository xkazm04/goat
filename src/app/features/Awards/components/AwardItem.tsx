"use client";

import { useDroppable } from "@dnd-kit/core";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, X, Sparkles, Crown, Award, Plus } from "lucide-react";
import { GridItemType } from "@/types/match";
import { TopList } from "@/types/top-lists";
import { ProgressiveImage } from "@/components/ui/progressive-image";
import { useState, useEffect } from "react";

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
  getItemTitle: (item: any) => string;
  index?: number;
}

/**
 * Premium Award Item Card
 * Displays award category with 5 candidate slots and a winner podium
 * Title and description are positioned at the top to maximize space for candidates
 */
export function AwardItem({ 
  list, 
  gridItem, 
  candidates = [],
  onRemove, 
  onAddCandidate,
  getItemTitle, 
  index = 0 
}: AwardItemProps) {
  const [justAwarded, setJustAwarded] = useState(false);
  const isOccupied = !!(gridItem && gridItem.matched);
  const dropId = `award-${list.id}`;

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

  // Pad candidates to always show 5 slots
  const displayCandidates = [...candidates];
  while (displayCandidates.length < 5) {
    displayCandidates.push({ id: `empty-${displayCandidates.length}`, title: '', image_url: null });
  }

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
          <div className="flex items-center gap-5">
            
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
                  />
                ))}
              </div>
            </div>

            {/* Divider */}
            <div className="flex flex-col items-center gap-2 px-2">
              <div className="w-px h-8 bg-gradient-to-b from-transparent via-yellow-500/30 to-transparent" />
              <Sparkles className="w-4 h-4 text-yellow-500/40" />
              <div className="w-px h-8 bg-gradient-to-b from-transparent via-yellow-500/30 to-transparent" />
            </div>

            {/* Winner Podium */}
            <div className="flex-shrink-0">
              <div className="flex items-center gap-2 mb-3">
                <Crown className="w-3 h-3 text-yellow-500" />
                <span className="text-[10px] font-semibold text-yellow-500 uppercase tracking-wider">
                  Winner
                </span>
              </div>
              
              <motion.div
                ref={setNodeRef}
                animate={{
                  scale: isOver ? 1.05 : justAwarded ? [1, 1.1, 1] : 1,
                }}
                transition={{ duration: 0.3 }}
                className="relative"
              >
                {/* Winner Display Box */}
                <div className={`
                  relative w-28 h-36 rounded-xl overflow-hidden
                  transition-all duration-300
                  ${isOccupied 
                    ? 'bg-gradient-to-b from-yellow-500/20 to-yellow-600/10 border-yellow-500/40' 
                    : 'bg-gradient-to-b from-gray-800/60 to-gray-900/60 border-white/10'
                  }
                  ${isOver ? 'ring-2 ring-yellow-500 ring-offset-2 ring-offset-gray-900 border-yellow-500/50' : 'border'}
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

                        {/* Crown badge */}
                        <motion.div
                          initial={{ scale: 0, rotate: -20 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{ delay: 0.3, type: "spring" }}
                          className="absolute top-2 left-1/2 -translate-x-1/2 p-1.5 bg-yellow-500 rounded-full shadow-lg shadow-yellow-500/50"
                        >
                          <Crown className="w-3.5 h-3.5 text-black" />
                        </motion.div>

                        {/* Winner name */}
                        <div className="absolute bottom-0 left-0 right-0 p-2 text-center">
                          <p className="text-[11px] font-bold text-white truncate drop-shadow-lg">
                            {getItemTitle(gridItem)}
                          </p>
                          <p className="text-[9px] text-yellow-400 uppercase tracking-wider font-medium">
                            Winner
                          </p>
                        </div>

                        {/* Remove button */}
                        <motion.button
                          initial={{ opacity: 0, scale: 0.5 }}
                          animate={{ opacity: 1, scale: 1 }}
                          whileHover={{ scale: 1.1, backgroundColor: 'rgba(239, 68, 68, 0.8)' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemove();
                          }}
                          className="absolute top-2 right-2 p-1 rounded-full bg-black/50 text-white/70 hover:text-white backdrop-blur-sm border border-white/20 z-30 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </motion.button>

                        {/* Celebration sparkles */}
                        {justAwarded && (
                          <>
                            {[...Array(6)].map((_, i) => (
                              <motion.div
                                key={i}
                                initial={{ opacity: 1, scale: 0, x: 0, y: 0 }}
                                animate={{ 
                                  opacity: 0, 
                                  scale: 1,
                                  x: (Math.random() - 0.5) * 80,
                                  y: (Math.random() - 0.5) * 80
                                }}
                                transition={{ duration: 0.8, delay: i * 0.08 }}
                                className="absolute top-1/2 left-1/2 pointer-events-none"
                              >
                                <Sparkles className="w-3 h-3 text-yellow-400" />
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
                        className="absolute inset-0 flex flex-col items-center justify-center p-3"
                      >
                        {/* Trophy outline */}
                        <motion.div
                          animate={{
                            scale: isOver ? 1.2 : 1,
                            opacity: isOver ? 1 : 0.3,
                          }}
                          transition={{ duration: 0.2 }}
                          className="mb-2"
                        >
                          <Trophy className={`w-8 h-8 ${isOver ? 'text-yellow-500' : 'text-gray-600'}`} />
                        </motion.div>

                        {/* Drop hint */}
                        <motion.p
                          animate={{ opacity: isOver ? 1 : 0.5 }}
                          className={`text-[10px] text-center font-medium leading-tight ${isOver ? 'text-yellow-400' : 'text-gray-500'}`}
                        >
                          {isOver ? 'Release to Award!' : 'Drop Winner Here'}
                        </motion.p>

                        {/* Animated border on hover */}
                        {isOver && (
                          <motion.div
                            className="absolute inset-0 border-2 border-dashed border-yellow-500/60 rounded-xl"
                            animate={{ opacity: [0.4, 1, 0.4] }}
                            transition={{ duration: 1, repeat: Infinity }}
                          />
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Glow effect */}
                {(isOver || isOccupied) && (
                  <div className="absolute -inset-2 bg-yellow-500/10 rounded-2xl blur-xl -z-10" />
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
  listId 
}: { 
  candidate: AwardCandidate; 
  index: number; 
  listId: string;
}) {
  const isEmpty = !candidate.title;
  const dropId = `candidate-${listId}-${index}`;

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

  return (
    <motion.div
      ref={setNodeRef}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.05 }}
      whileHover={isEmpty ? { scale: 1.05, borderColor: 'rgba(234, 179, 8, 0.3)' } : { scale: 1.03 }}
      className={`
        relative aspect-[3/4] rounded-lg overflow-hidden cursor-pointer
        transition-all duration-200
        ${isEmpty 
          ? 'bg-gray-800/30 border border-dashed border-gray-700/50' 
          : 'bg-gray-800/50 border border-white/10'
        }
        ${isOver ? 'ring-2 ring-yellow-500/50 border-yellow-500/50 bg-yellow-500/5' : ''}
      `}
    >
      {isEmpty ? (
        /* Empty Slot */
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <Plus className={`w-4 h-4 ${isOver ? 'text-yellow-500' : 'text-gray-600'}`} />
          {isOver && (
            <span className="text-[8px] text-yellow-500 mt-1">Drop</span>
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
