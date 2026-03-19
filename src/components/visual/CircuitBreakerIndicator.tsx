"use client";

/**
 * CircuitBreakerIndicator
 *
 * A small floating status indicator that shows the health of the API
 * circuit breaker system. Only visible when at least one circuit is
 * not in CLOSED (healthy) state.
 *
 * Colors:
 * - Green dot  = CLOSED (all healthy) -- indicator is hidden in this state
 * - Yellow dot = HALF_OPEN (recovering, probe in flight)
 * - Red dot    = OPEN (degraded, requests failing fast)
 *
 * Displays as a fixed-position pill in the bottom-left corner with
 * a pulsing animation to draw attention without being intrusive.
 */

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DURATION } from "@/lib/animations/motion-presets";
import {
  getGlobalCircuitBreaker,
  type CircuitState,
} from "@/lib/api/CircuitBreaker";

const STATE_CONFIG: Record<
  Exclude<CircuitState, "CLOSED">,
  { color: string; bgColor: string; pulseColor: string; label: string }
> = {
  HALF_OPEN: {
    color: "bg-yellow-400",
    bgColor: "bg-yellow-950/80",
    pulseColor: "bg-yellow-400/40",
    label: "Recovering",
  },
  OPEN: {
    color: "bg-red-500",
    bgColor: "bg-red-950/80",
    pulseColor: "bg-red-500/40",
    label: "Degraded",
  },
};

interface CircuitStatus {
  worstState: CircuitState;
  openEndpoints: string[];
  halfOpenEndpoints: string[];
}

function getCircuitStatus(): CircuitStatus {
  try {
    const cb = getGlobalCircuitBreaker();
    const stats = cb.getStats();

    const openEndpoints: string[] = [];
    const halfOpenEndpoints: string[] = [];

    for (const [key, circuit] of Object.entries(stats.circuits)) {
      if (circuit.state === "OPEN") {
        openEndpoints.push(key);
      } else if (circuit.state === "HALF_OPEN") {
        halfOpenEndpoints.push(key);
      }
    }

    let worstState: CircuitState = "CLOSED";
    if (halfOpenEndpoints.length > 0) worstState = "HALF_OPEN";
    if (openEndpoints.length > 0) worstState = "OPEN";

    return { worstState, openEndpoints, halfOpenEndpoints };
  } catch {
    return { worstState: "CLOSED", openEndpoints: [], halfOpenEndpoints: [] };
  }
}

/**
 * Floating circuit breaker health indicator.
 * Auto-hides when all circuits are healthy (CLOSED).
 * Polls every 5 seconds for state changes.
 */
export function CircuitBreakerIndicator() {
  const [status, setStatus] = useState<CircuitStatus>(() => getCircuitStatus());

  const refresh = useCallback(() => {
    setStatus(getCircuitStatus());
  }, []);

  useEffect(() => {
    const interval = setInterval(refresh, 5_000);
    return () => clearInterval(interval);
  }, [refresh]);

  const isVisible = status.worstState !== "CLOSED";
  const config =
    status.worstState !== "CLOSED" ? STATE_CONFIG[status.worstState] : null;

  const affectedCount =
    status.openEndpoints.length + status.halfOpenEndpoints.length;

  return (
    <AnimatePresence>
      {isVisible && config && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.9 }}
          transition={{ duration: DURATION.normal, ease: "easeOut" }}
          className={`fixed bottom-4 left-4 z-toast flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 backdrop-blur-md shadow-lg ${config.bgColor}`}
          role="status"
          aria-live="polite"
          aria-label={`API status: ${config.label}. ${affectedCount} endpoint${affectedCount !== 1 ? "s" : ""} affected.`}
          data-testid="circuit-breaker-indicator"
        >
          {/* Pulsing status dot */}
          <span className="relative flex h-2.5 w-2.5">
            <span
              className={`absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping ${config.pulseColor}`}
            />
            <span
              className={`relative inline-flex h-2.5 w-2.5 rounded-full ${config.color}`}
            />
          </span>

          {/* Label */}
          <span className="text-xs font-medium text-white/90">
            {config.label}
          </span>

          {/* Affected endpoint count */}
          {affectedCount > 0 && (
            <span className="text-2xs text-white/50">
              {affectedCount} endpoint{affectedCount !== 1 ? "s" : ""}
            </span>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default CircuitBreakerIndicator;
