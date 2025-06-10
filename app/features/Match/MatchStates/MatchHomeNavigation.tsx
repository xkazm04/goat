"use client";

import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Home } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function MatchHomeNavigation() {
  const router = useRouter();
  const [isHovered, setIsHovered] = useState(false);

  const handleGoHome = () => {
    router.push('/');
  };

  return (
    <div className="fixed top-0 left-1/2 transform -translate-x-1/2 z-50">
      {/* Home Button - Animates from above */}
      <AnimatePresence>
        {isHovered && (
          <motion.button
            initial={{ opacity: 0, y: -60, scale: 0.8 }}
            animate={{ 
              opacity: 1, 
              y: 8, 
              scale: 1,
              transition: {
                type: "spring",
                stiffness: 400,
                damping: 25,
                mass: 0.8
              }
            }}
            exit={{ 
              opacity: 0, 
              y: -60, 
              scale: 0.8,
              transition: {
                duration: 0.2,
                ease: "easeInOut"
              }
            }}
            onClick={handleGoHome}
            className="group relative px-6 py-3 bg-gradient-to-r from-slate-800 to-slate-900 hover:from-slate-700 hover:to-slate-800 text-white rounded-xl font-medium transition-all duration-200 shadow-2xl border border-slate-600 backdrop-blur-sm flex items-center gap-3"
            whileHover={{ scale: 1.05, y: 6 }}
            whileTap={{ scale: 0.95 }}
          >
            <Home className="w-5 h-5 text-slate-300 group-hover:text-white transition-colors" />
            <span className="text-slate-300 group-hover:text-white transition-colors">
              Home
            </span>
            
            {/* Glow effect */}
            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-600/20 to-purple-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200 blur-xl" />
            
            {/* Border glow */}
            <div className="absolute inset-0 rounded-xl border border-blue-400/0 group-hover:border-blue-400/50 transition-colors duration-200" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chevron Trigger */}
      <motion.div
        className="relative pt-2"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.3 }}
      >
        <motion.button
          className="group relative p-3 bg-gradient-to-b from-slate-800/90 to-slate-900/90 backdrop-blur-sm text-slate-300 hover:text-white rounded-b-2xl shadow-lg border-x border-b border-slate-600/50 hover:border-slate-500/70 transition-all duration-200"
          whileHover={{ 
            scale: 1.1,
            backgroundColor: "rgba(51, 65, 85, 0.95)"
          }}
          whileTap={{ scale: 0.95 }}
          animate={{
            y: isHovered ? 2 : 0
          }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            animate={{ 
              rotate: isHovered ? 180 : 0,
              scale: isHovered ? 1.1 : 1
            }}
            transition={{ 
              duration: 0.3,
              ease: "easeInOut"
            }}
          >
            <ChevronDown className="w-5 h-5" />
          </motion.div>
          
          {/* Hover hint */}
          <motion.div
            className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-0.5 h-2 bg-gradient-to-b from-blue-400 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200"
            animate={{
              height: isHovered ? 8 : 2,
              opacity: isHovered ? 1 : 0
            }}
          />
          
          {/* Pulse effect on hover */}
          <AnimatePresence>
            {isHovered && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ 
                  opacity: [0, 0.3, 0], 
                  scale: [0.8, 1.2, 1.4] 
                }}
                exit={{ opacity: 0 }}
                transition={{ 
                  duration: 1.5, 
                  repeat: Infinity,
                  ease: "easeOut"
                }}
                className="absolute inset-0 rounded-b-2xl border-2 border-blue-400/30"
              />
            )}
          </AnimatePresence>
        </motion.button>

        {/* Tooltip */}
        <AnimatePresence>
          {isHovered && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 5, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.9 }}
              transition={{ delay: 0.8, duration: 0.2 }}
              className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-3 py-1.5 bg-slate-800 text-slate-300 text-sm rounded-lg shadow-lg border border-slate-600 whitespace-nowrap pointer-events-none"
            >
              Go to Home
              <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-slate-800 border-l border-t border-slate-600 rotate-45" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}