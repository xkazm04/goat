"use client";

import { useDraggable, useDroppable } from "@dnd-kit/core";
import { GridItemType } from "@/types/match";
import { motion, AnimatePresence, useSpring } from "framer-motion";
import { X, Trophy, Medal } from "lucide-react";
import { useState, useEffect } from "react";

interface SimpleDropZoneProps {
  position: number;
  isOccupied: boolean;
  occupiedBy?: string;
  imageUrl?: string | null;
  gridItem?: GridItemType;
  onRemove?: () => void;
  dropId?: string;
}

/**
 * "Holo-slot" Drop Zone
 * A futuristic, glass-morphic drop zone with neon accents and dynamic states.
 */
export function SimpleDropZone({
  position,
  isOccupied,
  occupiedBy,
  imageUrl,
  gridItem,
  onRemove,
  dropId
}: SimpleDropZoneProps) {

  // Track when item was just dropped for snap animation
  const [justDropped, setJustDropped] = useState(false);

  // Make occupied items draggable for swapping
  const { attributes, listeners, setNodeRef: setDragNodeRef, transform, isDragging } = useDraggable({
    id: gridItem?.id || `empty-${dropId || position}`,
    disabled: !isOccupied || !gridItem,
    data: {
      type: 'grid-item',
      item: gridItem,
      position: position,
      dropId: dropId // Pass dropId context
    }
  });

  // Always accept drops
  const { isOver, setNodeRef: setDropNodeRef } = useDroppable({
    id: dropId || `drop-${position}`,
    data: {
      type: 'grid-slot',
      position,
      dropId // Pass dropId context
    }
  });

  // Trigger bounce animation when item becomes occupied
  useEffect(() => {
    if (isOccupied && !isDragging) {
      setJustDropped(true);
      const timer = setTimeout(() => setJustDropped(false), 600);
      return () => clearTimeout(timer);
    }
  }, [isOccupied, isDragging]);

  // Combine refs
  const setNodeRef = (node: HTMLElement | null) => {
    setDragNodeRef(node);
    setDropNodeRef(node);
  };

  // Rank Colors & Icons
  const getRankConfig = (pos: number) => {
    if (pos === 0) return { color: '#FFD700', glow: 'shadow-yellow-500/50', icon: Trophy, label: 'CHAMPION' };
    if (pos === 1) return { color: '#C0C0C0', glow: 'shadow-slate-400/50', icon: Medal, label: '2ND PLACE' };
    if (pos === 2) return { color: '#CD7F32', glow: 'shadow-orange-700/50', icon: Medal, label: '3RD PLACE' };
    return { color: '#22d3ee', glow: 'shadow-cyan-500/30', icon: null, label: `#${pos + 1}` };
  };

  const rankConfig = getRankConfig(position);
  const isTop3 = position < 3;

  // Apply drag transform
  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0) scale(1.05)`,
    zIndex: 100,
  } : undefined;

  return (
    <motion.div
      ref={setNodeRef}
      style={style as any}
      initial={false}
      animate={{
        scale: justDropped ? [1, 1.15, 0.95, 1.02, 1] : isOver ? 1.05 : 1,
        borderColor: isOver ? rankConfig.color : isOccupied ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)',
      }}
      transition={{
        scale: justDropped
          ? {
            duration: 0.6,
            ease: "easeOut",
          }
          : { duration: 0.2 },
      }}
      className={`
        relative aspect-square rounded-xl overflow-hidden group
        border-2 transition-colors duration-300
        ${isOccupied ? 'bg-gray-900/80' : 'bg-gray-900/20'}
        ${isOver ? `shadow-[0_0_30px_${rankConfig.color}40]` : ''}
      `}
      data-testid={`drop-zone-${position}`}
      {...(isOccupied ? attributes : {})}
      {...(isOccupied ? listeners : {})}
    >
      {/* Background Grid Pattern (Holo Effect) */}
      {!isOccupied && (
        <div className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `radial-gradient(${rankConfig.color} 1px, transparent 1px)`,
            backgroundSize: '10px 10px'
          }}
        />
      )}

      {/* Rank Number Background */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
        <span
          className="text-[6rem] font-black select-none transition-all duration-500"
          style={{
            color: rankConfig.color,
            opacity: isOver ? 0.2 : isOccupied ? 0 : 0.05,
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
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0"
          >
            {/* Image */}
            {imageUrl ? (
              <div className="absolute inset-0">
                <img
                  src={imageUrl}
                  alt={occupiedBy}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
              </div>
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-900" />
            )}

            {/* Rank Badge (Top Left) */}
            <div className="absolute top-2 left-2 z-20">
              <div
                className="px-2 py-1 rounded-md backdrop-blur-md border border-white/10 flex items-center gap-1 shadow-lg"
                style={{ backgroundColor: `${rankConfig.color}20` }}
              >
                {isTop3 && rankConfig.icon && <rankConfig.icon className="w-3 h-3" style={{ color: rankConfig.color }} />}
                <span className="text-[10px] font-bold text-white tracking-wider">
                  {isTop3 ? rankConfig.label : `#${position + 1}`}
                </span>
              </div>
            </div>

            {/* Remove Button (Top Right) */}
            {onRemove && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                whileHover={{ scale: 1.1, backgroundColor: 'rgba(239, 68, 68, 0.2)' }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove();
                }}
                className="absolute top-2 right-2 p-1.5 rounded-full bg-black/40 text-white/70 hover:text-red-400 backdrop-blur-md border border-white/10 z-30 opacity-0 group-hover:opacity-100 transition-opacity"
                data-testid={`remove-item-btn-${position}`}
              >
                <X className="w-3 h-3" />
              </motion.button>
            )}

            {/* Title Overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-3 z-20">
              <p className="text-xs font-medium text-white/90 line-clamp-2 text-shadow-sm leading-tight">
                {occupiedBy}
              </p>
            </div>

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
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="text-cyan-400 font-bold text-xs tracking-widest uppercase"
              >
                Drop Here
              </motion.div>
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
        style={{ boxShadow: `inset 0 0 20px ${rankConfig.color}20` }}
      />

      {/* Active Selection Ring */}
      {isOver && (
        <motion.div
          layoutId="active-ring"
          className="absolute -inset-[2px] rounded-xl border-2 pointer-events-none z-50"
          style={{ borderColor: rankConfig.color }}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
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
            boxShadow: `0 0 30px 8px ${rankConfig.color}, inset 0 0 20px ${rankConfig.color}`,
            border: `2px solid ${rankConfig.color}`
          }}
          data-testid="snap-glow"
        />
      )}
    </motion.div>
  );
}

