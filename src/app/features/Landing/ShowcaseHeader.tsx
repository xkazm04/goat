"use client";

import { motion } from "framer-motion";
import { Crown, Sparkles } from "lucide-react";
import { usePersonalizedWelcome } from "@/lib/personalization";

// Individual letter configuration for staggered animation
const letters = [
  { char: "G", delay: 0 },
  { char: ".", delay: 0.08 },
  { char: "O", delay: 0.16 },
  { char: ".", delay: 0.24 },
  { char: "A", delay: 0.32 },
  { char: ".", delay: 0.4 },
  { char: "T", delay: 0.48 },
  { char: ".", delay: 0.56 },
];

export function ShowcaseHeader() {
  const { greeting, subtitle, isReturningUser } = usePersonalizedWelcome();

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      className="text-center relative z-10 pt-12 pb-6"
    >
      <div className="relative inline-block">
        {/* Epic crown above title */}
        <motion.div
          className="absolute -top-8 left-1/2 -translate-x-1/2"
          initial={{ y: -25, opacity: 0, scale: 0 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          transition={{ delay: 0.8, duration: 0.8, type: "spring", stiffness: 100 }}
        >
          <motion.div
            animate={{
              y: [-2, 2, -2],
              rotate: [-2, 2, -2],
            }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          >
            <Crown
              className="w-8 h-8 text-amber-400"
              style={{
                filter: "drop-shadow(0 0 15px rgba(251, 191, 36, 0.8)) drop-shadow(0 0 30px rgba(251, 191, 36, 0.4))"
              }}
            />
          </motion.div>
          {/* Crown glow */}
          <motion.div
            className="absolute inset-0 -z-10"
            animate={{ opacity: [0.4, 0.8, 0.4] }}
            transition={{ duration: 2, repeat: Infinity }}
            style={{
              background: "radial-gradient(circle, rgba(251, 191, 36, 0.4) 0%, transparent 70%)",
              filter: "blur(20px)",
              transform: "scale(3)",
            }}
          />
        </motion.div>

        {/* Massive background glow */}
        <motion.div
          className="absolute -inset-16 pointer-events-none"
          animate={{
            opacity: [0.3, 0.6, 0.3],
            scale: [1, 1.1, 1],
          }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          style={{
            background: "radial-gradient(ellipse at center, rgba(251, 191, 36, 0.2) 0%, rgba(245, 158, 11, 0.1) 30%, transparent 60%)",
            filter: "blur(20px)",
          }}
        />

        {/* Main G.O.A.T. title - Each letter animated separately */}
        <div className="flex items-center justify-center gap-1 md:gap-2">
          {letters.map((letter, index) => (
            <motion.span
              key={index}
              className="relative inline-block cursor-default select-none"
              initial={{ 
                opacity: 0, 
                y: 100,
                rotateX: -90,
                scale: 0.5,
              }}
              animate={{ 
                opacity: 1, 
                y: 0,
                rotateX: 0,
                scale: 1,
              }}
              transition={{
                delay: letter.delay + 0.3,
                duration: 0.8,
                type: "spring",
                stiffness: 100,
                damping: 12,
              }}
              whileHover={letter.char !== "." ? {
                scale: 1.15,
                y: -10,
                transition: { duration: 0.2 },
              } : {}}
              style={{
                fontSize: letter.char === "." ? "clamp(2rem, 6vw, 5rem)" : "clamp(2.5rem, 7.5vw, 7rem)",
                fontWeight: 900,
                fontFamily: "'Inter', system-ui, sans-serif",
                letterSpacing: letter.char === "." ? "-0.05em" : "-0.02em",
                lineHeight: 0.85,
                background: letter.char === "."
                  ? "linear-gradient(180deg, #fcd34d 0%, #f59e0b 100%)"
                  : `linear-gradient(180deg, 
                      #fff9e6 0%,
                      #fcd34d 15%,
                      #fbbf24 30%,
                      #f59e0b 50%,
                      #d97706 70%,
                      #b45309 85%,
                      #92400e 100%
                    )`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                filter: "drop-shadow(0 4px 0 rgba(146, 64, 14, 0.5)) drop-shadow(0 8px 30px rgba(251, 191, 36, 0.5))",
                textShadow: "none",
              }}
            >
              {letter.char}
              {/* Individual letter glow */}
              {letter.char !== "." && (
                <motion.div
                  className="absolute inset-0 -z-10 pointer-events-none"
                  animate={{
                    opacity: [0.3, 0.6, 0.3],
                  }}
                  transition={{
                    duration: 2 + index * 0.3,
                    repeat: Infinity,
                    delay: index * 0.2,
                  }}
                  style={{
                    background: "radial-gradient(circle, rgba(251, 191, 36, 0.4) 0%, transparent 60%)",
                    filter: "blur(25px)",
                    transform: "scale(1.5)",
                  }}
                />
              )}
            </motion.span>
          ))}
        </div>

        {/* Elegant underline accent */}
        <motion.div
          className="relative mt-3 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.8 }}
        >
          {/* Left decorative line */}
          <motion.div
            className="h-[1px] w-12 md:w-16"
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            transition={{ delay: 1.4, duration: 0.6, ease: "easeOut" }}
            style={{
              background: "linear-gradient(90deg, transparent, rgba(251, 191, 36, 0.8))",
              transformOrigin: "right",
              boxShadow: "0 0 10px rgba(251, 191, 36, 0.5)",
            }}
          />

          {/* Center emblem */}
          <motion.div
            className="mx-2 relative"
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 1.5, duration: 0.6, type: "spring" }}
          >
            <div
              className="w-2 h-2 rotate-45"
              style={{
                background: "linear-gradient(135deg, #fcd34d 0%, #f59e0b 100%)",
                boxShadow: "0 0 10px rgba(251, 191, 36, 0.8), 0 0 20px rgba(251, 191, 36, 0.4)",
              }}
            />
          </motion.div>

          {/* Right decorative line */}
          <motion.div
            className="h-[1px] w-12 md:w-16"
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            transition={{ delay: 1.4, duration: 0.6, ease: "easeOut" }}
            style={{
              background: "linear-gradient(90deg, rgba(251, 191, 36, 0.8), transparent)",
              transformOrigin: "left",
              boxShadow: "0 0 10px rgba(251, 191, 36, 0.5)",
            }}
          />
        </motion.div>

        {/* Subtitle with premium styling */}
        <motion.div
          className="mt-4 relative"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.6, duration: 0.6 }}
        >
          <motion.p
            className="text-sm md:text-base font-light tracking-[0.3em] uppercase"
            style={{
              background: "linear-gradient(90deg, rgba(251, 191, 36, 0.6), #fbbf24, rgba(251, 191, 36, 0.6))",
              backgroundSize: "200% 100%",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
            animate={{
              backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
            }}
            transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
          >
            Greatest Of All Time
          </motion.p>

          {/* Subtle glow under subtitle */}
          <motion.div
            className="absolute -inset-4 -z-10"
            style={{
              background: "radial-gradient(ellipse at center, rgba(251, 191, 36, 0.1) 0%, transparent 70%)",
              filter: "blur(15px)",
            }}
          />
        </motion.div>

        {/* Personalized welcome message for returning users */}
        {isReturningUser && (
          <motion.div
            className="mt-6 flex items-center justify-center gap-2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 2, duration: 0.5 }}
          >
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span className="text-sm text-white/60 tracking-wide">
              {subtitle}
            </span>
            <Sparkles className="w-4 h-4 text-cyan-400" />
          </motion.div>
        )}
      </div>

      {/* Ambient light rays */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute top-1/2 left-1/2 h-[150px] w-[1px]"
            style={{
              background: "linear-gradient(to bottom, rgba(251, 191, 36, 0.3), transparent)",
              transformOrigin: "top center",
              transform: `rotate(${i * 60}deg)`,
            }}
            animate={{
              opacity: [0.1, 0.4, 0.1],
              scaleY: [0.8, 1, 0.8],
            }}
            transition={{
              duration: 3 + i * 0.5,
              repeat: Infinity,
              delay: i * 0.3,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>
    </motion.div>
  );
}