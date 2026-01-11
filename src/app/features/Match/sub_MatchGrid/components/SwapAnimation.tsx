"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useMemo } from "react";
import { calculateSwapPath, Vector2D, getPositionAwareSpringConfig, getFramerSpringConfig } from "../lib/physicsEngine";
import { triggerSwapSequence, isHapticSupported } from "../lib/hapticFeedback";
import { PlaceholderImage } from "@/components/ui/placeholder-image";
import { getPositionBadgeStyles } from "../../components/PositionBadge";

interface SwapItem {
  id: string;
  title: string;
  image_url?: string | null;
  position: number;
}

interface SwapAnimationProps {
  /** First item being swapped */
  itemA: SwapItem;
  /** Second item being swapped */
  itemB: SwapItem;
  /** Position A center coordinates */
  positionA: Vector2D;
  /** Position B center coordinates */
  positionB: Vector2D;
  /** Duration of swap animation in ms */
  duration?: number;
  /** Curve intensity (0-1) */
  curveIntensity?: number;
  /** Callback when swap animation completes */
  onComplete?: () => void;
  /** Whether swap is active */
  isActive: boolean;
}

/**
 * SwapAnimation - Fluid physics-based swap animation
 *
 * Features:
 * - Items pass each other in curved arcs
 * - Spring physics for natural movement
 * - Position-aware animation intensity
 * - Haptic feedback during swap
 * - Visual trail effects
 */
