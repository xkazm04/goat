"use client";

import { motion } from "framer-motion";
import { Sparkles, Crown, Zap } from "lucide-react";
import { textRevealVariants, glowPulseVariants } from "./shared/animations";

// Floating particles configuration
const particleConfig = [
  { left: 15, top: 20, delay: 0.5, duration: 3.2, size: 3 },
  { left: 85, top: 35, delay: 1.8, duration: 4.1, size: 2 },
  { left: 25, top: 70, delay: 0.2, duration: 3.8, size: 4 },
  { left: 75, top: 15, delay: 2.3, duration: 3.5, size: 2 },
  { left: 45, top: 85, delay: 1.1, duration: 4.0, size: 3 },
  { left: 90, top: 60, delay: 0.8, duration: 3.7, size: 2 },
  { left: 10, top: 45, delay: 2.0, duration: 3.3, size: 4 },
  { left: 65, top: 25, delay: 1.5, duration: 3.9, size: 2 },
];

export function ShowcaseHeader() {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      className="text-center relative z-10 pt-16 pb-8"
    >
      <div className="relative inline-block">
        {/* Animated decorative icons */}
        <motion.div
          className="absolute -top-10 -left-12"
          animate={{
            y: [-8, 8, -8],
            rotate: [0, 10, 0],
            opacity: [0.6, 1, 0.6],
          }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        >
          <Sparkles className="w-8 h-8 text-amber-300 drop-shadow-[0_0_10px_rgba(251,191,36,0.5)]" />
        </motion.div>

        <motion.div
          className="absolute -top-8 -right-16"
          animate={{
            y: [8, -8, 8],
            rotate: [0, -15, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        >
          <Crown className="w-10 h-10 text-amber-400 drop-shadow-[0_0_15px_rgba(251,191,36,0.6)]" />
        </motion.div>

        <motion.div
          className="absolute -bottom-2 -left-14"
          animate={{
            scale: [0.9, 1.2, 0.9],
            opacity: [0.4, 0.8, 0.4],
          }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
        >
          <Zap className="w-6 h-6 text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
        </motion.div>

        {/* Background glow for title */}
        <motion.div
          className="absolute -inset-16 rounded-full pointer-events-none"
          style={{
            background: "radial-gradient(circle, rgba(251, 191, 36, 0.15) 0%, transparent 60%)",
            filter: "blur(30px)",
          }}
          variants={glowPulseVariants}
          animate="animate"
        />

        {/* Main G.O.A.T. title */}
        <motion.h1
          className="text-[8rem] md:text-[10rem] lg:text-[12rem] font-black tracking-tighter leading-none cursor-default select-none"
          initial={{ scale: 0.5, opacity: 0, filter: "blur(20px)" }}
          animate={{ scale: 1, opacity: 1, filter: "blur(0px)" }}
          transition={{ duration: 1, type: "spring", stiffness: 80 }}
          whileHover={{ scale: 1.03 }}
          style={{
            background: `
              linear-gradient(
                135deg,
                #fcd34d 0%,
                #fbbf24 20%,
                #f59e0b 40%,
                #fbbf24 60%,
                #fcd34d 80%,
                #f59e0b 100%
              )
            `,
            backgroundSize: "200% 200%",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            filter: "drop-shadow(0 4px 30px rgba(251, 191, 36, 0.4))",
          }}
        >
          <motion.span
            animate={{
              backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
            }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            style={{
              background: `
                linear-gradient(
                  135deg,
                  #fcd34d 0%,
                  #fbbf24 20%,
                  #f59e0b 40%,
                  #fbbf24 60%,
                  #fcd34d 80%,
                  #f59e0b 100%
                )
              `,
              backgroundSize: "200% 200%",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            G.O.A.T.
          </motion.span>
        </motion.h1>

        {/* Subtitle with elegant styling */}
        <motion.div
          className="flex items-center justify-center gap-4 mt-4"
          variants={textRevealVariants}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.6 }}
        >
          {/* Left line */}
          <motion.div
            className="h-px flex-1 max-w-32"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 1, duration: 0.8 }}
            style={{
              background: "linear-gradient(90deg, transparent, rgba(251, 191, 36, 0.6))",
              boxShadow: "0 0 10px rgba(251, 191, 36, 0.3)",
            }}
          />

          {/* Subtitle pill */}
          <motion.div
            className="relative px-6 py-2.5 rounded-full"
            whileHover={{ scale: 1.05 }}
            style={{
              background: `
                linear-gradient(135deg, 
                  rgba(251, 191, 36, 0.1) 0%,
                  rgba(245, 158, 11, 0.05) 50%,
                  rgba(217, 119, 6, 0.1) 100%
                )
              `,
              boxShadow: `
                0 4px 24px rgba(251, 191, 36, 0.15),
                inset 0 1px 0 rgba(255, 255, 255, 0.1),
                inset 0 -1px 0 rgba(0, 0, 0, 0.1)
              `,
            }}
          >
            {/* Inner glow */}
            <div
              className="absolute inset-0 rounded-full opacity-50"
              style={{
                background: "radial-gradient(ellipse at center, rgba(251, 191, 36, 0.1), transparent 70%)",
              }}
            />
            <span
              className="relative text-lg font-semibold tracking-widest"
              style={{
                color: "#fbbf24",
                textShadow: "0 0 20px rgba(251, 191, 36, 0.5)",
              }}
            >
              Greatest Of All Time
            </span>
          </motion.div>

          {/* Right line */}
          <motion.div
            className="h-px flex-1 max-w-32"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 1, duration: 0.8 }}
            style={{
              background: "linear-gradient(90deg, rgba(251, 191, 36, 0.6), transparent)",
              boxShadow: "0 0 10px rgba(251, 191, 36, 0.3)",
            }}
          />
        </motion.div>
      </div>

      {/* Floating particle effects */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        {particleConfig.map((particle, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              left: `${particle.left}%`,
              top: `${particle.top}%`,
              width: particle.size,
              height: particle.size,
              background: "linear-gradient(135deg, #fbbf24, #f59e0b)",
              boxShadow: "0 0 8px rgba(251, 191, 36, 0.8)",
            }}
            animate={{
              y: [0, -25, 0],
              opacity: [0, 0.8, 0],
              scale: [0.5, 1, 0.5],
            }}
            transition={{
              duration: particle.duration,
              repeat: Infinity,
              delay: particle.delay,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>
    </motion.div>
  );
}