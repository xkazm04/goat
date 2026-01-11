"use client";

import { memo, useCallback } from "react";
import { motion } from "framer-motion";
import { Ban, AlertTriangle } from "lucide-react";
import { CardHeader } from "./components/CardHeader";
import { CardFooter } from "./components/CardFooter";
import { cardVariants } from "./shared/animations";
import type { ShowcaseCardData, CardClickHandler } from "./types";

interface BannedShowcaseCardProps extends Omit<ShowcaseCardData, 'subcategory'> {
  onCardClick?: CardClickHandler;
}

export const BannedShowcaseCard = memo(function BannedShowcaseCard({
  category,
  title,
  author,
  comment,
  color,
  timePeriod,
  hierarchy,
  onCardClick,
}: BannedShowcaseCardProps) {
  const handleClick = useCallback(() => {
    onCardClick?.({
      category,
      subcategory: undefined,
      timePeriod,
      hierarchy,
      title,
      author,
      comment,
      color,
    });
  }, [onCardClick, category, timePeriod, hierarchy, title, author, comment, color]);

  return (
    <motion.div
      className="relative w-80 rounded-3xl overflow-hidden cursor-pointer group"
      variants={cardVariants}
      whileHover="hover"
      whileTap="tap"
      onClick={handleClick}
      data-testid={`banned-showcase-card-${category.toLowerCase()}`}
      style={{
        background: `
          linear-gradient(135deg,
            rgba(15, 20, 35, 0.95) 0%,
            rgba(20, 28, 48, 0.9) 50%,
            rgba(15, 20, 35, 0.95) 100%
          )
        `,
        boxShadow: `
          0 20px 50px rgba(0, 0, 0, 0.5),
          0 0 60px rgba(239, 68, 68, 0.08),
          inset 0 1px 0 rgba(255, 255, 255, 0.05)
        `,
        filter: "grayscale(0.2) brightness(0.9)",
      }}
    >
      {/* Red warning glow at top */}
      <motion.div
        className="absolute -top-20 left-1/2 -translate-x-1/2 w-64 h-40 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at center, rgba(239, 68, 68, 0.25), transparent 60%)`,
          filter: "blur(30px)",
        }}
        animate={{
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Card content with reduced opacity */}
      <div className="relative z-10 opacity-70">
        <CardHeader
          title={category}
          subcategory="Greatest of All Time"
          color={color}
          badge="Top 50"
        />

        {/* Preview boxes section */}
        <div className="px-5 py-4">
          <h2 className="text-xl font-black text-slate-200 leading-tight mb-3">
            {title}
          </h2>

          {/* Preview boxes with ban marks */}
          <div className="flex gap-2 mb-4">
            {[1, 2, 3].map((index) => (
              <motion.div
                key={index}
                className="relative flex-1 aspect-square rounded-lg overflow-hidden"
                style={{
                  background: `linear-gradient(135deg, ${color.primary}10, ${color.secondary}10)`,
                }}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 * index }}
              >
                <div className="absolute inset-0 flex items-center justify-center bg-red-950/30">
                  <Ban className="w-6 h-6 text-red-400/80" />
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <div
          className="mx-5 h-px"
          style={{
            background: `linear-gradient(90deg, transparent, ${color.primary}20, transparent)`,
          }}
        />

        <CardFooter
          author={author}
          comment={comment}
          color={color}
        />
      </div>

      {/* Banned overlay stamp */}
      <motion.div
        initial={{ opacity: 0, scale: 0.5, rotate: -20 }}
        animate={{ opacity: 1, scale: 1, rotate: -12 }}
        transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
        className="absolute inset-0 flex items-center justify-center pointer-events-none z-20"
      >
        <div
          className="px-6 py-3 rounded-xl font-bold text-white transform shadow-2xl"
          style={{
            background: `linear-gradient(135deg, rgba(220, 38, 38, 0.95), rgba(185, 28, 28, 0.95))`,
            boxShadow: `
              0 10px 40px rgba(220, 38, 38, 0.4),
              0 0 60px rgba(220, 38, 38, 0.2),
              inset 0 1px 0 rgba(255, 255, 255, 0.2)
            `,
          }}
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            <span className="text-lg tracking-wide">BANNED BY ADMIN</span>
          </div>
        </div>
      </motion.div>

      {/* Hover CTA */}
      <motion.div
        className="absolute bottom-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none z-30"
        initial={false}
      >
        <div
          className="px-4 py-2 rounded-xl font-bold text-white text-sm backdrop-blur-sm"
          style={{
            background: `linear-gradient(135deg, ${color.primary}90, ${color.secondary}90)`,
            boxShadow: `0 4px 20px ${color.primary}40`,
          }}
        >
          Build your own
        </div>
      </motion.div>
    </motion.div>
  );
});