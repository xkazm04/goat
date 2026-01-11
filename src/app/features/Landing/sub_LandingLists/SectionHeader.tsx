"use client";

import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { fadeInUp } from "../shared/animations";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

interface SectionHeaderProps {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  /** Gradient colors in format "rgba(r, g, b, a)" for start and end */
  gradientColors?: {
    start: string;
    end: string;
  };
  /** Icon color class e.g., "text-cyan-400" */
  iconColorClass?: string;
  /** Optional right-side content (e.g., action buttons) */
  rightContent?: React.ReactNode;
  /** Optional test ID prefix */
  testIdPrefix?: string;
}

const DEFAULT_GRADIENT = {
  start: "rgba(6, 182, 212, 0.15)",
  end: "rgba(34, 211, 238, 0.1)",
};

export function SectionHeader({
  icon: Icon,
  title,
  subtitle,
  gradientColors = DEFAULT_GRADIENT,
  iconColorClass = "text-cyan-400",
  rightContent,
  testIdPrefix,
}: SectionHeaderProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      className={`flex items-center ${rightContent ? "justify-between" : "gap-4"} mb-8`}
      variants={fadeInUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      data-testid={testIdPrefix ? `${testIdPrefix}-header` : undefined}
    >
      <div className="flex items-center gap-4">
        <motion.div
          className="relative p-3 rounded-2xl"
          style={{
            background: `linear-gradient(135deg, ${gradientColors.start}, ${gradientColors.end})`,
            boxShadow: `
              0 8px 32px ${gradientColors.start},
              inset 0 1px 0 rgba(255, 255, 255, 0.1)
            `,
          }}
          whileHover={prefersReducedMotion ? {} : { scale: 1.05, rotate: 5 }}
          data-testid={testIdPrefix ? `${testIdPrefix}-icon` : undefined}
        >
          <Icon className={`w-6 h-6 ${iconColorClass}`} />
        </motion.div>
        <div>
          <h2
            className="text-3xl font-bold text-white tracking-tight flex"
            data-testid={testIdPrefix ? `${testIdPrefix}-section-title` : undefined}
          >
            {title.split("").map((char, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0, y: 5 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.05, delay: i * 0.03 }}
                viewport={{ once: true }}
              >
                {char === " " ? "\u00A0" : char}
              </motion.span>
            ))}
          </h2>
          <p className="text-sm text-slate-400 mt-1">{subtitle}</p>
        </div>
      </div>
      {rightContent}
    </motion.div>
  );
}
