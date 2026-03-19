"use client";

import { motion } from "framer-motion";
import { DURATION } from '@/lib/animations/motion-presets';
import { Sparkles } from "lucide-react";
import { GoatCrown } from "@/components/visual/GoatIcons";
import { usePersonalizedWelcome } from "@/lib/personalization";
import { useAnimationPause } from "@/hooks/use-animation-pause";
import { gradients } from "./shared/gradients";

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
  const { subtitle, isReturningUser } = usePersonalizedWelcome();
  const { ref: pauseRef, shouldAnimate, motionCapabilities } = useAnimationPause({ rootMargin: "200px" });

  // CSS animation play state based on visibility
  const animState = shouldAnimate ? "running" : "paused";
  // Ambient decorations (glows, rays) are skipped entirely for reduced-motion users
  const showAmbient = motionCapabilities.allowAmbient;

  return (
    <motion.div
      ref={pauseRef}
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
          transition={{ delay: 0.8, duration: DURATION.dramatic, type: "spring", stiffness: 100 }}
        >
          {/* Crown float - CSS animation */}
          <div
            className="showcase-crown-float"
            style={{ animationPlayState: animState, willChange: "transform" }}
          >
            <GoatCrown
              className="w-8 h-8 text-amber-400"
              style={{
                filter: "drop-shadow(0 0 15px rgba(251,191,36,0.8)) drop-shadow(0 0 30px rgba(251,191,36,0.4))"
              }}
            />
          </div>
          {/* Crown glow - CSS animation (soft gradient, no blur filter) */}
          {showAmbient && (
            <div
              className="absolute inset-0 -z-10 showcase-glow-pulse"
              style={{
                background: gradients.amberGlowSoft,
                transform: "scale(4)",
                animationPlayState: animState,
                willChange: "opacity",
              }}
            />
          )}
        </motion.div>

        {/* Massive background glow - CSS animation (soft gradient, no blur filter) */}
        {showAmbient && (
          <div
            className="absolute -inset-16 pointer-events-none showcase-bg-glow"
            style={{
              background: gradients.amberBgGlowSoft,
              animationPlayState: animState,
              willChange: "transform",
            }}
          />
        )}

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
                duration: DURATION.dramatic,
                type: "spring",
                stiffness: 100,
                damping: 12,
              }}
              whileHover={letter.char !== "." ? {
                scale: 1.15,
                y: -10,
                transition: { duration: DURATION.quick },
              } : {}}
              style={{
                fontSize: letter.char === "." ? "clamp(2rem, 6vw, 5rem)" : "clamp(2.5rem, 7.5vw, 7rem)",
                fontWeight: 900,
                fontFamily: "'Space Grotesk', 'Inter', system-ui, sans-serif",
                letterSpacing: letter.char === "." ? "-0.05em" : "-0.02em",
                lineHeight: 0.85,
                background: letter.char === "."
                  ? gradients.amberDot
                  : gradients.amberTitle,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                filter: "drop-shadow(0 4px 0 rgba(146,64,14,0.5)) drop-shadow(0 8px 30px rgba(251,191,36,0.5))",
                textShadow: "none",
              }}
            >
              {letter.char}
              {/* Individual letter glow - CSS animation with staggered delay (soft gradient, no blur filter) */}
              {letter.char !== "." && showAmbient && (
                <div
                  className="absolute inset-0 -z-10 pointer-events-none showcase-letter-glow"
                  style={{
                    background: gradients.amberLetterGlowSoft,
                    transform: "scale(2)",
                    animationDelay: `${index * 0.2}s`,
                    animationDuration: `${2 + index * 0.3}s`,
                    animationPlayState: animState,
                    willChange: "opacity",
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
          transition={{ delay: 1.2, duration: DURATION.dramatic }}
        >
          {/* Left decorative line */}
          <motion.div
            className="h-px w-12 md:w-16"
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            transition={{ delay: 1.4, duration: DURATION.emphasis, ease: "easeOut" }}
            style={{
              background: gradients.amberLineLeft,
              transformOrigin: "right",
              boxShadow: "0 0 10px rgba(251,191,36,0.5)",
            }}
          />

          {/* Center emblem */}
          <motion.div
            className="mx-2 relative"
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 1.5, duration: DURATION.emphasis, type: "spring" }}
          >
            <div
              className="w-2 h-2 rotate-45"
              style={{
                background: gradients.amberAccent,
                boxShadow: "0 0 10px rgba(251,191,36,0.8), 0 0 20px rgba(251,191,36,0.4)",
              }}
            />
          </motion.div>

          {/* Right decorative line */}
          <motion.div
            className="h-px w-12 md:w-16"
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            transition={{ delay: 1.4, duration: DURATION.emphasis, ease: "easeOut" }}
            style={{
              background: gradients.amberLineRight,
              transformOrigin: "left",
              boxShadow: "0 0 10px rgba(251,191,36,0.5)",
            }}
          />
        </motion.div>

        {/* Subtitle with premium styling - CSS animation for background sweep */}
        <motion.div
          className="mt-4 relative"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.6, duration: DURATION.emphasis }}
        >
          <p
            className="text-sm md:text-base font-light tracking-[0.3em] uppercase showcase-subtitle-sweep font-heading"
            style={{
              background: gradients.amberSubtitle,
              backgroundSize: "200% 100%",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              animationPlayState: animState,
            }}
          >
            Greatest Of All Time
          </p>

          {/* Subtle glow under subtitle (soft gradient, no blur filter) */}
          <div
            className="absolute -inset-4 -z-10"
            style={{
              background: gradients.amberSubtitleGlowSoft,
            }}
          />
        </motion.div>

        {/* Personalized welcome message for returning users */}
        {isReturningUser && (
          <motion.div
            className="mt-6 flex items-center justify-center gap-2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 2, duration: DURATION.slow }}
          >
            <Sparkles className="w-4 h-4 text-brand-hover" />
            <span className="text-sm text-white/60 tracking-wide">
              {subtitle}
            </span>
            <Sparkles className="w-4 h-4 text-brand-hover" />
          </motion.div>
        )}
      </div>

      {/* Ambient light rays - CSS animation */}
      {showAmbient && (
        <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="absolute top-1/2 left-1/2 h-[150px] w-px showcase-light-ray"
              style={{
                background: gradients.amberRay,
                transformOrigin: "top center",
                transform: `rotate(${i * 60}deg)`,
                animationDelay: `${i * 0.3}s`,
                animationDuration: `${3 + i * 0.5}s`,
                animationPlayState: animState,
                willChange: "transform",
              }}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
}
