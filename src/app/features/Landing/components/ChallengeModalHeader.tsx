"use client";

import { motion } from "framer-motion";
import { X, Trophy } from "lucide-react";
import { Challenge } from "@/types/challenges";

interface ChallengeModalHeaderProps {
  challenge: Challenge;
  onClose: () => void;
}

export function ChallengeModalHeader({ challenge, onClose }: ChallengeModalHeaderProps) {
  const isActive = challenge.status === "active";
  const isScheduled = challenge.status === "scheduled";

  return (
    <div className="relative overflow-hidden">
      {/* Gradient background */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            linear-gradient(135deg,
              rgba(139, 92, 246, 0.15) 0%,
              rgba(59, 130, 246, 0.1) 50%,
              rgba(6, 182, 212, 0.08) 100%
            )
          `,
        }}
      />

      <div className="relative p-6">
        {/* Close button */}
        <motion.button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          data-testid="challenge-modal-close"
        >
          <X className="w-5 h-5" />
        </motion.button>

        <div className="flex items-start gap-4">
          {/* Trophy icon */}
          <motion.div
            className="p-3 rounded-2xl"
            style={{
              background: `linear-gradient(135deg, rgba(251, 191, 36, 0.2), rgba(245, 158, 11, 0.15))`,
              boxShadow: `0 8px 25px rgba(251, 191, 36, 0.15)`,
            }}
            initial={{ scale: 0.8, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 200 }}
          >
            <Trophy className="w-8 h-8 text-amber-400" />
          </motion.div>

          <div className="flex-1 pt-1">
            <h2 className="text-2xl font-bold text-white mb-3">{challenge.title}</h2>
            <div className="flex flex-wrap gap-2">
              {/* Status badge */}
              <span
                className={`
                  px-3 py-1 text-xs font-semibold rounded-lg
                  ${
                    isActive
                      ? "bg-emerald-500/20 text-emerald-300"
                      : isScheduled
                      ? "bg-blue-500/20 text-blue-300"
                      : "bg-slate-500/20 text-slate-300"
                  }
                `}
              >
                {challenge.status.toUpperCase()}
              </span>

              {/* Category badge */}
              <span className="px-3 py-1 text-xs font-semibold bg-cyan-500/20 rounded-lg text-cyan-300">
                {challenge.category}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom divider with glow */}
      <div
        className="h-px"
        style={{
          background: "linear-gradient(90deg, transparent, rgba(139, 92, 246, 0.3), transparent)",
        }}
      />
    </div>
  );
}