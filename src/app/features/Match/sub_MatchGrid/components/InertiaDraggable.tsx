"use client";

import { useDraggable } from "@dnd-kit/core";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { ReactNode, useEffect, useRef, useState } from "react";
import { calculateInertiaSnap, GridConfig, DEFAULT_GRID_CONFIG } from "../lib/snapToGrid";

interface InertiaDraggableProps {
  id: string;
  data: any;
  disabled?: boolean;
  children: ReactNode;
  gridConfig?: GridConfig;
  onSnapPreview?: (position: number | null) => void;
  className?: string;
  testId?: string;
}

/**
 * InertiaDraggable - Enhanced draggable with Framer Motion inertia
 *
 * Combines dnd-kit's drag mechanics with Framer Motion's spring physics
 * for a fluid, game-like drag experience with snap-to-grid behavior.
 */
export function InertiaDraggable({
  id,
  data,
  disabled = false,
  children,
  gridConfig = DEFAULT_GRID_CONFIG,
  onSnapPreview,
  className = "",
  testId,
}: InertiaDraggableProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id,
    data,
    disabled,
  });

  // Motion values for smooth animation
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const scale = useMotionValue(1);
  const shadowOpacity = useMotionValue(0);

  // Spring physics for inertia effect
  const springConfig = { damping: 25, stiffness: 300, mass: 0.8 };
  const springX = useSpring(x, springConfig);
  const springY = useSpring(y, springConfig);
  const springScale = useSpring(scale, { damping: 20, stiffness: 400 });
  const springShadow = useSpring(shadowOpacity, { damping: 20, stiffness: 300 });

  // Velocity tracking for inertia
  const velocityRef = useRef({ x: 0, y: 0 });
  const lastPositionRef = useRef({ x: 0, y: 0 });
  const [isSnapping, setIsSnapping] = useState(false);

  // Transform shadow opacity to actual shadow values
  const boxShadow = useTransform(
    springShadow,
    [0, 1],
    [
      "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
      "0 25px 50px -12px rgba(34, 211, 238, 0.4), 0 0 30px rgba(34, 211, 238, 0.3)",
    ]
  );

  // Update position and calculate velocity
  useEffect(() => {
    if (transform) {
      const currentX = transform.x;
      const currentY = transform.y;

      // Calculate velocity
      velocityRef.current = {
        x: (currentX - lastPositionRef.current.x) * 60, // Approximate velocity at 60fps
        y: (currentY - lastPositionRef.current.y) * 60,
      };

      lastPositionRef.current = { x: currentX, y: currentY };

      // Update motion values
      x.set(currentX);
      y.set(currentY);

      // Calculate snap preview
      if (onSnapPreview && isDragging) {
        const snapResult = calculateInertiaSnap(
          currentX,
          currentY,
          velocityRef.current.x,
          velocityRef.current.y,
          gridConfig
        );

        if (snapResult.snapped && snapResult.point) {
          onSnapPreview(snapResult.point.position.index);
        } else {
          onSnapPreview(null);
        }
      }
    }
  }, [transform, x, y, isDragging, onSnapPreview, gridConfig]);

  // Handle drag state changes
  useEffect(() => {
    if (isDragging) {
      scale.set(1.05);
      shadowOpacity.set(1);
      setIsSnapping(false);
    } else {
      scale.set(1);
      shadowOpacity.set(0);

      // Apply inertia snap when drag ends
      if (velocityRef.current.x !== 0 || velocityRef.current.y !== 0) {
        setIsSnapping(true);
        // Reset velocity after snap
        setTimeout(() => {
          velocityRef.current = { x: 0, y: 0 };
          setIsSnapping(false);
        }, 300);
      }
    }
  }, [isDragging, scale, shadowOpacity]);

  return (
    <motion.div
      ref={setNodeRef}
      style={{
        x: isDragging ? springX : 0,
        y: isDragging ? springY : 0,
        scale: springScale,
        boxShadow: isDragging ? boxShadow : undefined,
        zIndex: isDragging ? 100 : 1,
        cursor: isDragging ? "grabbing" : disabled ? "default" : "grab",
        touchAction: "none",
      }}
      className={`${className} ${isDragging ? "select-none" : ""}`}
      data-testid={testId || `inertia-draggable-${id}`}
      data-dragging={isDragging}
      data-snapping={isSnapping}
      {...attributes}
      {...listeners}
    >
      {/* Drag highlight overlay */}
      {isDragging && (
        <motion.div
          className="absolute inset-0 rounded-xl pointer-events-none z-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            background: "radial-gradient(circle at center, rgba(34, 211, 238, 0.15) 0%, transparent 70%)",
            border: "2px solid rgba(34, 211, 238, 0.5)",
          }}
          data-testid="drag-highlight"
        />
      )}
      {children}
    </motion.div>
  );
}

/**
 * Hook to track drag velocity for inertia calculations
 */
export function useDragVelocity() {
  const velocityX = useMotionValue(0);
  const velocityY = useMotionValue(0);
  const lastPositionRef = useRef({ x: 0, y: 0 });
  const lastTimeRef = useRef(Date.now());

  const updateVelocity = (currentX: number, currentY: number) => {
    const now = Date.now();
    const deltaTime = (now - lastTimeRef.current) / 1000; // Convert to seconds

    if (deltaTime > 0) {
      velocityX.set((currentX - lastPositionRef.current.x) / deltaTime);
      velocityY.set((currentY - lastPositionRef.current.y) / deltaTime);
    }

    lastPositionRef.current = { x: currentX, y: currentY };
    lastTimeRef.current = now;
  };

  const reset = () => {
    velocityX.set(0);
    velocityY.set(0);
    lastPositionRef.current = { x: 0, y: 0 };
  };

  return { velocityX, velocityY, updateVelocity, reset };
}
