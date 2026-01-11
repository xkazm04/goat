"use client";

import { motion } from "framer-motion";
import { getSubcategoryIcon } from "@/lib/helpers/getIcons";
import type { CardColor } from "../types";

interface CardHeaderProps {
  title: string;
  subcategory?: string;
  color: CardColor;
  badge?: string;
}

export function CardHeader({ title, subcategory, color, badge }: CardHeaderProps) {
  return (
    <div className="relative px-5 py-4">
      {/* Ambient glow at top */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-16 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at center top, ${color.primary}15, transparent 70%)`,
        }}
      />
      
      <div className="relative flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Icon with glow */}
          <motion.div
            className="w-10 h-10 rounded-xl flex items-center justify-center relative"
            whileHover={{ scale: 1.1, rotate: 5 }}
            transition={{ type: "spring", stiffness: 400 }}
          >
            {/* Icon background glow */}
            <div
              className="absolute inset-0 rounded-xl opacity-60"
              style={{
                background: `linear-gradient(135deg, ${color.primary}40, ${color.secondary}40)`,
                filter: "blur(4px)",
              }}
            />
            <div
              className="absolute inset-0 rounded-xl"
              style={{
                background: `linear-gradient(135deg, ${color.primary}20, ${color.secondary}20)`,
                backdropFilter: "blur(8px)",
              }}
            />
            <div className="relative z-10">
              {getSubcategoryIcon(subcategory || 'default')}
            </div>
          </motion.div>
          
          {/* Title and subtitle */}
          <div>
            <h3
              className="font-bold text-sm tracking-wide uppercase"
              style={{ 
                color: color.accent,
                textShadow: `0 0 20px ${color.accent}30`,
              }}
            >
              {title}
            </h3>
            <p className="text-xs text-slate-400/80 font-medium mt-0.5">
              {subcategory || "Greatest of All Time"}
            </p>
          </div>
        </div>

        {/* Optional badge */}
        {badge && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="px-2.5 py-1 rounded-full text-xs font-bold"
            style={{
              background: `linear-gradient(135deg, ${color.primary}30, ${color.secondary}30)`,
              color: color.accent,
              backdropFilter: "blur(4px)",
            }}
          >
            {badge}
          </motion.div>
        )}
      </div>
    </div>
  );
}
