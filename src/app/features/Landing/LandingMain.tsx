"use client";

import { motion } from "framer-motion";
import { FloatingShowcase } from "./FloatingShowcase";
import { CompositionModal } from "./sub_CreateList/CompositionModal";
import { gradients } from "./shared/gradients";

export function LandingMain() {
  return (
    <section className="relative min-h-screen w-full overflow-hidden">
      {/* Base dark background - matching MatchGrid #050505 */}
      <div className="absolute inset-0 bg-[#050505]" />

      {/* Center radial glow - cyan accent like MatchGrid */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: gradients.centerGlow }}
      />

      {/* Neon grid pattern - matching MatchGrid exactly */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: gradients.neonGrid,
          backgroundSize: '60px 60px'
        }}
      />

      {/* Aurora/mesh gradient overlay for depth */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{ background: gradients.mesh }}
        animate={{
          opacity: [0.6, 1, 0.6],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Animated floating orbs - cyan theme */}
      <motion.div
        className="absolute top-1/4 left-1/4 w-[600px] h-[600px] rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(6, 182, 212, 0.08) 0%, transparent 60%)",
          filter: "blur(60px)",
        }}
        animate={{
          x: [0, 100, 0],
          y: [0, -50, 0],
          scale: [1, 1.2, 1],
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      <motion.div
        className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(34, 211, 238, 0.06) 0%, transparent 60%)",
          filter: "blur(50px)",
        }}
        animate={{
          x: [0, -80, 0],
          y: [0, 80, 0],
          scale: [1.1, 0.9, 1.1],
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 2,
        }}
      />

      <motion.div
        className="absolute top-1/2 right-1/3 w-[400px] h-[400px] rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(6, 182, 212, 0.05) 0%, transparent 60%)",
          filter: "blur(40px)",
        }}
        animate={{
          x: [0, 60, 0],
          y: [0, -40, 0],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 4,
        }}
      />

      {/* Gradient line accents - cyan theme */}
      <div
        className="absolute top-0 left-0 right-0 h-px pointer-events-none"
        style={{
          background: "linear-gradient(90deg, transparent, rgba(6, 182, 212, 0.3), rgba(34, 211, 238, 0.2), transparent)",
        }}
      />
      <div
        className="absolute bottom-0 left-0 right-0 h-px pointer-events-none"
        style={{
          background: "linear-gradient(90deg, transparent, rgba(34, 211, 238, 0.2), rgba(6, 182, 212, 0.15), transparent)",
        }}
      />

      {/* Main content */}
      <FloatingShowcase />

      {/* Composition Modal */}
      <CompositionModal />
    </section>
  );
}