"use client";

import { motion } from 'framer-motion';
import { AlertCircle, Home, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface MatchErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  showHomeButton?: boolean;
  showRetryButton?: boolean;
}

export function MatchErrorState({ 
  title = "List Not Found",
  message = "The list you're looking for doesn't exist or you don't have access to it.",
  onRetry,
  showHomeButton = true,
  showRetryButton = false
}: MatchErrorStateProps) {
  const router = useRouter();

  const handleGoHome = () => {
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="text-center max-w-md px-6"
      >
        {/* Animated Error Icon */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ 
            type: "spring", 
            stiffness: 200, 
            damping: 15,
            delay: 0.1 
          }}
          className="relative mb-6"
        >
          <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-r from-red-500 to-orange-500 flex items-center justify-center shadow-lg">
            <AlertCircle className="w-10 h-10 text-white" />
          </div>
          
          {/* Error pulse effect */}
          <motion.div
            className="absolute inset-0 rounded-full border-4 border-red-400"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.8, 0.2, 0.8]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        </motion.div>

        <motion.h2 
          className="text-2xl font-bold text-white mb-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {title}
        </motion.h2>
        
        <motion.p 
          className="text-slate-400 mb-8 leading-relaxed"
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
          {showHomeButton && (
            <motion.button
              onClick={handleGoHome}
              className="group relative px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center gap-2 min-w-[140px]"
              whileHover={{ scale: 1.05, y: -1 }}
              whileTap={{ scale: 0.95 }}
            >
              <Home className="w-4 h-4" />
              Go to Home
              
              {/* Button glow effect */}
              <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 opacity-0 group-hover:opacity-20 transition-opacity duration-200 blur-xl" />
            </motion.button>
          )}

          {showRetryButton && onRetry && (
            <motion.button
              onClick={onRetry}
              className="group relative px-6 py-3 bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center gap-2 min-w-[140px]"
              whileHover={{ scale: 1.05, y: -1 }}
              whileTap={{ scale: 0.95 }}
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
              
              {/* Button glow effect */}
              <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-slate-600 to-slate-700 opacity-0 group-hover:opacity-20 transition-opacity duration-200 blur-xl" />
            </motion.button>
          )}
        </motion.div>

        {/* Decorative elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
          {Array.from({ length: 5 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 bg-red-400 rounded-full opacity-20"
              style={{
                left: `${20 + i * 15}%`,
                top: `${30 + i * 10}%`
              }}
              animate={{
                y: [-10, 10, -10],
                opacity: [0.2, 0.5, 0.2]
              }}
              transition={{
                duration: 3 + i * 0.5,
                repeat: Infinity,
                ease: "easeInOut",
                delay: i * 0.3
              }}
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
}