"use client";

import { memo, useCallback } from "react";
import { motion } from "framer-motion";
import { getSubcategoryIcon, getSubcategoryBackground } from "@/lib/helpers/getIcons";
import { CardHeader } from "./components/CardHeader";
import { CardFooter } from "./components/CardFooter";
import { cardVariants } from "./shared/animations";
import { use3DTilt } from "@/hooks/use-3d-tilt";
import type { ShowcaseCardData, CardClickHandler } from "./types";

interface ShowcaseCardProps extends ShowcaseCardData {
  id: number;
  onCardClick?: CardClickHandler;
}

export const ShowcaseCard = memo(function ShowcaseCard({
  category,
  subcategory,
  title,
  author,
  comment,
  color,
  timePeriod,
  hierarchy,
  onCardClick,
}: ShowcaseCardProps) {
  const { ref, style: tiltStyle, handlers } = use3DTilt({
    maxRotation: 8,
    stiffness: 350,
    damping: 25,
    scale: 1.03,
  });

  const handleClick = useCallback(() => {
    onCardClick?.({
      category,
      subcategory,
      timePeriod,
      hierarchy,
      title,
      author,
      comment,
      color,
    });
  }, [onCardClick, category, subcategory, timePeriod, hierarchy, title, author, comment, color]);

  return (
    <motion.div
      ref={ref}
      className="relative w-80 rounded-3xl overflow-hidden cursor-pointer group"
      variants={cardVariants}
      whileTap="tap"
      onClick={handleClick}
      data-testid={`showcase-card-${category.toLowerCase()}`}
      style={{
        ...tiltStyle,
        // Glassmorphism base without visible borders
        background: `
          linear-gradient(135deg,
            rgba(15, 20, 35, 0.95) 0%,
            rgba(20, 28, 48, 0.9) 50%,
            rgba(15, 20, 35, 0.95) 100%
          )
        `,
        boxShadow: `
          0 20px 50px rgba(0, 0, 0, 0.5),
          0 0 80px ${color.primary}10,
          inset 0 1px 0 rgba(255, 255, 255, 0.05),
          inset 0 -1px 0 rgba(0, 0, 0, 0.2)
        `,
      }}
      {...handlers}
      tabIndex={0}
    >
      {/* Aurora glow effect at top */}
      <motion.div
        className="absolute -top-20 left-1/2 -translate-x-1/2 w-64 h-40 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at center, ${color.primary}30, transparent 60%)`,
          filter: "blur(30px)",
        }}
        animate={{
          opacity: [0.4, 0.7, 0.4],
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Subtle mesh gradient background */}
      <div
        className="absolute inset-0 opacity-40 pointer-events-none"
        style={{
          background: `
            radial-gradient(at 80% 20%, ${color.primary}15 0px, transparent 50%),
            radial-gradient(at 20% 80%, ${color.secondary}10 0px, transparent 50%)
          `,
        }}
      />

      {/* Background icon decoration */}
      <div className="absolute -right-16 top-1/2 -translate-y-1/2 opacity-[0.06] scale-150 pointer-events-none">
        {getSubcategoryBackground(subcategory || 'default')}
      </div>

      {/* Shimmer overlay on hover */}
      <motion.div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 pointer-events-none"
        style={{
          background: `
            linear-gradient(
              105deg,
              transparent 30%,
              rgba(255, 255, 255, 0.03) 45%,
              rgba(255, 255, 255, 0.06) 50%,
              rgba(255, 255, 255, 0.03) 55%,
              transparent 70%
            )
          `,
          backgroundSize: "200% 100%",
        }}
        animate={{
          backgroundPosition: ["200% 0", "-200% 0"],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "linear",
          repeatDelay: 1,
        }}
      />

      {/* Card content */}
      <div className="relative z-10">
        <CardHeader
          title={title}
          subcategory={subcategory}
          color={color}
        />

        {/* Divider with glow */}
        <div
          className="mx-5 h-px"
          style={{
            background: `linear-gradient(90deg, transparent, ${color.primary}25, transparent)`,
          }}
        />

        <CardFooter
          author={author}
          comment={comment}
          color={color}
        />
      </div>

      {/* Interactive glow ring on hover */}
      <motion.div
        className="absolute inset-0 rounded-3xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          boxShadow: `
            inset 0 0 30px ${color.primary}10,
            0 0 60px ${color.primary}15
          `,
        }}
      />

      {/* Hover CTA - Click to start indicator */}
      <motion.div
        className="absolute bottom-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none z-30"
        initial={false}
        data-testid={`showcase-card-cta-${category.toLowerCase()}`}
      >
        <motion.div
          className="px-4 py-2 rounded-xl font-semibold text-white text-sm backdrop-blur-sm flex items-center gap-2"
          style={{
            background: `linear-gradient(135deg, ${color.primary}90, ${color.secondary}90)`,
            boxShadow: `0 4px 20px ${color.primary}40`,
          }}
          animate={{
            scale: [1, 1.02, 1],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"
            />
          </svg>
          Click to start
        </motion.div>
      </motion.div>

      {/* Pulsing indicator for first card (prominent card) */}
      <motion.div
        className="absolute top-4 right-4 pointer-events-none z-30"
        data-testid={`showcase-card-pulse-${category.toLowerCase()}`}
      >
        <motion.div
          className="relative"
          animate={{
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          {/* Outer pulse ring */}
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{
              background: `${color.primary}40`,
              width: 12,
              height: 12,
            }}
            animate={{
              scale: [1, 2, 1],
              opacity: [0.6, 0, 0.6],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeOut",
            }}
          />
          {/* Inner dot */}
          <div
            className="w-3 h-3 rounded-full"
            style={{
              background: `linear-gradient(135deg, ${color.primary}, ${color.secondary})`,
              boxShadow: `0 0 10px ${color.primary}60`,
            }}
          />
        </motion.div>
      </motion.div>
    </motion.div>
  );
});