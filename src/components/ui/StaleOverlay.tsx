"use client";

import { motion, AnimatePresence } from "framer-motion";
import { type ReactNode } from "react";

export interface StaleOverlayProps {
  /** Whether the data is stale */
  isStale: boolean;
  /** Whether data is currently being fetched */
  isFetching: boolean;
  /** Content to wrap */
  children: ReactNode;
  /** Additional className for the container */
  className?: string;
}

/**
 * Wraps data-bound sections and shows a subtle 2px shimmer bar at the top
 * when stale data is being refetched in the background.
 *
 * Never shifts layout — the bar is absolutely positioned.
 *
 * @example
 * ```tsx
 * const { data, isStale, isFetching } = useSupabaseQuery(...);
 * <StaleOverlay isStale={isStale} isFetching={isFetching}>
 *   <MyDataComponent data={data} />
 * </StaleOverlay>
 * ```
 */
export function StaleOverlay({
  isStale,
  isFetching,
  children,
  className = "",
}: StaleOverlayProps) {
  const showShimmer = isStale && isFetching;

  return (
    <div className={`relative ${className}`}>
      <AnimatePresence>
        {showShimmer && (
          <motion.div
            className="absolute inset-x-0 top-0 z-10 h-[2px] overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            role="status"
            aria-live="polite"
            aria-label="Refreshing data"
          >
            <motion.div
              className="h-full w-full"
              style={{
                background:
                  "linear-gradient(90deg, transparent 0%, rgba(161, 161, 170, 0.08) 50%, transparent 100%)",
              }}
              animate={{ x: ["-100%", "100%"] }}
              transition={{
                duration: 1.5,
                ease: "easeInOut",
                repeat: Infinity,
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
      {children}
    </div>
  );
}
