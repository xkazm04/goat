"use client";

import { useDroppable } from "@dnd-kit/core";
import { motion, AnimatePresence, useSpring, useTransform } from "framer-motion";
import { useState, useEffect, useRef, useCallback } from "react";
import { DropCelebration } from "../../sub_MatchCollections/components/DropCelebration";
import { createGridSlotDropData } from "@/lib/dnd";
import { getRankColor, isPodiumPosition } from "../../lib/rankConfig";
import { getPositionAwareSpringConfig, getFramerSpringConfig } from "../lib/physicsEngine";
import { triggerHaptic, isHapticSupported } from "../lib/hapticFeedback";
import { PositionBadge } from "../../components/PositionBadge";

interface PhysicsGridSlotProps {
  position: number;
  gridItem: any;
  size?: "small" | "medium" | "large";
  selectedBacklogItem?: string | null;
  selectedGridItem?: string | null;
  onGridItemClick?: (id: string) => void;
  /** Item tenure in ms for resistance calculation */
  itemTenure?: number;
  /** Whether to enable physics effects */
  enablePhysics?: boolean;
  /** Whether item is being swapped */
  isSwapping?: boolean;
  /** Swap animation path if swapping */
  swapPath?: Array<{ x: number; y: number }>;
  /** Register ref for gravity well calculations */
  onRegisterSlot?: (position: number, element: HTMLElement | null) => void;
  /** Gravity well influence (0-1) for visual effect */
  gravityInfluence?: number;
}

/**
 * PhysicsGridSlot - Enhanced grid slot with physics-based animations
 *
 * Features:
 * - Spring physics for natural movement
 * - Bounce animation on drop
 * - Gravity well visual effects
 * - Position resistance indicator
 * - Haptic feedback integration
 */
