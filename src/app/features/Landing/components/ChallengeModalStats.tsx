"use client";

import { motion } from "framer-motion";
import { Users, Clock, Target, Award } from "lucide-react";
import { Challenge } from "@/types/challenges";
import { format } from "date-fns";

interface ChallengeModalStatsProps {
  challenge: Challenge;
}

export function ChallengeModalStats({ challenge }: ChallengeModalStatsProps) {
  const stats = [
    {
      icon: Users,
      label: "Participants",
      value: challenge.entry_count.toString(),
      color: "text-cyan-400",
      bgColor: "rgba(6, 182, 212, 0.15)",
    },
    {
      icon: Clock,
      label: "Started",
      value: format(new Date(challenge.start_date), "MMM d, yyyy"),
      color: "text-violet-400",
      bgColor: "rgba(139, 92, 246, 0.15)",
    },
    ...(challenge.end_date
      ? [
          {
            icon: Target,
            label: "Ends",
            value: format(new Date(challenge.end_date), "MMM d, yyyy"),
            color: "text-amber-400",
            bgColor: "rgba(245, 158, 11, 0.15)",
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-6">
      {/* Description */}
      {challenge.description && (
        <p className="text-slate-300 leading-relaxed">{challenge.description}</p>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            className="p-4 rounded-xl"
            style={{
              background: `linear-gradient(135deg, rgba(30, 40, 60, 0.6), rgba(20, 28, 48, 0.6))`,
              boxShadow: `inset 0 1px 0 rgba(255, 255, 255, 0.05)`,
            }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <div className="flex items-center gap-2 mb-2">
              <div
                className="p-1.5 rounded-lg"
                style={{ background: stat.bgColor }}
              >
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
              </div>
              <span className="text-xs text-slate-400">{stat.label}</span>
            </div>
            <p className="text-lg font-bold text-white">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Prize section */}
      {challenge.prize_description && (
        <motion.div
          className="p-5 rounded-xl"
          style={{
            background: `linear-gradient(135deg, rgba(251, 191, 36, 0.1), rgba(245, 158, 11, 0.05))`,
            boxShadow: `inset 0 1px 0 rgba(255, 255, 255, 0.05)`,
          }}
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Award className="w-5 h-5 text-amber-400" />
            <h3 className="text-sm font-semibold text-white">Prize</h3>
          </div>
          <p className="text-sm text-slate-300">{challenge.prize_description}</p>
        </motion.div>
      )}
    </div>
  );
}