"use client";

import { motion } from 'framer-motion';
import { DiceLoader } from '../components/DiceLoader';

interface MatchLoadingStateProps {
  message?: string;
  submessage?: string;
}

export function MatchLoadingState({
  message = "Loading List",
  submessage = "Preparing your ranking session..."
}: MatchLoadingStateProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="text-center"
      >
        {/* Bouncing Dice Loader */}
        <div className="mb-8">
          <DiceLoader />
        </div>

        <motion.h2
          className="text-2xl font-bold text-white mb-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {message}
        </motion.h2>

        <motion.p
          className="text-slate-400 text-lg"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {submessage}
        </motion.p>

        {/* Progress dots */}
        <motion.div
          className="flex justify-center gap-2 mt-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          {Array.from({ length: 3 }).map((_, i) => (
            <motion.div
              key={i}
              className="w-2 h-2 bg-blue-400 rounded-full"
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.3, 1, 0.3]
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: i * 0.2,
                ease: "easeInOut"
              }}
            />
          ))}
        </motion.div>
      </motion.div>
    </div>
  );
}