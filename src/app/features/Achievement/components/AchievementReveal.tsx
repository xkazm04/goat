"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Star, Sparkles, X } from "lucide-react";
import { Achievement, TIER_CONFIG, CATEGORY_CONFIG } from "@/types/achievement";
import { AchievementCard } from "./AchievementCard";

interface AchievementRevealProps {
  achievement: Achievement | null;
  isOpen: boolean;
  onClose: () => void;
  onShare?: () => void;
  autoClose?: boolean;
  autoCloseDelay?: number;
}

export function AchievementReveal({
  achievement,
  isOpen,
  onClose,
  onShare,
  autoClose = true,
  autoCloseDelay = 5000,
}: AchievementRevealProps) {
  const [showCard, setShowCard] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  // Auto-close timer
  useEffect(() => {
    if (isOpen && autoClose) {
      const timer = setTimeout(() => {
        onClose();
      }, autoCloseDelay);
      return () => clearTimeout(timer);
    }
  }, [isOpen, autoClose, autoCloseDelay, onClose]);

  // Animation sequence
  useEffect(() => {
    if (isOpen) {
      // Start confetti immediately
      setShowConfetti(true);
      // Show card after burst animation
      const cardTimer = setTimeout(() => setShowCard(true), 600);
      return () => {
        clearTimeout(cardTimer);
        setShowCard(false);
        setShowConfetti(false);
      };
    }
  }, [isOpen]);

  if (!achievement) return null;

  const tierConfig = TIER_CONFIG[achievement.tier];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              background: `radial-gradient(circle at center, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.95) 100%)`,
            }}
            onClick={onClose}
            data-testid="achievement-reveal-backdrop"
          />

          {/* Confetti/Particles */}
          {showConfetti && (
            <div className="fixed inset-0 z-50 pointer-events-none overflow-hidden">
              {/* Center burst */}
              {[...Array(24)].map((_, i) => {
                const angle = (i / 24) * Math.PI * 2;
                const distance = 150 + Math.random() * 200;
                const x = Math.cos(angle) * distance;
                const y = Math.sin(angle) * distance;
                const delay = Math.random() * 0.2;
                const size = 8 + Math.random() * 12;

                return (
                  <motion.div
                    key={`burst-${i}`}
                    className="absolute left-1/2 top-1/2"
                    initial={{ x: 0, y: 0, opacity: 1, scale: 0 }}
                    animate={{
                      x,
                      y,
                      opacity: [1, 1, 0],
                      scale: [0, 1, 0.5],
                      rotate: [0, Math.random() * 360],
                    }}
                    transition={{
                      duration: 1.2,
                      delay,
                      ease: [0.23, 1, 0.32, 1],
                    }}
                  >
                    <Sparkles
                      className="w-auto h-auto"
                      style={{
                        width: size,
                        height: size,
                        color: tierConfig.color,
                        filter: `drop-shadow(0 0 ${size / 2}px ${tierConfig.glow})`,
                      }}
                    />
                  </motion.div>
                );
              })}

              {/* Falling confetti */}
              {[...Array(40)].map((_, i) => {
                const startX = Math.random() * window.innerWidth;
                const endX = startX + (Math.random() - 0.5) * 200;
                const duration = 2 + Math.random() * 2;
                const delay = Math.random() * 0.5;
                const colors = [tierConfig.color, '#22d3ee', '#a78bfa', '#fbbf24', '#10b981'];
                const color = colors[Math.floor(Math.random() * colors.length)];

                return (
                  <motion.div
                    key={`confetti-${i}`}
                    className="absolute"
                    initial={{
                      x: startX,
                      y: -20,
                      opacity: 1,
                      rotate: 0,
                    }}
                    animate={{
                      x: endX,
                      y: window.innerHeight + 20,
                      opacity: [1, 1, 0],
                      rotate: Math.random() * 720 - 360,
                    }}
                    transition={{
                      duration,
                      delay,
                      ease: 'linear',
                    }}
                  >
                    <div
                      className="w-3 h-3 rounded-sm"
                      style={{
                        background: color,
                        boxShadow: `0 0 10px ${color}`,
                      }}
                    />
                  </motion.div>
                );
              })}

              {/* Star bursts */}
              {[...Array(8)].map((_, i) => (
                <motion.div
                  key={`star-${i}`}
                  className="absolute left-1/2 top-1/2"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{
                    scale: [0, 1.5, 0],
                    opacity: [0, 1, 0],
                    rotate: [0, 180],
                  }}
                  transition={{
                    duration: 1,
                    delay: 0.1 * i,
                    ease: 'easeOut',
                  }}
                  style={{
                    marginLeft: (Math.random() - 0.5) * 300,
                    marginTop: (Math.random() - 0.5) * 300,
                  }}
                >
                  <Star
                    className="w-6 h-6"
                    style={{
                      color: tierConfig.color,
                      filter: `drop-shadow(0 0 15px ${tierConfig.glow})`,
                    }}
                    fill={tierConfig.color}
                  />
                </motion.div>
              ))}
            </div>
          )}

          {/* Main content */}
          <motion.div
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 flex flex-col items-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            data-testid="achievement-reveal"
          >
            {/* Close button */}
            <motion.button
              onClick={onClose}
              className="absolute -top-16 right-0 p-2 rounded-full bg-white/10 text-white/70 hover:text-white hover:bg-white/20 transition-colors"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1 }}
              data-testid="achievement-reveal-close"
            >
              <X className="w-5 h-5" />
            </motion.button>

            {/* Trophy burst animation */}
            <motion.div
              className="relative mb-6"
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{
                type: 'spring',
                stiffness: 200,
                damping: 15,
                delay: 0.2,
              }}
            >
              {/* Glow ring */}
              <motion.div
                className="absolute inset-0 rounded-full"
                style={{
                  background: `radial-gradient(circle, ${tierConfig.glow} 0%, transparent 70%)`,
                }}
                animate={{
                  scale: [1, 1.3, 1],
                  opacity: [0.5, 0.8, 0.5],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />

              {/* Trophy icon */}
              <motion.div
                className="relative w-28 h-28 rounded-full flex items-center justify-center"
                style={{
                  background: tierConfig.gradient,
                  boxShadow: `0 0 60px ${tierConfig.glow}`,
                }}
                animate={{
                  scale: [1, 1.05, 1],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              >
                <Trophy
                  className="w-14 h-14"
                  style={{
                    color: achievement.tier === 'gold' || achievement.tier === 'bronze' ? '#000' : '#fff',
                  }}
                />
              </motion.div>

              {/* Pulsing rings */}
              {[...Array(3)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute inset-0 rounded-full border-2"
                  style={{ borderColor: tierConfig.color }}
                  initial={{ scale: 1, opacity: 0.6 }}
                  animate={{
                    scale: 1.5 + i * 0.3,
                    opacity: 0,
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    delay: i * 0.5,
                    ease: 'easeOut',
                  }}
                />
              ))}
            </motion.div>

            {/* Title announcement */}
            <motion.div
              className="text-center mb-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <motion.p
                className="text-lg text-gray-400 mb-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
              >
                Achievement Unlocked!
              </motion.p>
              <motion.h2
                className="text-3xl font-bold"
                style={{
                  background: tierConfig.gradient,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  textShadow: `0 0 30px ${tierConfig.glow}`,
                }}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.7, type: 'spring' }}
              >
                {achievement.title}
              </motion.h2>
            </motion.div>

            {/* Achievement card */}
            <AnimatePresence>
              {showCard && (
                <motion.div
                  className="w-full max-w-md"
                  initial={{ opacity: 0, y: 30, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -30, scale: 0.9 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                >
                  <AchievementCard
                    achievement={achievement}
                    config={{
                      style: 'default',
                      showUsername: false,
                      showProgress: false,
                      showRarity: true,
                      showDate: false,
                      animated: true,
                    }}
                    onShare={onShare}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Action buttons */}
            <motion.div
              className="flex items-center gap-4 mt-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2 }}
            >
              {onShare && (
                <motion.button
                  onClick={onShare}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white"
                  style={{
                    background: 'linear-gradient(135deg, #06b6d4 0%, #8b5cf6 100%)',
                    boxShadow: '0 4px 20px rgba(6, 182, 212, 0.3)',
                  }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  data-testid="achievement-reveal-share"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                    />
                  </svg>
                  Share Achievement
                </motion.button>
              )}

              <motion.button
                onClick={onClose}
                className="px-6 py-3 rounded-xl font-medium text-gray-400 hover:text-white transition-colors"
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                }}
                whileHover={{ scale: 1.05, background: 'rgba(255, 255, 255, 0.1)' }}
                whileTap={{ scale: 0.95 }}
                data-testid="achievement-reveal-dismiss"
              >
                Continue
              </motion.button>
            </motion.div>

            {/* Points earned */}
            <motion.p
              className="mt-4 text-sm text-gray-500"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5 }}
            >
              +{achievement.points} points earned
            </motion.p>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Notification toast version (less intrusive)
export function AchievementToast({
  achievement,
  isVisible,
  onClose,
  onClick,
}: {
  achievement: Achievement | null;
  isVisible: boolean;
  onClose: () => void;
  onClick?: () => void;
}) {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(onClose, 5000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  if (!achievement) return null;

  const tierConfig = TIER_CONFIG[achievement.tier];

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed bottom-6 right-6 z-50"
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          data-testid="achievement-toast"
        >
          <motion.button
            onClick={onClick}
            className="flex items-center gap-4 p-4 rounded-2xl cursor-pointer"
            style={{
              background: `linear-gradient(135deg, rgba(15, 20, 35, 0.98) 0%, rgba(20, 28, 48, 0.95) 100%)`,
              boxShadow: `
                0 25px 50px -12px rgba(0, 0, 0, 0.5),
                0 0 40px ${tierConfig.glow},
                inset 0 1px 0 rgba(255, 255, 255, 0.05)
              `,
              border: `1px solid ${tierConfig.borderColor}`,
            }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {/* Icon */}
            <motion.div
              className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{
                background: tierConfig.gradient,
                boxShadow: `0 0 20px ${tierConfig.glow}`,
              }}
              animate={{
                scale: [1, 1.1, 1],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
              }}
            >
              <Trophy
                className="w-6 h-6"
                style={{
                  color: achievement.tier === 'gold' || achievement.tier === 'bronze' ? '#000' : '#fff',
                }}
              />
            </motion.div>

            {/* Content */}
            <div className="text-left">
              <p className="text-xs text-cyan-400 font-medium mb-0.5">
                Achievement Unlocked!
              </p>
              <p className="text-white font-bold">{achievement.title}</p>
              <p className="text-xs text-gray-500">+{achievement.points} pts</p>
            </div>

            {/* Sparkle */}
            <Sparkles className="w-5 h-5 text-yellow-400 flex-shrink-0" />
          </motion.button>

          {/* Close button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-gray-800 text-gray-400 hover:text-white flex items-center justify-center border border-gray-700"
          >
            <X className="w-3 h-3" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
