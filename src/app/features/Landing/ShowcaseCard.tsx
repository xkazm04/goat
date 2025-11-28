"use client";

import { motion } from "framer-motion";
import { getSubcategoryIcon, getSubcategoryBackground } from "@/lib/helpers/getIcons";
import { CardHeader } from "./components/CardHeader";
import { CardFooter } from "./components/CardFooter";
import { cardVariants } from "./shared/animations";
import { use3DTilt } from "@/hooks/use-3d-tilt";

interface ShowcaseCardProps {
  id: number;
  category: string;
  subcategory?: string;
  title: string;
  author: string;
  comment: string;
  color: {
    primary: string;
    secondary: string;
    accent: string;
  };
  timePeriod: "all-time" | "decade" | "year";
  hiearchy: string;
  onCardClick?: (cardData: {
    category: string;
    subcategory?: string;
    timePeriod: "all-time" | "decade" | "year";
    hierarchy: string;
    title: string;
    author: string;
    comment: string;
    color: {
      primary: string;
      secondary: string;
      accent: string;
    };
  }) => void;
}

export function ShowcaseCard({
  category,
  subcategory,
  title,
  author,
  comment,
  color,
  timePeriod,
  hiearchy,
  onCardClick,
}: ShowcaseCardProps) {
  const { ref, style: tiltStyle, handlers } = use3DTilt({
    maxRotation: 8,
    stiffness: 350,
    damping: 25,
    scale: 1.03,
  });

  const handleClick = () => {
    onCardClick?.({
      category,
      subcategory,
      timePeriod,
      hierarchy: hiearchy,
      title,
      author,
      comment,
      color,
    });
  };

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
    </motion.div>
  );
}