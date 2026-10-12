"use client";

import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";

import { ELEVATION, INSET, withInset } from "@/components/visual/depth";
import { useMotionCapabilities } from "@/hooks/use-motion-preference";

import { springConfig } from "../shared/animations";

interface SectionHeaderProps {
  icon: LucideIcon | React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
  /** Gradient colors in format "rgba(r, g, b, a)" for start and end */
  gradientColors?: {
    start: string;
    end: string;
  };
  /** Icon color class e.g., "text-brand-hover" */
  iconColorClass?: string;
  /** Optional right-side content (e.g., action buttons) */
  rightContent?: React.ReactNode;
  /** Optional test ID prefix */
  testIdPrefix?: string;
}

const DEFAULT_GRADIENT = {
  start: "rgba(251, 191, 36, 0.15)", // amber-400
  end: "rgba(245, 158, 11, 0.1)", // amber-500
};

export function SectionHeader({
  icon: Icon,
  title,
  subtitle,
  gradientColors = DEFAULT_GRADIENT,
  iconColorClass = "text-amber-400",
  rightContent,
  testIdPrefix,
}: SectionHeaderProps) {
  const { allowInteraction } = useMotionCapabilities();

  return (
    <motion.div
      className={`flex items-center ${rightContent ? "justify-between" : "gap-4"} mb-8`}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={springConfig.section}
      viewport={{ once: true }}
      data-testid={testIdPrefix ? `${testIdPrefix}-header` : undefined}
    >
      <div className="flex items-center gap-4">
        <motion.div
          className="relative p-3 rounded-container"
          style={{
            background: `linear-gradient(135deg, ${gradientColors.start}, ${gradientColors.end})`,
            boxShadow: withInset(ELEVATION.high, INSET.glassHighlightStrong),
          }}
          whileHover={!allowInteraction ? {} : { scale: 1.05, rotate: 5 }}
          data-testid={testIdPrefix ? `${testIdPrefix}-icon` : undefined}
        >
          <Icon className={`w-6 h-6 ${iconColorClass}`} />
        </motion.div>
        <div>
          <motion.h2
            className="text-3xl font-bold tracking-tight font-heading text-gradient-gold"
            initial={{ opacity: 0, y: 5 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{
              type: "spring",
              stiffness: 100,
              damping: 12,
            }}
            viewport={{ once: true }}
            data-testid={testIdPrefix ? `${testIdPrefix}-section-title` : undefined}
          >
            {title}
          </motion.h2>
          <p className="text-sm text-slate-400 mt-1">{subtitle}</p>
        </div>
      </div>
      {rightContent}
    </motion.div>
  );
}