export function PhysicsGridSlot({
  position,
  gridItem,
  size = "medium",
  selectedBacklogItem,
  selectedGridItem,
  onGridItemClick,
  itemTenure = 0,
  enablePhysics = true,
  isSwapping = false,
  swapPath,
  onRegisterSlot,
  gravityInfluence = 0,
}: PhysicsGridSlotProps) {
  const isOccupied = gridItem?.matched;
  const slotRef = useRef<HTMLDivElement>(null);

  const { setNodeRef, isOver } = useDroppable({
    id: `grid-${position}`,
    data: createGridSlotDropData(position, isOccupied, gridItem),
  });

  // Combine refs
  const combinedRef = useCallback((node: HTMLDivElement | null) => {
    setNodeRef(node);
    (slotRef as any).current = node;
    onRegisterSlot?.(position, node);
  }, [setNodeRef, onRegisterSlot, position]);

  const isSelected = selectedGridItem === gridItem?.id;
  const isTop3 = isPodiumPosition(position);
  const rankColor = getRankColor(position);

  // Physics state
  const [justDropped, setJustDropped] = useState(false);
  const [bounceCount, setBounceCount] = useState(0);
  const prevOccupiedRef = useRef(isOccupied);

  // Spring physics for slot animations
  const springConfig = getPositionAwareSpringConfig(position);
  const framerConfig = getFramerSpringConfig(springConfig);

  // Gravity well visual effect
  const gravityGlow = useSpring(gravityInfluence * 100, {
    stiffness: 200,
    damping: 20,
  });

  // Calculate resistance visual intensity
  const resistanceLevel = Math.min(itemTenure / 60000, 1); // Max at 1 minute

  // Trigger celebration when item becomes occupied
  useEffect(() => {
    const wasEmpty = !prevOccupiedRef.current;
    const isNowOccupied = isOccupied;

    if (wasEmpty && isNowOccupied) {
      setJustDropped(true);

      // Calculate bounce count based on position (top positions get more bounces)
      const bounces = isTop3 ? 3 : position < 10 ? 2 : 1;
      setBounceCount(bounces);

      const timer = setTimeout(() => {
        setJustDropped(false);
        setBounceCount(0);
      }, 800);

      return () => clearTimeout(timer);
    }

    prevOccupiedRef.current = isOccupied;
  }, [isOccupied, isTop3, position]);

  // Haptic feedback on hover (subtle)
  useEffect(() => {
    if (isOver && isHapticSupported()) {
      triggerHaptic('dragOver');
    }
  }, [isOver]);

  const sizeClasses = {
    small: "w-20 h-20",
    medium: "w-28 h-28",
    large: "w-36 h-36",
  };

  const handleClick = () => {
    if (isOccupied && gridItem?.id && onGridItemClick) {
      onGridItemClick(gridItem.id);
      if (isHapticSupported()) {
        triggerHaptic('buttonPress');
      }
    }
  };

  // Calculate bounce animation keyframes
  const getBounceKeyframes = () => {
    if (!justDropped || bounceCount === 0) return [1];

    const bounces = [];
    let amplitude = isTop3 ? 0.2 : 0.15;
    bounces.push(1); // Initial

    for (let i = 0; i < bounceCount; i++) {
      bounces.push(1 + amplitude); // Peak
      amplitude *= 0.6; // Decay
      bounces.push(1 - amplitude * 0.5); // Valley
    }

    bounces.push(1); // Settle
    return bounces;
  };

  // Calculate rotation keyframes for wobble
  const getRotationKeyframes = () => {
    if (!justDropped || !isTop3) return [0];

    return [0, -2, 2, -1.5, 1.5, -0.5, 0.5, 0];
  };

  return (
    <motion.div
      ref={combinedRef}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{
        opacity: 1,
        scale: justDropped ? getBounceKeyframes() : isOver ? 1.05 : 1,
        rotate: justDropped ? getRotationKeyframes() : 0,
      }}
      transition={{
        opacity: { delay: position * 0.02 },
        scale: justDropped
          ? {
            duration: 0.8,
            ease: [0.34, 1.56, 0.64, 1],
            times: justDropped ? getBounceKeyframes().map((_, i, arr) => i / (arr.length - 1)) : undefined,
          }
          : {
            ...framerConfig,
            duration: 0.2,
          },
        rotate: { duration: 0.6, ease: "easeOut" },
      }}
      onClick={handleClick}
      className={`
        ${sizeClasses[size]}
        relative rounded-lg border-2 transition-colors duration-200
        ${isOver
          ? "border-blue-500 bg-blue-500/10"
          : "border-gray-700 bg-gray-800/50"
        }
        ${isOccupied ? "border-green-500" : ""}
        ${isSelected ? "border-yellow-500 ring-2 ring-yellow-500/50" : ""}
        hover:border-gray-600 hover:bg-gray-800/70
        ${isOccupied && onGridItemClick ? "cursor-pointer" : ""}
        flex flex-col items-center justify-center
      `}
      data-testid={`physics-grid-slot-${position}`}
      data-position={position}
      data-occupied={isOccupied}
      data-gravity-well={gravityInfluence > 0}
    >
      {/* Gravity Well Glow Effect */}
      {gravityInfluence > 0 && enablePhysics && (
        <motion.div
          className="absolute inset-0 rounded-lg pointer-events-none z-0"
          style={{
            boxShadow: `0 0 ${gravityGlow}px rgba(34, 211, 238, ${gravityInfluence * 0.5})`,
          }}
          animate={{
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          data-testid="gravity-well-glow"
        />
      )}

      {/* Position Resistance Indicator */}
      {isOccupied && resistanceLevel > 0.1 && enablePhysics && (
        <motion.div
          className="absolute -inset-1 rounded-xl pointer-events-none z-0"
          initial={{ opacity: 0 }}
          animate={{
            opacity: resistanceLevel * 0.3,
            borderWidth: 1 + resistanceLevel * 2,
          }}
          style={{
            border: `solid rgba(147, 51, 234, ${resistanceLevel * 0.5})`,
          }}
          data-testid="resistance-indicator"
        />
      )}

      {/* Position Number - Tier-based visual hierarchy */}
      <PositionBadge position={position} className="absolute top-1 left-1 z-10" />

      {/* Gravity Well Badge for Top 5 */}
      {position < 5 && !isOccupied && (
        <motion.div
          className="absolute top-1 right-1 z-10"
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.5, 0.8, 0.5],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          data-testid="gravity-badge"
        >
          <svg
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="3" className="text-cyan-400" fill="currentColor" opacity="0.5" />
            <circle cx="12" cy="12" r="6" className="text-cyan-400" opacity="0.3" />
            <circle cx="12" cy="12" r="9" className="text-cyan-400" opacity="0.1" />
          </svg>
        </motion.div>
      )}

      {/* Item Content */}
      <AnimatePresence mode="wait">
        {isOccupied ? (
          <motion.div
            key={gridItem.id}
            initial={{ opacity: 0, y: -20, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.8 }}
            transition={framerConfig}
            className="w-full h-full p-1 flex flex-col items-center justify-center"
          >
            {gridItem.image_url && (
              <motion.img
                src={gridItem.image_url}
                alt={gridItem.title || ""}
                className="w-full h-full object-cover rounded"
                layoutId={`grid-item-${gridItem.backlogItemId || gridItem.id}`}
              />
            )}
            {!gridItem.image_url && (
              <div className="text-center text-xs text-gray-300 px-1 break-words">
                {gridItem.title || gridItem.name || "Untitled"}
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-gray-600 text-sm"
          >
            {isOver ? (
              <motion.span
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 0.5, repeat: Infinity }}
                className="text-cyan-400"
              >
                Drop!
              </motion.span>
            ) : (
              "Drop here"
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Swap Animation Overlay */}
      {isSwapping && (
        <motion.div
          className="absolute inset-0 rounded-lg pointer-events-none z-30"
          initial={{ opacity: 0 }}
          animate={{
            opacity: [0, 0.5, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{ duration: 0.3 }}
          style={{
            background: "radial-gradient(circle, rgba(34, 211, 238, 0.3) 0%, transparent 70%)",
            border: "2px solid rgba(34, 211, 238, 0.5)",
          }}
          data-testid="swap-overlay"
        />
      )}

      {/* Drop Celebration with physics-enhanced confetti */}
      <DropCelebration
        isActive={justDropped}
        isPodium={isTop3}
        rankColor={rankColor}
        position={position}
      />

      {/* Hover Target Zone Indicator */}
      {isOver && !isOccupied && (
        <motion.div
          className="absolute inset-0 rounded-lg pointer-events-none z-20"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{
            opacity: 1,
            scale: 1,
            boxShadow: [
              "0 0 20px rgba(34, 211, 238, 0.3)",
              "0 0 30px rgba(34, 211, 238, 0.5)",
              "0 0 20px rgba(34, 211, 238, 0.3)",
            ],
          }}
          transition={{
            boxShadow: { duration: 1, repeat: Infinity },
          }}
          style={{
            border: "2px dashed rgba(34, 211, 238, 0.7)",
          }}
          data-testid="hover-indicator"
        />
      )}
    </motion.div>
  );
}

export default PhysicsGridSlot;
