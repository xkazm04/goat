"use client";

import { motion } from 'framer-motion';
import { List, Plus, Home } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface MatchNoListStateProps {
  title?: string;
  message?: string;
  primaryButtonText?: string;
  secondaryButtonText?: string;
  onPrimaryClick?: () => void;
  onSecondaryClick?: () => void;
}

export function MatchNoListState({ 
  title = "No List Selected",
  message = "Please create or select a list to start ranking.",
  primaryButtonText = "Browse Lists",
  secondaryButtonText = "Create New List",
  onPrimaryClick,
  onSecondaryClick
}: MatchNoListStateProps) {
  const router = useRouter();

  const handlePrimaryClick = () => {
    if (onPrimaryClick) {
      onPrimaryClick();
    } else {
      router.push('/');
    }
  };

  const handleSecondaryClick = () => {
    if (onSecondaryClick) {
      onSecondaryClick();
    } else {
      router.push('/create');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="text-center max-w-lg px-6"
      >
        {/* Animated List Icon */}
        <motion.div
          initial={{ scale: 0, y: -20 }}
          animate={{ scale: 1, y: 0 }}
          transition={{ 
            type: "spring", 
            stiffness: 200, 
            damping: 15,
            delay: 0.1 
          }}
          className="relative mb-8"
        >
          <div className="w-24 h-24 mx-auto rounded-2xl bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center shadow-2xl border border-slate-600">
            <List className="w-12 h-12 text-slate-300" />
          </div>
          
          {/* Floating papers effect */}
          {Array.from({ length: 3 }).map((_, i) => (
            <motion.div
              key={i}
              className={`absolute w-16 h-20 rounded-lg border-2 border-dashed border-slate-500 ${
                i === 0 ? 'top-2 left-2' : i === 1 ? 'top-4 right-2' : 'bottom-2 left-4'
              }`}
              animate={{
                y: [-2, 2, -2],
                rotate: [i * 5 - 5, i * 5 + 5, i * 5 - 5],
                opacity: [0.3, 0.6, 0.3]
              }}
              transition={{
                duration: 2 + i * 0.5,
                repeat: Infinity,
                ease: "easeInOut",
                delay: i * 0.2
              }}
            />
          ))}
        </motion.div>

        <motion.h2 
          className="text-3xl font-bold text-slate-200 mb-4"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {title}
        </motion.h2>
        
        <motion.p 
          className="text-slate-400 text-lg mb-10 leading-relaxed"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {message}
        </motion.p>

        {/* Action Buttons */}
        <motion.div 
          className="flex flex-col sm:flex-row gap-4 justify-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <motion.button
            onClick={handlePrimaryClick}
            className="group relative px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center gap-3 min-w-[160px]"
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
          >
            <Home className="w-5 h-5" />
            {primaryButtonText}
            
            {/* Button glow effect */}
            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 opacity-0 group-hover:opacity-30 transition-opacity duration-200 blur-xl" />
          </motion.button>

          <motion.button
            onClick={handleSecondaryClick}
            className="group relative px-8 py-4 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center gap-3 min-w-[160px]"
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
          >
            <Plus className="w-5 h-5" />
            {secondaryButtonText}
            
            {/* Button glow effect */}
            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 opacity-0 group-hover:opacity-30 transition-opacity duration-200 blur-xl" />
          </motion.button>
        </motion.div>

        {/* Decorative grid background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `
              radial-gradient(circle at 20% 30%, rgba(59, 130, 246, 0.3) 0%, transparent 50%),
              radial-gradient(circle at 80% 70%, rgba(16, 185, 129, 0.3) 0%, transparent 50%),
              linear-gradient(45deg, transparent 49%, rgba(71, 85, 105, 0.1) 50%, transparent 51%)
            `,
            backgroundSize: '100% 100%, 100% 100%, 20px 20px'
          }} />
        </div>
      </motion.div>
    </div>
  );
}