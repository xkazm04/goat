"use client";

import { motion } from "framer-motion";
import { Trophy, X, Sparkles } from "lucide-react";

interface CompletionModalHeaderProps {
  onClose: () => void;
  listTitle: string;
}

export function CompletionModalHeader({ 
  onClose, 
  listTitle 
}: CompletionModalHeaderProps) {
  return (
    <div 
      className="px-8 py-6 border-b flex items-center justify-between relative overflow-hidden"
      style={{
        borderColor: 'rgba(16, 185, 129, 0.3)',
        background: `
          linear-gradient(135deg, 
            rgba(16, 185, 129, 0.1) 0%,
            rgba(52, 211, 153, 0.05) 50%,
            rgba(110, 231, 183, 0.1) 100%
          )
        `
      }}
    >
      {/* Animated background sparkles */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute"
            style={{
              left: `${20 + i * 15}%`,
              top: `${20 + (i % 2) * 60}%`,
            }}
            animate={{
              y: [-10, 10, -10],
              opacity: [0.3, 0.8, 0.3],
              scale: [0.8, 1.2, 0.8],
            }}
            transition={{
              repeat: Infinity,
              duration: 3 + i * 0.5,
              ease: "easeInOut",
              delay: i * 0.2
            }}
          >
            <Sparkles 
              className="w-4 h-4 text-emerald-400" 
              style={{ 
                filter: 'drop-shadow(0 0 6px rgba(16, 185, 129, 0.6))'
              }} 
            />
          </motion.div>
        ))}
      </div>

      <div className="flex items-center gap-4 relative z-10">
        <motion.div 
          className="w-16 h-16 rounded-xl flex items-center justify-center"
          style={{
            background: `linear-gradient(135deg, 
              rgba(16, 185, 129, 0.8) 0%,
              rgba(52, 211, 153, 0.8) 100%
            )`,
            boxShadow: `
              0 8px 32px rgba(16, 185, 129, 0.4),
              0 0 0 1px rgba(255, 255, 255, 0.1)
            `
          }}
          animate={{
            boxShadow: [
              '0 8px 32px rgba(16, 185, 129, 0.4)',
              '0 12px 40px rgba(16, 185, 129, 0.6)',
              '0 8px 32px rgba(16, 185, 129, 0.4)'
            ]
          }}
          transition={{
            repeat: Infinity,
            duration: 2,
            ease: "easeInOut"
          }}
        >
          <motion.div
            animate={{ 
              rotate: [0, 10, -10, 0],
              scale: [1, 1.1, 1]
            }}
            transition={{
              repeat: Infinity,
              duration: 2,
              ease: "easeInOut"
            }}
          >
            <Trophy className="w-8 h-8 text-white" />
          </motion.div>
        </motion.div>
        
        <div>
          <motion.h2 
            className="text-3xl font-black tracking-tight mb-1"
            style={{
              background: `
                linear-gradient(135deg, 
                  #10b981 0%, 
                  #34d399 50%, 
                  #6ee7b7 100%
                )
              `,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              textShadow: '0 0 20px rgba(16, 185, 129, 0.3)'
            }}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            Congratulations! 🎉
          </motion.h2>
          
          <motion.p 
            className="text-slate-300 font-medium"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            You've completed your ranking list!
          </motion.p>
        </div>
      </div>
      
      {/* Close Button */}
      <button
        onClick={onClose}
        className="p-3 rounded-xl transition-all duration-200 hover:bg-slate-700/50 relative z-10"
      >
        <X className="w-6 h-6 text-slate-400 hover:text-slate-200" />
      </button>
    </div>
  );
}