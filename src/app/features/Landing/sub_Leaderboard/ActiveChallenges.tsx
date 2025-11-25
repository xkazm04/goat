"use client";

import { motion } from 'framer-motion';
import { Trophy, Users, Clock, Target, Play, Zap, Flame } from 'lucide-react';
import { useChallenges } from '@/hooks/use-challenges';
import { useChallengeStore } from '@/stores/challenge-store';
import { formatDistanceToNow } from 'date-fns';
import { staggerContainer, fadeInUp } from '../shared';

// Premium card variants
const cardVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.95 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      delay: i * 0.1,
      duration: 0.5,
      ease: [0.23, 1, 0.32, 1],
    },
  }),
};

export function ActiveChallenges() {
  const { openChallengeModal } = useChallengeStore();
  const { data: challenges = [], isLoading } = useChallenges({
    status: 'active',
    limit: 6,
  });

  if (isLoading) {
    return (
      <section className="relative py-16 px-6 overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-green-950/10 to-transparent" />
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div 
                key={i} 
                className="h-56 rounded-2xl animate-pulse"
                style={{
                  background: "linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)",
                  border: "1px solid rgba(255,255,255,0.05)",
                }}
              />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (challenges.length === 0) return null;

  return (
    <section className="relative py-16 px-6 overflow-hidden" data-testid="active-challenges">
      {/* Section background */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-emerald-950/10 to-transparent" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(16,185,129,0.08)_0%,transparent_60%)]" />
      
      <div className="max-w-7xl mx-auto relative">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex items-center justify-between mb-10"
        >
          <div className="flex items-center gap-4">
            <div className="relative">
              <div 
                className="p-3 rounded-xl"
                style={{
                  background: "linear-gradient(135deg, rgba(16,185,129,0.2) 0%, rgba(5,150,105,0.1) 100%)",
                  border: "1px solid rgba(16,185,129,0.3)",
                  boxShadow: "0 0 30px rgba(16,185,129,0.2)",
                }}
              >
                <Target className="w-6 h-6 text-emerald-400" />
              </div>
              <motion.div
                className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-400"
                animate={{ scale: [1, 1.3, 1], opacity: [1, 0.6, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                Active Challenges
                <Flame className="w-5 h-5 text-orange-400" />
              </h3>
              <p className="text-sm text-gray-400 mt-0.5">Jump in now and compete for prizes</p>
            </div>
          </div>
          
          <motion.div
            className="hidden md:flex items-center gap-2 px-4 py-2 rounded-full"
            style={{
              background: "linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
            animate={{ boxShadow: ["0 0 20px rgba(16,185,129,0.1)", "0 0 30px rgba(16,185,129,0.2)", "0 0 20px rgba(16,185,129,0.1)"] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            <Zap className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-medium text-emerald-300">{challenges.length} Live</span>
          </motion.div>
        </motion.div>

        {/* Challenge cards grid */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {challenges.map((challenge, index) => {
            const endsIn = challenge.end_date
              ? formatDistanceToNow(new Date(challenge.end_date), { addSuffix: true })
              : null;

            return (
              <motion.div
                key={challenge.id}
                custom={index}
                variants={cardVariants}
                className="group relative"
                data-testid={`challenge-card-${challenge.id}`}
              >
                {/* Card glow effect */}
                <div 
                  className="absolute -inset-px rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-sm"
                  style={{
                    background: "linear-gradient(135deg, rgba(16,185,129,0.4) 0%, rgba(6,182,212,0.4) 100%)",
                  }}
                />
                
                {/* Card content */}
                <div 
                  className="relative h-full p-6 rounded-2xl transition-all duration-500 group-hover:-translate-y-1"
                  style={{
                    background: "linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    backdropFilter: "blur(20px)",
                  }}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div 
                      className="p-2.5 rounded-xl"
                      style={{
                        background: "linear-gradient(135deg, rgba(234,179,8,0.2) 0%, rgba(249,115,22,0.1) 100%)",
                        border: "1px solid rgba(234,179,8,0.3)",
                      }}
                    >
                      <Trophy className="w-5 h-5 text-yellow-400" />
                    </div>
                    <motion.span 
                      className="px-3 py-1 text-xs font-bold rounded-full"
                      style={{
                        background: "linear-gradient(135deg, rgba(16,185,129,0.3) 0%, rgba(16,185,129,0.1) 100%)",
                        border: "1px solid rgba(16,185,129,0.4)",
                        color: "#6ee7b7",
                      }}
                      animate={{ opacity: [1, 0.7, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      ● LIVE
                    </motion.span>
                  </div>

                  {/* Title */}
                  <h4 className="text-lg font-bold text-white mb-1 line-clamp-2 group-hover:text-emerald-100 transition-colors">
                    {challenge.title}
                  </h4>
                  <p className="text-xs text-emerald-400/70 font-medium mb-3">{challenge.category}</p>

                  {/* Description */}
                  {challenge.description && (
                    <p className="text-sm text-gray-400 mb-4 line-clamp-2">{challenge.description}</p>
                  )}

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div 
                      className="flex items-center gap-2 px-3 py-2 rounded-lg"
                      style={{
                        background: "rgba(255,255,255,0.03)",
                        border: "1px solid rgba(255,255,255,0.05)",
                      }}
                    >
                      <Users className="w-4 h-4 text-cyan-400" />
                      <span className="text-sm text-gray-300">{challenge.entry_count}</span>
                    </div>
                    {endsIn && (
                      <div 
                        className="flex items-center gap-2 px-3 py-2 rounded-lg"
                        style={{
                          background: "rgba(255,255,255,0.03)",
                          border: "1px solid rgba(255,255,255,0.05)",
                        }}
                      >
                        <Clock className="w-4 h-4 text-purple-400" />
                        <span className="text-sm text-gray-300 truncate">{endsIn}</span>
                      </div>
                    )}
                  </div>

                  {/* Prize */}
                  {challenge.prize_description && (
                    <div 
                      className="p-3 rounded-xl mb-4"
                      style={{
                        background: "linear-gradient(135deg, rgba(234,179,8,0.1) 0%, rgba(249,115,22,0.05) 100%)",
                        border: "1px solid rgba(234,179,8,0.2)",
                      }}
                    >
                      <p className="text-xs text-yellow-300/90 font-medium line-clamp-2">
                        🏆 {challenge.prize_description}
                      </p>
                    </div>
                  )}

                  {/* Action button */}
                  <motion.button
                    onClick={() => openChallengeModal(challenge)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold text-white overflow-hidden relative"
                    style={{
                      background: "linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)",
                      boxShadow: "0 4px 20px rgba(6,182,212,0.3)",
                    }}
                    whileHover={{ scale: 1.02, boxShadow: "0 6px 30px rgba(6,182,212,0.4)" }}
                    whileTap={{ scale: 0.98 }}
                    data-testid={`challenge-join-btn-${challenge.id}`}
                  >
                    <Play className="w-4 h-4" />
                    Join Challenge
                    
                    {/* Button shine */}
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12"
                      initial={{ x: "-100%" }}
                      whileHover={{ x: "100%" }}
                      transition={{ duration: 0.6 }}
                    />
                  </motion.button>

                  {/* Card shimmer effect */}
                  <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
                    <motion.div 
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -skew-x-12"
                      initial={{ x: "-100%" }}
                      animate={{ x: "200%" }}
                      transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
                    />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
