"use client";

import Subtitle from "@/components/app/Subtitle";
import { motion } from "framer-motion";
import { Sparkles, Crown } from "lucide-react";

// Predefined particle positions and delays to avoid hydration mismatch
const particleConfig = [
  { left: 15, top: 20, delay: 0.5, duration: 3.2 },
  { left: 85, top: 35, delay: 1.8, duration: 4.1 },
  { left: 25, top: 70, delay: 0.2, duration: 3.8 },
  { left: 75, top: 15, delay: 2.3, duration: 3.5 },
  { left: 45, top: 85, delay: 1.1, duration: 4.0 },
  { left: 90, top: 60, delay: 0.8, duration: 3.7 },
  { left: 10, top: 45, delay: 2.0, duration: 3.3 },
  { left: 65, top: 25, delay: 1.5, duration: 3.9 },
  { left: 35, top: 90, delay: 0.3, duration: 3.6 },
  { left: 55, top: 10, delay: 2.2, duration: 3.4 },
  { left: 80, top: 75, delay: 1.0, duration: 4.2 },
  { left: 20, top: 50, delay: 1.7, duration: 3.1 }
];

export function ShowcaseHeader() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
      className="text-center relative z-10"
    >

      <div className="flex items-center justify-center gap-3 mb-4">
        <div className="mb-8 relative">
          {/* Floating sparkles */}
          <motion.div
            className="absolute -top-8 -left-8"
            animate={{
              y: [-10, 10, -10],
              rotate: [0, 180, 360],
              opacity: [0.5, 1, 0.5]
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            <Sparkles className="w-6 h-6 text-yellow-300" />
          </motion.div>
          
          <motion.div
            className="absolute -top-6 -right-12"
            animate={{
              y: [10, -10, 10],
              rotate: [360, 180, 0],
              opacity: [0.3, 0.8, 0.3]
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 1.5
            }}
          >
            <Crown className="w-8 h-8 text-amber-400" />
          </motion.div>

          <motion.div
            className="absolute -bottom-4 -left-10"
            animate={{
              scale: [0.8, 1.2, 0.8],
              opacity: [0.4, 0.7, 0.4]
            }}
            transition={{
              duration: 2.5,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.5
            }}
          >
            <Sparkles className="w-4 h-4 text-yellow-400" />
          </motion.div>

          {/* Main title with multiple text effects */}
          <motion.div 
            className="text-8xl md:text-9xl font-black tracking-tight mb-4 relative cursor-default"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ 
              duration: 1.2, 
              ease: "easeOut",
              type: "spring",
              stiffness: 100
            }}
            style={{
              background: `
                linear-gradient(
                  135deg,
                  #fbbf24 0%,
                  #f59e0b 25%,
                  #fbbf24 50%,
                  #d97706 75%,
                  #fbbf24 100%
                )
              `,
              backgroundSize: '200% 200%',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              filter: 'drop-shadow(0 0 30px rgba(251, 191, 36, 0.5))',
              textShadow: `
                0 0 10px rgba(251, 191, 36, 0.8),
                0 0 20px rgba(251, 191, 36, 0.6),
                0 0 40px rgba(251, 191, 36, 0.4)
              `
            }}
            whileHover={{
              scale: 1.05,
              filter: 'drop-shadow(0 0 50px rgba(251, 191, 36, 0.8))'
            }}
          >
            <motion.div
              animate={{
                backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "linear"
              }}
              style={{
                background: `
                  linear-gradient(
                    135deg,
                    #fbbf24 0%,
                    #f59e0b 25%,
                    #fbbf24 50%,
                    #d97706 75%,
                    #fbbf24 100%
                  )
                `,
                backgroundSize: '200% 200%',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}
            >
              G.O.A.T.
            </motion.div>
          </motion.div>
          
          {/* Subtitle with enhanced styling */}
          <Subtitle text="Greatest Of All Time" />
        </div>
      </div>


      {/* Particle effects */}
      <div className="absolute inset-0 -z-20 overflow-hidden">
        {particleConfig.map((particle, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-yellow-300 rounded-full"
            style={{
              left: `${particle.left}%`,
              top: `${particle.top}%`,
              boxShadow: '0 0 6px rgba(251, 191, 36, 0.8)'
            }}
            animate={{
              y: [0, -30, 0],
              opacity: [0, 1, 0],
              scale: [0, 1, 0]
            }}
            transition={{
              duration: particle.duration,
              repeat: Infinity,
              delay: particle.delay,
              ease: "easeInOut"
            }}
          />
        ))}
      </div>
    </motion.div>
  );
}