export function SwapAnimation({
  itemA,
  itemB,
  positionA,
  positionB,
  duration = 350,
  curveIntensity = 0.5,
  onComplete,
  isActive,
}: SwapAnimationProps) {
  const [phase, setPhase] = useState<"idle" | "swapping" | "settling">("idle");

  // Calculate spring configs based on positions
  const springConfigA = useMemo(() => {
    const config = getPositionAwareSpringConfig(itemA.position);
    return getFramerSpringConfig(config);
  }, [itemA.position]);

  const springConfigB = useMemo(() => {
    const config = getPositionAwareSpringConfig(itemB.position);
    return getFramerSpringConfig(config);
  }, [itemB.position]);

  // Calculate swap paths
  const pathA = useMemo(() => {
    return calculateSwapPath(positionA, positionB, 20, curveIntensity);
  }, [positionA, positionB, curveIntensity]);

  const pathB = useMemo(() => {
    return calculateSwapPath(positionB, positionA, 20, curveIntensity);
  }, [positionA, positionB, curveIntensity]);

  // Calculate perpendicular direction for arc
  const arcDirection = useMemo(() => {
    const dx = positionB.x - positionA.x;
    const dy = positionB.y - positionA.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance === 0) return { x: 0, y: -1 };
    return { x: -dy / distance, y: dx / distance };
  }, [positionA, positionB]);

  // Arc offset for the curved path
  const arcOffset = useMemo(() => {
    const dx = positionB.x - positionA.x;
    const dy = positionB.y - positionA.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance * curveIntensity * 0.4;
  }, [positionA, positionB, curveIntensity]);

  // Handle swap animation lifecycle
  useEffect(() => {
    if (isActive && phase === "idle") {
      setPhase("swapping");

      // Trigger haptic feedback
      if (isHapticSupported()) {
        triggerSwapSequence(duration);
      }

      // Transition to settling phase
      const settleTimer = setTimeout(() => {
        setPhase("settling");
      }, duration * 0.8);

      // Complete animation
      const completeTimer = setTimeout(() => {
        setPhase("idle");
        onComplete?.();
      }, duration);

      return () => {
        clearTimeout(settleTimer);
        clearTimeout(completeTimer);
      };
    }
  }, [isActive, phase, duration, onComplete]);

  // Reset when deactivated
  useEffect(() => {
    if (!isActive) {
      setPhase("idle");
    }
  }, [isActive]);

  if (!isActive || phase === "idle") return null;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 pointer-events-none z-[200]"
        data-testid="swap-animation-container"
      >
        {/* Trail effect for item A */}
        <SwapTrail
          from={positionA}
          to={positionB}
          arcDirection={arcDirection}
          arcOffset={arcOffset}
          color="rgba(34, 211, 238, 0.3)"
          duration={duration}
        />

        {/* Trail effect for item B */}
        <SwapTrail
          from={positionB}
          to={positionA}
          arcDirection={{ x: -arcDirection.x, y: -arcDirection.y }}
          arcOffset={arcOffset}
          color="rgba(168, 85, 247, 0.3)"
          duration={duration}
        />

        {/* Item A animation */}
        <motion.div
          className="absolute"
          initial={{
            x: positionA.x - 48,
            y: positionA.y - 48,
            scale: 1,
            rotate: 0,
          }}
          animate={{
            x: [
              positionA.x - 48,
              positionA.x + (positionB.x - positionA.x) * 0.5 + arcDirection.x * arcOffset - 48,
              positionB.x - 48,
            ],
            y: [
              positionA.y - 48,
              positionA.y + (positionB.y - positionA.y) * 0.5 + arcDirection.y * arcOffset - 48,
              positionB.y - 48,
            ],
            scale: [1, 1.1, 1],
            rotate: [0, 5, 0],
          }}
          transition={{
            duration: duration / 1000,
            ease: [0.34, 1.56, 0.64, 1],
          }}
          data-testid="swap-item-a"
        >
          <SwapItemCard item={itemA} isHighlighted={true} />
        </motion.div>

        {/* Item B animation */}
        <motion.div
          className="absolute"
          initial={{
            x: positionB.x - 48,
            y: positionB.y - 48,
            scale: 1,
            rotate: 0,
          }}
          animate={{
            x: [
              positionB.x - 48,
              positionB.x + (positionA.x - positionB.x) * 0.5 - arcDirection.x * arcOffset - 48,
              positionA.x - 48,
            ],
            y: [
              positionB.y - 48,
              positionB.y + (positionA.y - positionB.y) * 0.5 - arcDirection.y * arcOffset - 48,
              positionA.y - 48,
            ],
            scale: [1, 1.1, 1],
            rotate: [0, -5, 0],
          }}
          transition={{
            duration: duration / 1000,
            ease: [0.34, 1.56, 0.64, 1],
          }}
          data-testid="swap-item-b"
        >
          <SwapItemCard item={itemB} isHighlighted={false} />
        </motion.div>

        {/* Midpoint flash effect */}
        <motion.div
          className="absolute"
          style={{
            left: (positionA.x + positionB.x) / 2 - 30,
            top: (positionA.y + positionB.y) / 2 - 30,
          }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{
            scale: [0, 1.5, 0],
            opacity: [0, 0.6, 0],
          }}
          transition={{
            duration: duration / 1000,
            times: [0, 0.5, 1],
          }}
          data-testid="swap-midpoint-flash"
        >
          <div
            className="w-[60px] h-[60px] rounded-full"
            style={{
              background: "radial-gradient(circle, rgba(255, 255, 255, 0.4) 0%, transparent 70%)",
            }}
          />
        </motion.div>

        {/* Position indicators during swap */}
        <PositionIndicator
          position={positionA}
          label={`#${itemB.position + 1}`}
          delay={duration * 0.3}
          gridPosition={itemB.position}
        />
        <PositionIndicator
          position={positionB}
          label={`#${itemA.position + 1}`}
          delay={duration * 0.3}
          gridPosition={itemA.position}
        />
      </div>
    </AnimatePresence>
  );
}

/**
 * SwapItemCard - Visual representation of item during swap
 */
interface SwapItemCardProps {
  item: SwapItem;
  isHighlighted: boolean;
}

