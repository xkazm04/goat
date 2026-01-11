"use client";

import { motion } from "framer-motion";
import { Star } from "lucide-react";
import type { CardColor } from "../types";

interface CardFooterProps {
  author: string;
  comment: string;
  color: CardColor;
  rating?: number;
}

export function CardFooter({ author, comment, color, rating = 5 }: CardFooterProps) {
  return (
    <div className="relative px-5 py-4">
      {/* Subtle top edge glow */}
      <div
        className="absolute top-0 left-4 right-4 h-px"
        style={{
          background: `linear-gradient(90deg, transparent, ${color.primary}30, transparent)`,
        }}
      />
      
      <div className="flex items-center justify-between">
        {/* Author info */}
        <div className="flex items-center gap-2.5">
          <motion.div
            className="w-7 h-7 rounded-full flex items-center justify-center"
            style={{
              background: `linear-gradient(135deg, ${color.primary}, ${color.secondary})`,
              boxShadow: `0 2px 8px ${color.primary}40`,
            }}
            whileHover={{ scale: 1.1 }}
          >
            <span className="text-white text-xs font-bold">
              {author.charAt(0).toUpperCase()}
            </span>
          </motion.div>
          <span
            className="text-sm font-semibold"
            style={{ color: color.accent }}
          >
            {author}
          </span>
        </div>

        {/* Star rating */}
        <div className="flex items-center gap-0.5">
          {[1, 2, 3, 4, 5].map((star) => (
            <motion.div
              key={star}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 * star, duration: 0.2 }}
            >
              <Star
                className="w-3 h-3 transition-all"
                style={{
                  color: star <= rating ? color.accent : 'rgba(100, 116, 139, 0.3)',
                  fill: star <= rating ? color.accent : 'transparent',
                  filter: star <= rating ? `drop-shadow(0 0 3px ${color.accent}50)` : 'none',
                }}
              />
            </motion.div>
          ))}
        </div>
      </div>

      {/* Comment */}
      <p className="text-xs text-slate-400 mt-2.5 italic leading-relaxed line-clamp-2">
        "{comment}"
      </p>
    </div>
  );
}
