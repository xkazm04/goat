"use client";

import { motion } from "framer-motion";
import { Sparkles, Trophy } from "lucide-react";

export function ShowcaseHeader() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
      className="text-center relative z-10"
    >
      <div className="flex items-center justify-center gap-3 mb-4">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 rounded-full flex items-center justify-center"
          style={{
            background: `linear-gradient(135deg, #4c1d95, #7c3aed, #3b82f6)`,
            boxShadow: '0 4px 14px rgba(124, 58, 237, 0.4)'
          }}
        >
          <Sparkles className="w-4 h-4 text-white" />
        </motion.div>
        
        <div className="mb-8">
          <h1 
            className="text-8xl text-yellow-300 md:text-9xl font-black tracking-tight mb-4">
            G.O.A.T. 
          </h1>
          
          <div className="flex items-center justify-center gap-4 mb-6">
            <div 
              className="h-px flex-1"
            />
            <span 
              className="text-xl font-semibold tracking-wider"
            >
              GREATEST OF ALL TIME
            </span>
            <div 
              className="h-px flex-1"
            />
          </div>
        </div>
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 rounded-full flex items-center justify-center"
          style={{
            background: `linear-gradient(135deg, #f59e0b, #d97706, #f97316)`,
            boxShadow: '0 4px 14px rgba(245, 158, 11, 0.4)'
          }}
        >
          <Trophy className="w-4 h-4 text-white" />
        </motion.div>
      </div>
      {/* Subtitle with animated gradient */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.8 }}
        className="mt-6"
      >
        <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">
          Sports • Gaming • Music • Movies • Literature • Cars
        </p>
      </motion.div>
    </motion.div>
  );
}