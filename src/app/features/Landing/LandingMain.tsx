"use client";

import { motion } from "framer-motion";
import { FloatingShowcase } from "./FloatingShowcase";
import { CompositionModal } from "./CompositionModal";

export function LandingMain() {
  return (
    <section className="relative min-h-screen w-full overflow-hidden">
      {/* Background with subtle animations */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            linear-gradient(135deg,
              rgba(15, 23, 42, 0.95) 0%,
              rgba(30, 41, 59, 0.98) 25%,
              rgba(51, 65, 85, 0.95) 50%,
              rgba(30, 41, 59, 0.98) 75%,
              rgba(15, 23, 42, 0.95) 100%
            )
          `
        }}
      />

      {/* Animated background pattern */}
      <div className="absolute inset-0 opacity-20">
        <motion.div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              radial-gradient(circle at 25% 25%, #3b82f6 2px, transparent 2px),
              radial-gradient(circle at 75% 75%, #8b5cf6 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px'
          }}
          animate={{
            backgroundPosition: ['0px 0px', '60px 60px'],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear"
          }}
        />
      </div>

      <FloatingShowcase />

      {/* Global Composition Modal */}
      <CompositionModal />
    </section>
  );
}