"use client";

import { motion } from "framer-motion";
import { Trophy } from "lucide-react";
import { ChallengeEntry } from "@/types/challenges";
import { listContainerVariants, listItemVariants } from "../shared/animations";

interface ChallengeModalEntriesProps {
  entries: ChallengeEntry[];
}

export function ChallengeModalEntries({ entries }: ChallengeModalEntriesProps) {
  if (entries.length === 0) return null;

  const getRankStyle = (rank: number) => {
    switch (rank) {
      case 1:
        return {
          bg: "linear-gradient(135deg, rgba(251, 191, 36, 0.9), rgba(245, 158, 11, 0.9))",
          text: "text-white",
        };
      case 2:
        return {
          bg: "linear-gradient(135deg, rgba(156, 163, 175, 0.9), rgba(107, 114, 128, 0.9))",
          text: "text-slate-900",
        };
      case 3:
        return {
          bg: "linear-gradient(135deg, rgba(234, 88, 12, 0.9), rgba(180, 83, 9, 0.9))",
          text: "text-white",
        };
      default:
        return {
          bg: "rgba(51, 65, 85, 0.6)",
          text: "text-slate-300",
        };
    }
  };

  return (
    <div>
      <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
        <Trophy className="w-4 h-4 text-amber-400" />
        Top Performers
      </h3>

      <motion.div
        className="space-y-2"
        variants={listContainerVariants}
        initial="hidden"
        animate="visible"
      >
        {entries.slice(0, 5).map((entry) => {
          const rankStyle = getRankStyle(entry.rank);

          return (
            <motion.div
              key={entry.id}
              variants={listItemVariants}
              className="flex items-center justify-between p-3 rounded-xl"
              style={{
                background: `linear-gradient(135deg, rgba(30, 40, 60, 0.4), rgba(20, 28, 48, 0.4))`,
              }}
            >
              <div className="flex items-center gap-3">
                {/* Rank badge */}
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${rankStyle.text}`}
                  style={{ background: rankStyle.bg }}
                >
                  #{entry.rank}
                </div>

                {/* User name */}
                <span className="text-sm text-slate-300">
                  User {entry.user_id.slice(0, 8)}
                </span>
              </div>

              {/* Score */}
              <span className="text-sm font-semibold text-white">
                {entry.score.toLocaleString()} pts
              </span>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}