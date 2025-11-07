"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Award, X } from "lucide-react";

interface CuratorBadgeProps {
  itemCount: number;
  onDismiss?: () => void;
}

// Milestone configuration
const MILESTONES = [
  { level: 1, itemsRequired: 3, title: "Curator Level 1", color: "from-cyan-500 to-blue-500" },
  { level: 2, itemsRequired: 10, title: "Curator Level 2", color: "from-blue-500 to-purple-500" },
  { level: 3, itemsRequired: 25, title: "Curator Level 3", color: "from-purple-500 to-pink-500" },
  { level: 4, itemsRequired: 50, title: "Curator Level 4", color: "from-pink-500 to-orange-500" },
  { level: 5, itemsRequired: 100, title: "Curator Level 5", color: "from-orange-500 to-yellow-500" },
];

// Confetti particle component
function ConfettiParticle({ delay }: { delay: number }) {
  const randomX = Math.random() * 200 - 100;
  const randomRotate = Math.random() * 360;
  const colors = ["#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b"];
  const color = colors[Math.floor(Math.random() * colors.length)];

  return (
    <motion.div
      className="absolute w-2 h-2 rounded-full"
      style={{ backgroundColor: color }}
      initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
      animate={{
        x: randomX,
        y: [0, -100, -150],
        opacity: [1, 1, 0],
        scale: [1, 0.8, 0],
        rotate: randomRotate,
      }}
      transition={{
        duration: 1.5,
        delay,
        ease: "easeOut",
      }}
    />
  );
}

// Confetti burst component
function ConfettiBurst() {
  const particleCount = 12;
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      {Array.from({ length: particleCount }).map((_, i) => (
        <ConfettiParticle key={i} delay={i * 0.03} />
      ))}
    </div>
  );
}

/**
 * Curator Badge Component
 *
 * Displays a celebratory badge when user reaches collection milestones.
 * Features:
 * - Animated entrance with confetti
 * - Progressive milestone tracking
 * - Dismissible with localStorage persistence
 * - Matches app's glassmorphism/neon theme
 */
export function CuratorBadge({ itemCount, onDismiss }: CuratorBadgeProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [currentMilestone, setCurrentMilestone] = useState<typeof MILESTONES[0] | null>(null);
  const [hasShownForLevel, setHasShownForLevel] = useState<Set<number>>(new Set());

  // Check localStorage for dismissed milestones
  useEffect(() => {
    try {
      const dismissed = localStorage.getItem("curator-badge-dismissed");
      if (dismissed) {
        const dismissedArray = JSON.parse(dismissed) as number[];
        const dismissedLevels = new Set<number>(dismissedArray);
        setHasShownForLevel(dismissedLevels);
      }
    } catch (error) {
      console.error("Failed to load dismissed milestones:", error);
    }
  }, []);

  // Check if user has reached a new milestone
  useEffect(() => {
    // Find the highest milestone the user has reached
    const reachedMilestone = [...MILESTONES]
      .reverse()
      .find((m) => itemCount >= m.itemsRequired);

    if (reachedMilestone && !hasShownForLevel.has(reachedMilestone.level)) {
      setCurrentMilestone(reachedMilestone);
      setIsVisible(true);
      setShowConfetti(true);

      // Hide confetti after animation completes
      const confettiTimer = setTimeout(() => setShowConfetti(false), 1600);

      return () => clearTimeout(confettiTimer);
    }
  }, [itemCount, hasShownForLevel]);

  const handleDismiss = () => {
    if (currentMilestone) {
      const newDismissedSet = new Set(hasShownForLevel);
      newDismissedSet.add(currentMilestone.level);
      setHasShownForLevel(newDismissedSet);

      // Save to localStorage
      try {
        localStorage.setItem(
          "curator-badge-dismissed",
          JSON.stringify(Array.from(newDismissedSet))
        );
      } catch (error) {
        console.error("Failed to save dismissed milestone:", error);
      }
    }

    setIsVisible(false);
    onDismiss?.();
  };

  if (!currentMilestone) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 25,
          }}
          className="fixed top-20 left-1/2 transform -translate-x-1/2 z-[60]"
          data-testid="curator-badge"
        >
          <div className="relative">
            {/* Confetti Burst */}
            {showConfetti && <ConfettiBurst />}

            {/* Badge Card */}
            <motion.div
              className={`
                relative overflow-hidden
                bg-gray-900/95 backdrop-blur-md
                border border-gray-700/50
                rounded-xl shadow-2xl
                px-6 py-4
                flex items-center gap-4
                min-w-[320px]
              `}
              animate={{
                boxShadow: [
                  "0 0 20px rgba(6, 182, 212, 0.3)",
                  "0 0 40px rgba(59, 130, 246, 0.4)",
                  "0 0 20px rgba(6, 182, 212, 0.3)",
                ],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              {/* Gradient Overlay */}
              <div
                className={`absolute inset-0 bg-gradient-to-r ${currentMilestone.color} opacity-10`}
              />

              {/* Badge Icon */}
              <motion.div
                animate={{
                  rotate: [0, -10, 10, -10, 0],
                  scale: [1, 1.1, 1],
                }}
                transition={{
                  duration: 0.6,
                  ease: "easeInOut",
                }}
                className="relative z-10"
              >
                <div
                  className={`
                    w-12 h-12 rounded-full
                    bg-gradient-to-br ${currentMilestone.color}
                    flex items-center justify-center
                    shadow-lg
                  `}
                >
                  <Award className="w-6 h-6 text-white" />
                </div>
              </motion.div>

              {/* Badge Content */}
              <div className="flex-1 relative z-10">
                <h4 className="text-sm font-semibold text-white mb-1">
                  {currentMilestone.title}
                </h4>
                <p className="text-xs text-gray-400">
                  {itemCount} items in your collection
                </p>
              </div>

              {/* Dismiss Button */}
              <button
                onClick={handleDismiss}
                data-testid="curator-badge-dismiss-btn"
                aria-label="Dismiss badge"
                className="
                  relative z-10
                  p-1.5 rounded-lg
                  text-gray-400 hover:text-white
                  hover:bg-gray-800/50
                  transition-colors
                "
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
