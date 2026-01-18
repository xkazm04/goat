"use client";

import { motion, useSpring, useTransform } from "framer-motion";
import { useMemo } from "react";
import { PlaceholderImage } from "@/components/ui/placeholder-image";
import { getSpeed, getDirection, Vector2D } from "../lib/physicsEngine";

interface DraggableItem {
  id?: string;
  title: string;
  image_url?: string | null;
}

interface PhysicsDragOverlayProps {
  activeItem: DraggableItem;
  velocity: Vector2D;
  isSnapping?: boolean;
  previewPosition?: number | null;
  gravityWellActive?: boolean;
  gravityWellPosition?: number | null;
  resistance?: number;
}

/**
 * PhysicsDragOverlay - Enhanced drag overlay with physics-driven visuals
 *
 * Features:
 * - Dynamic shadow and glow based on velocity
 * - Rotation tilt based on horizontal movement
 * - Scale bounce on snap
 * - Momentum trail effect
 * - Gravity well attraction indicator
 * - Position resistance visual feedback
 */
export function PhysicsDragOverlay({
  activeItem,
  velocity,
  isSnapping = false,
  previewPosition,
  gravityWellActive = false,
  gravityWellPosition,
  resistance = 0,
}: PhysicsDragOverlayProps) {
  if (!activeItem) return null;

  const speed = getSpeed(velocity);
  const direction = getDirection(velocity);

  // Calculate rotation based on velocity (subtle tilt effect)
  const rotation = useMemo(() => {
    return Math.max(-15, Math.min(15, velocity.x * 0.015));
  }, [velocity.x]);

  // Calculate shadow intensity based on combined velocity
  const shadowIntensity = useMemo(() => {
    return Math.min(1, speed / 500);
  }, [speed]);

  // Calculate scale based on speed (faster = slightly larger)
  const dynamicScale = useMemo(() => {
    const baseScale = isSnapping ? 0.95 : 1.05;
    const speedBoost = Math.min(speed / 2000, 0.1);
    return baseScale + speedBoost;
  }, [speed, isSnapping]);

  // Calculate momentum trail angle
  const trailAngle = useMemo(() => {
    return Math.atan2(velocity.y, velocity.x) * (180 / Math.PI) + 180;
  }, [velocity.x, velocity.y]);

  // Spring animations for smooth transitions
  const springScale = useSpring(dynamicScale, {
    stiffness: 300,
    damping: 20,
  });

  const springRotation = useSpring(rotation, {
    stiffness: 200,
    damping: 15,
  });

  return (
    <motion.div
      initial={{ scale: 1, rotate: 0 }}
      animate={{
        scale: isSnapping ? [1.1, 0.95, 1.02, 1] : dynamicScale,
        rotate: rotation,
      }}
      transition={{
        scale: isSnapping
          ? { duration: 0.35, ease: [0.34, 1.56, 0.64, 1] }
          : { duration: 0.1 },
        rotate: { duration: 0.08 },
      }}
      className="w-24 h-24 rounded-xl overflow-hidden"
      style={{
        marginLeft: '-48px',
        marginTop: '-48px',
        boxShadow: `
          0 ${10 + shadowIntensity * 20}px ${25 + shadowIntensity * 35}px rgba(0, 0, 0, ${0.3 + shadowIntensity * 0.3}),
          0 0 ${35 + shadowIntensity * 25}px rgba(34, 211, 238, ${0.35 + shadowIntensity * 0.35}),
          inset 0 1px 0 rgba(255, 255, 255, 0.15)
        `,
      }}
      data-testid="physics-drag-overlay"
    >
      {/* Gravity Well Attraction Indicator */}
      {gravityWellActive && (
        <motion.div
          className="absolute -inset-2 rounded-2xl pointer-events-none z-0"
          animate={{
            opacity: [0.3, 0.6, 0.3],
            scale: [1, 1.05, 1],
          }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          style={{
            background: "radial-gradient(circle, rgba(34, 211, 238, 0.4) 0%, transparent 70%)",
            border: "2px solid rgba(34, 211, 238, 0.5)",
          }}
          data-testid="gravity-attraction-indicator"
        />
      )}

      {/* Resistance Indicator */}
      {resistance > 0.1 && (
        <motion.div
          className="absolute -inset-1 rounded-xl pointer-events-none z-5"
          animate={{
            opacity: [resistance * 0.3, resistance * 0.5, resistance * 0.3],
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
          }}
          style={{
            border: `2px solid rgba(147, 51, 234, ${resistance * 0.6})`,
            boxShadow: `0 0 ${resistance * 15}px rgba(147, 51, 234, ${resistance * 0.3})`,
          }}
          data-testid="resistance-overlay"
        />
      )}

      {/* Glow border that intensifies when near drop zone */}
      <motion.div
        className="absolute inset-0 rounded-xl pointer-events-none z-20"
        animate={{
          boxShadow: previewPosition !== null
            ? "inset 0 0 20px rgba(34, 211, 238, 0.6), 0 0 25px rgba(34, 211, 238, 0.5)"
            : gravityWellActive
              ? "inset 0 0 15px rgba(34, 211, 238, 0.4), 0 0 18px rgba(34, 211, 238, 0.3)"
              : "inset 0 0 0px transparent",
        }}
        transition={{ duration: 0.15 }}
      />

      {/* Border */}
      <motion.div
        className="absolute inset-0 rounded-xl border-2 pointer-events-none z-10"
        animate={{
          borderColor: previewPosition !== null
            ? "rgba(34, 211, 238, 1)"
            : gravityWellActive
              ? "rgba(34, 211, 238, 0.8)"
              : "rgba(34, 211, 238, 0.6)",
        }}
        transition={{ duration: 0.1 }}
      />

      {/* Content */}
      <PlaceholderImage
        src={activeItem.image_url}
        alt={activeItem.title}
        testId="physics-drag-image"
        seed={activeItem.id || activeItem.title}
        eager={true}
        blurAmount={15}
        fallbackComponent={
          <span className="text-xs text-gray-400 text-center px-2">
            {activeItem.title}
          </span>
        }
      />

      {/* Position preview indicator */}
      {typeof previewPosition === "number" && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: -5 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="absolute top-1 right-1 bg-cyan-500/95 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md backdrop-blur-sm z-30"
          data-testid="physics-position-preview"
        >
          #{previewPosition + 1}
        </motion.div>
      )}

      {/* Gravity well target position indicator */}
      {gravityWellActive && typeof gravityWellPosition === 'number' && gravityWellPosition !== previewPosition && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 0.7, scale: 1 }}
          className="absolute top-1 left-1 bg-purple-500/80 text-white text-[9px] font-bold px-1 py-0.5 rounded-md backdrop-blur-sm z-30 flex items-center gap-0.5"
          data-testid="gravity-target-indicator"
        >
          <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="12" r="4" />
          </svg>
          #{gravityWellPosition + 1}
        </motion.div>
      )}

      {/* Velocity trail effect - visible at higher speeds */}
      {speed > 150 && (
        <motion.div
          className="absolute inset-0 pointer-events-none z-5"
          animate={{
            opacity: Math.min(0.5, speed / 800),
          }}
          style={{
            background: `linear-gradient(${trailAngle}deg, transparent 20%, rgba(34, 211, 238, ${Math.min(0.4, speed / 1200)}) 100%)`,
          }}
          data-testid="velocity-trail"
        />
      )}

      {/* Speed indicator ring - appears at high velocity */}
      {speed > 500 && (
        <motion.div
          className="absolute -inset-3 rounded-2xl pointer-events-none z-0"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{
            opacity: [0.2, 0.4, 0.2],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 0.3,
            repeat: Infinity,
          }}
          style={{
            border: `2px solid rgba(255, 255, 255, ${Math.min(0.3, speed / 2000)})`,
          }}
          data-testid="speed-ring"
        />
      )}

      {/* Snap animation burst */}
      {isSnapping && (
        <motion.div
          className="absolute inset-0 pointer-events-none z-25"
          initial={{ opacity: 0, scale: 1 }}
          animate={{
            opacity: [0, 0.8, 0],
            scale: [1, 1.3, 1.5],
          }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          style={{
            background: "radial-gradient(circle, rgba(34, 211, 238, 0.5) 0%, transparent 60%)",
          }}
          data-testid="snap-burst"
        />
      )}
    </motion.div>
  );
}

