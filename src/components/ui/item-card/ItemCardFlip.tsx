"use client";

import { motion } from "framer-motion";
import * as React from "react";

import { DURATION } from "@/lib/animations/motion-presets";

export interface ItemCardFlipProps {
  /** Whether the card is currently flipped */
  isFlipped: boolean;
  /** Content for the front face */
  children: React.ReactNode;
  /** Content for the back face */
  flipContent: React.ReactNode;
}

/**
 * ItemCardFlip
 *
 * 3D card flip animation wrapper. Uses CSS 3D transforms via Framer Motion
 * to transition between front and back faces.
 */
export function ItemCardFlip({
  isFlipped,
  children,
  flipContent,
}: ItemCardFlipProps) {
  return (
    <div style={{ perspective: "800px" }} className="w-full h-full">
      <motion.div
        className="relative w-full h-full"
        style={{ transformStyle: "preserve-3d" }}
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: DURATION.slow, ease: [0.4, 0, 0.2, 1] }}
      >
        {/* Front face */}
        <div
          className="absolute inset-0"
          style={{ backfaceVisibility: "hidden" }}
        >
          {children}
        </div>
        {/* Back face */}
        <div
          className="absolute inset-0 rounded-lg overflow-hidden bg-gray-900"
          style={{
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
          }}
        >
          {flipContent}
        </div>
      </motion.div>
    </div>
  );
}