function SwapItemCard({ item, isHighlighted }: SwapItemCardProps) {
  const borderColor = isHighlighted
    ? "rgba(34, 211, 238, 0.8)"
    : "rgba(168, 85, 247, 0.8)";

  const glowColor = isHighlighted
    ? "rgba(34, 211, 238, 0.4)"
    : "rgba(168, 85, 247, 0.4)";

  return (
    <div
      className="w-24 h-24 rounded-xl overflow-hidden"
      style={{
        boxShadow: `
          0 10px 30px rgba(0, 0, 0, 0.4),
          0 0 30px ${glowColor},
          inset 0 1px 0 rgba(255, 255, 255, 0.1)
        `,
        border: `2px solid ${borderColor}`,
      }}
      data-testid={`swap-card-${item.id}`}
    >
      <PlaceholderImage
        src={item.image_url}
        alt={item.title}
        seed={item.id}
        eager={true}
        fallbackComponent={
          <div className="w-full h-full flex items-center justify-center bg-gray-800">
            <span className="text-xs text-gray-400 text-center px-2">
              {item.title}
            </span>
          </div>
        }
      />

      {/* Position badge - Tier-based visual hierarchy */}
      {(() => {
        const { containerClassName, textClassName, style } = getPositionBadgeStyles(item.position);
        return (
          <div
            className={`absolute top-1 left-1 ${containerClassName} text-[10px] backdrop-blur-sm`}
            style={style}
          >
            <span className={textClassName}>#{item.position + 1}</span>
          </div>
        );
      })()}
    </div>
  );
}

/**
 * SwapTrail - Curved trail effect during swap
 */
interface SwapTrailProps {
  from: Vector2D;
  to: Vector2D;
  arcDirection: Vector2D;
  arcOffset: number;
  color: string;
  duration: number;
}

function SwapTrail({ from, to, arcDirection, arcOffset, color, duration }: SwapTrailProps) {
  const midX = from.x + (to.x - from.x) * 0.5 + arcDirection.x * arcOffset;
  const midY = from.y + (to.y - from.y) * 0.5 + arcDirection.y * arcOffset;

  const pathD = `M ${from.x} ${from.y} Q ${midX} ${midY} ${to.x} ${to.y}`;

  return (
    <svg className="absolute inset-0 w-full h-full" data-testid="swap-trail">
      <defs>
        <linearGradient id={`trailGradient-${from.x}-${from.y}`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="transparent" />
          <stop offset="50%" stopColor={color} />
          <stop offset="100%" stopColor="transparent" />
        </linearGradient>
      </defs>

      <motion.path
        d={pathD}
        stroke={`url(#trailGradient-${from.x}-${from.y})`}
        strokeWidth={4}
        fill="none"
        strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{
          pathLength: [0, 1, 1],
          opacity: [0, 0.8, 0],
        }}
        transition={{
          duration: duration / 1000,
          ease: "easeInOut",
        }}
      />

      {/* Glow effect */}
      <motion.path
        d={pathD}
        stroke={color}
        strokeWidth={12}
        fill="none"
        strokeLinecap="round"
        filter="blur(8px)"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{
          pathLength: [0, 1, 1],
          opacity: [0, 0.3, 0],
        }}
        transition={{
          duration: duration / 1000,
          ease: "easeInOut",
        }}
      />
    </svg>
  );
}

/**
 * PositionIndicator - Shows target position during swap
 */
interface PositionIndicatorProps {
  position: Vector2D;
  label: string;
  delay: number;
  /** 0-indexed position for tier-based styling */
  gridPosition?: number;
}

function PositionIndicator({ position, label, delay, gridPosition = 10 }: PositionIndicatorProps) {
  const { containerClassName, style } = getPositionBadgeStyles(gridPosition);

  return (
    <motion.div
      className="absolute"
      style={{
        left: position.x - 15,
        top: position.y - 50,
      }}
      initial={{ opacity: 0, y: 10, scale: 0.8 }}
      animate={{
        opacity: [0, 1, 1, 0],
        y: [10, 0, 0, -10],
        scale: [0.8, 1, 1, 0.8],
      }}
      transition={{
        duration: 0.6,
        delay: delay / 1000,
        times: [0, 0.2, 0.8, 1],
      }}
      data-testid="position-indicator"
    >
      <div
        className={`${containerClassName} backdrop-blur-sm text-xs font-bold`}
        style={style}
      >
        {label}
      </div>
    </motion.div>
  );
}

export default SwapAnimation;
