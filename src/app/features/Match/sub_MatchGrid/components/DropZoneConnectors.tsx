"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useOptionalDropZoneHighlight } from "./DropZoneHighlightContext";
import { useEffect, useState, useRef, useCallback } from "react";

interface ConnectorLine {
  id: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  distance: number;
  isHovered: boolean;
}

/**
 * DropZoneConnectors - Renders visual trails connecting the dragged item to valid drop zones
 *
 * Features:
 * - Animated connector lines from cursor to nearby drop zones
 * - Distance-based opacity (closer = more visible)
 * - Pulsing animation on the hovered drop zone connector
 * - Smooth enter/exit animations
 */
export function DropZoneConnectors() {
  const highlightContext = useOptionalDropZoneHighlight();
  const [connectors, setConnectors] = useState<ConnectorLine[]>([]);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const prevConnectorsKeyRef = useRef<string>("");

  // Extract values to avoid dependency on the whole context object
  const isDragging = highlightContext?.dragState.isDragging ?? false;
  const dragStateRef = useRef(highlightContext?.dragState);
  dragStateRef.current = highlightContext?.dragState;

  const updateConnectors = useCallback(() => {
    const dragState = dragStateRef.current;
    if (!dragState) return;

    const { cursorPosition, dropZonePositions, hoveredPosition } = dragState;
    const maxDistance = 600; // Max distance for visibility
    const maxConnectors = 5; // Show up to 5 nearest connectors

    const newConnectors: ConnectorLine[] = [];

    // Get all drop zone positions sorted by distance
    const sortedZones = Array.from(dropZonePositions.values())
      .map((zone) => ({
        ...zone,
        distance: Math.hypot(zone.x - cursorPosition.x, zone.y - cursorPosition.y),
      }))
      .filter((zone) => zone.distance < maxDistance)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, maxConnectors);

    sortedZones.forEach((zone) => {
      newConnectors.push({
        id: zone.position,
        x1: cursorPosition.x,
        y1: cursorPosition.y,
        x2: zone.x,
        y2: zone.y,
        distance: zone.distance,
        isHovered: zone.position === hoveredPosition,
      });
    });

    // Only update state if connectors actually changed
    const newKey = newConnectors.map(c => `${c.id}:${Math.round(c.x1)},${Math.round(c.y1)}:${c.isHovered}`).join("|");
    if (newKey !== prevConnectorsKeyRef.current) {
      prevConnectorsKeyRef.current = newKey;
      setConnectors(newConnectors);
    }

    animationFrameRef.current = requestAnimationFrame(updateConnectors);
  }, []);

  useEffect(() => {
    if (!isDragging) {
      if (connectors.length > 0) {
        setConnectors([]);
        prevConnectorsKeyRef.current = "";
      }
      return;
    }

    animationFrameRef.current = requestAnimationFrame(updateConnectors);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isDragging, updateConnectors, connectors.length]);

  if (!highlightContext?.dragState.isDragging || connectors.length === 0) {
    return null;
  }

  return (
    <svg
      className="fixed inset-0 pointer-events-none z-[97]"
      style={{ width: "100vw", height: "100vh" }}
      data-testid="drop-zone-connectors"
    >
      <defs>
        {/* Gradient for connector lines */}
        <linearGradient id="connector-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="rgba(34, 211, 238, 0.1)" />
          <stop offset="50%" stopColor="rgba(34, 211, 238, 0.4)" />
          <stop offset="100%" stopColor="rgba(34, 211, 238, 0.8)" />
        </linearGradient>

        {/* Gradient for hovered connector */}
        <linearGradient id="connector-gradient-hovered" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="rgba(34, 211, 238, 0.3)" />
          <stop offset="50%" stopColor="rgba(34, 211, 238, 0.7)" />
          <stop offset="100%" stopColor="rgba(34, 211, 238, 1)" />
        </linearGradient>

        {/* Glow filter */}
        <filter id="connector-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <AnimatePresence>
        {connectors.map((connector) => {
          const maxDistance = 600;
          const baseOpacity = Math.max(0.1, 1 - connector.distance / maxDistance);
          const strokeWidth = connector.isHovered ? 3 : 1.5;

          return (
            <g key={connector.id}>
              {/* Connector line */}
              <motion.line
                x1={connector.x1}
                y1={connector.y1}
                x2={connector.x2}
                y2={connector.y2}
                stroke={connector.isHovered ? "url(#connector-gradient-hovered)" : "url(#connector-gradient)"}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeDasharray={connector.isHovered ? "none" : "8 4"}
                filter={connector.isHovered ? "url(#connector-glow)" : undefined}
                initial={{ opacity: 0, pathLength: 0 }}
                animate={{
                  opacity: baseOpacity * (connector.isHovered ? 1 : 0.6),
                  pathLength: 1,
                  strokeDashoffset: connector.isHovered ? 0 : [0, -12],
                }}
                exit={{ opacity: 0, pathLength: 0 }}
                transition={{
                  opacity: { duration: 0.2 },
                  pathLength: { duration: 0.3 },
                  strokeDashoffset: connector.isHovered
                    ? { duration: 0 }
                    : { duration: 0.8, repeat: Infinity, ease: "linear" },
                }}
              />

              {/* Target indicator dot */}
              <motion.circle
                cx={connector.x2}
                cy={connector.y2}
                r={connector.isHovered ? 8 : 4}
                fill={connector.isHovered ? "rgba(34, 211, 238, 0.9)" : "rgba(34, 211, 238, 0.5)"}
                filter={connector.isHovered ? "url(#connector-glow)" : undefined}
                initial={{ scale: 0, opacity: 0 }}
                animate={{
                  scale: connector.isHovered ? [1, 1.3, 1] : 1,
                  opacity: baseOpacity,
                }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{
                  scale: connector.isHovered
                    ? { duration: 1, repeat: Infinity, ease: "easeInOut" }
                    : { duration: 0.2 },
                }}
              />
            </g>
          );
        })}
      </AnimatePresence>
    </svg>
  );
}