/**
 * PhysicsTrail - Enhanced trailing effect with physics influence
 */
interface PhysicsTrailProps {
  positions: Array<{ x: number; y: number; timestamp: number }>;
  velocity: Vector2D;
  gravityWellActive?: boolean;
}

export function PhysicsTrail({
  positions,
  velocity,
  gravityWellActive = false,
}: PhysicsTrailProps) {
  const now = Date.now();
  const maxAge = 250; // Trail lifetime in ms
  const speed = getSpeed(velocity);

  // Filter to only recent positions
  const validPositions = positions.filter((p) => now - p.timestamp < maxAge);

  if (validPositions.length < 2) return null;

  // Trail color based on state
  const trailColor = gravityWellActive
    ? "rgba(147, 51, 234, 0.4)" // Purple when in gravity well
    : "rgba(34, 211, 238, 0.4)"; // Cyan normally

  return (
    <svg
      className="fixed inset-0 pointer-events-none z-[98]"
      data-testid="physics-trail"
    >
      <defs>
        <linearGradient id="physicsTrailGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="transparent" />
          <stop offset="100%" stopColor={trailColor} />
        </linearGradient>
      </defs>

      {validPositions.slice(0, -1).map((pos, idx) => {
        const nextPos = validPositions[idx + 1];
        const age = now - pos.timestamp;
        const opacity = (1 - age / maxAge) * Math.min(1, speed / 300);
        const strokeWidth = (3 + speed / 400) * opacity;

        return (
          <line
            key={idx}
            x1={pos.x}
            y1={pos.y}
            x2={nextPos.x}
            y2={nextPos.y}
            stroke={trailColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            opacity={opacity * 0.6}
          />
        );
      })}

      {/* Add glow effect for high-speed trails */}
      {speed > 400 &&
        validPositions.slice(-5).map((pos, idx) => {
          if (idx >= validPositions.length - 1) return null;
          const nextPos = validPositions[validPositions.length - 5 + idx + 1];
          if (!nextPos) return null;

          return (
            <line
              key={`glow-${idx}`}
              x1={pos.x}
              y1={pos.y}
              x2={nextPos.x}
              y2={nextPos.y}
              stroke={gravityWellActive ? "rgba(147, 51, 234, 0.2)" : "rgba(34, 211, 238, 0.2)"}
              strokeWidth={8}
              strokeLinecap="round"
              opacity={0.5}
              filter="blur(4px)"
            />
          );
        })}
    </svg>
  );
}

/**
 * GravityWellConnector - Visual line connecting dragged item to gravity well
 */
interface GravityWellConnectorProps {
  fromPosition: { x: number; y: number };
  toPosition: { x: number; y: number };
  strength: number;
}

export function GravityWellConnector({
  fromPosition,
  toPosition,
  strength,
}: GravityWellConnectorProps) {
  const distance = Math.sqrt(
    Math.pow(toPosition.x - fromPosition.x, 2) +
    Math.pow(toPosition.y - fromPosition.y, 2)
  );

  // Calculate control point for curved line
  const midX = (fromPosition.x + toPosition.x) / 2;
  const midY = (fromPosition.y + toPosition.y) / 2;

  // Perpendicular offset for curve
  const dx = toPosition.x - fromPosition.x;
  const dy = toPosition.y - fromPosition.y;
  const perpX = -dy / distance;
  const perpY = dx / distance;

  const curveOffset = Math.min(distance * 0.2, 50);
  const controlX = midX + perpX * curveOffset;
  const controlY = midY + perpY * curveOffset;

  return (
    <svg
      className="fixed inset-0 pointer-events-none z-[97]"
      data-testid="gravity-well-connector"
    >
      <defs>
        <linearGradient
          id="gravityConnectorGradient"
          x1={fromPosition.x}
          y1={fromPosition.y}
          x2={toPosition.x}
          y2={toPosition.y}
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="rgba(34, 211, 238, 0.1)" />
          <stop offset="50%" stopColor={`rgba(34, 211, 238, ${strength * 0.5})`} />
          <stop offset="100%" stopColor={`rgba(34, 211, 238, ${strength * 0.8})`} />
        </linearGradient>
      </defs>

      {/* Main connector line */}
      <motion.path
        d={`M ${fromPosition.x} ${fromPosition.y} Q ${controlX} ${controlY} ${toPosition.x} ${toPosition.y}`}
        stroke="url(#gravityConnectorGradient)"
        strokeWidth={2 + strength * 2}
        fill="none"
        strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{
          pathLength: 1,
          opacity: strength,
        }}
        transition={{ duration: 0.3 }}
      />

      {/* Pulsing dots along the line */}
      {[0.25, 0.5, 0.75].map((t, idx) => {
        const x = (1 - t) * (1 - t) * fromPosition.x + 2 * (1 - t) * t * controlX + t * t * toPosition.x;
        const y = (1 - t) * (1 - t) * fromPosition.y + 2 * (1 - t) * t * controlY + t * t * toPosition.y;

        return (
          <motion.circle
            key={idx}
            cx={x}
            cy={y}
            r={3 + strength * 2}
            fill="rgba(34, 211, 238, 0.6)"
            initial={{ scale: 0, opacity: 0 }}
            animate={{
              scale: [1, 1.5, 1],
              opacity: [0.3, 0.7, 0.3],
            }}
            transition={{
              duration: 1,
              delay: idx * 0.2,
              repeat: Infinity,
            }}
          />
        );
      })}

      {/* Target indicator at gravity well */}
      <motion.circle
        cx={toPosition.x}
        cy={toPosition.y}
        r={8 + strength * 6}
        fill="none"
        stroke="rgba(34, 211, 238, 0.5)"
        strokeWidth={2}
        initial={{ scale: 0 }}
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.5, 0.8, 0.5],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    </svg>
  );
}

export default PhysicsDragOverlay;
