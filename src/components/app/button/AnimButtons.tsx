"use client";

import { motion } from "framer-motion";
import { Play } from "lucide-react";

type Props = {
    label?: string;
    onClick?: () => void;
}

export function ShimmerBtn({label, onClick}: Props) {
  return (
    <motion.button 
      onClick={onClick}
      className="relative w-28 h-28 rounded-full group hover:opacity-70 transition-opacity duration-300 ease-in-out flex items-center justify-center shadow-lg overflow-hidden"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      {/* Rotating glow border */}
      <div className="absolute inset-0 rounded-full">
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            background: `conic-gradient(
              from 0deg,
              transparent 0deg,
              transparent 45deg,
              transparent 90deg,
              #fbbf24 135deg,
              transparent 180deg,
              transparent 225deg,
              transparent 270deg,
              #d97706 315deg,
              transparent 360deg
            )`,
            padding: '2px'
          }}
          animate={{ rotate: 360 }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "linear"
          }}
        >
          <div 
            className="w-full h-full rounded-full"
            style={{
              background: `
                linear-gradient(135deg, 
                  rgba(15, 23, 42, 0.95) 0%,
                  rgba(30, 41, 59, 0.95) 100%
                )
              `
            }}
          />
        </motion.div>
      </div>

      {/* Inner button */}
      <motion.div
        className="absolute inset-2 rounded-full flex items-center justify-center shadow-2xl"
        style={{
          background: `
            radial-gradient(
              circle at 30% 30%,
              rgba(245, 158, 11, 0.3) 0%,
              rgba(217, 119, 6, 0.2) 30%,
              rgba(15, 23, 42, 0.9) 70%,
              rgba(30, 41, 59, 0.95) 100%
            )
          `,
          border: '1px solid rgba(245, 158, 11, 0.3)',
          boxShadow: `
            inset 0 2px 8px rgba(245, 158, 11, 0.2),
            inset 0 -2px 8px rgba(0, 0, 0, 0.3),
            0 8px 25px rgba(245, 158, 11, 0.15)
          `
        }}
        whileHover={{
          boxShadow: `
            inset 0 2px 12px rgba(245, 158, 11, 0.3),
            inset 0 -2px 12px rgba(0, 0, 0, 0.4),
            0 12px 35px rgba(245, 158, 11, 0.25)
          `
        }}
        whileTap={{
          scale: 0.95,
          boxShadow: `
            inset 0 4px 8px rgba(0, 0, 0, 0.8),
            inset 0 -1px 4px rgba(245, 158, 11, 0.2),
            0 4px 15px rgba(245, 158, 11, 0.1)
          `
        }}
      >
        <motion.div
          className="flex flex-col items-center justify-center"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <Play 
            className="w-5 h-5 text-white mb-1 drop-shadow-lg" 
            fill="currentColor"
          />
          <span className="text-md font-bold text-white/90 tracking-wider uppercase drop-shadow-sm">
            {label}
          </span>
        </motion.div>
      </motion.div>

      {/* Pulse effect on hover */}
      <motion.div
        className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100"
        style={{
          background: `radial-gradient(
            circle,
            rgba(245, 158, 11, 0.1) 0%,
            transparent 70%
          )`
        }}
        animate={{
          scale: [1, 1.4, 1],
          opacity: [0, 0.3, 0]
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
    </motion.button>
  );
}