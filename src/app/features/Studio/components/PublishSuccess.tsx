'use client';

/**
 * PublishSuccess
 *
 * Branded celebration overlay shown after successfully publishing a list.
 * Features golden trophy animation, brand-palette confetti, and G.O.A.T. logo flash.
 */

import { motion, AnimatePresence } from 'framer-motion';
import { Crown, ArrowRight, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { DURATION } from '@/lib/animations/motion-presets';
import { useStudioStore } from '@/stores/studio-store';

interface PublishSuccessProps {
  listId: string;
  listTitle: string;
  onDismiss: () => void;
}

export function PublishSuccess({ listId, listTitle, onDismiss }: PublishSuccessProps) {
  const router = useRouter();
  const reset = useStudioStore((state) => state.reset);
  const [showConfetti, setShowConfetti] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(false), 3500);
    return () => clearTimeout(timer);
  }, []);

  const handleStartRanking = () => {
    router.push(`/goat?list=${listId}`);
  };

  const handleCreateAnother = () => {
    reset();
    onDismiss();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-modal flex items-center justify-center
          bg-black/80 backdrop-blur-xs"
      >
        {/* Screen pulse on entry */}
        <motion.div
          className="fixed inset-0 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.15, 0] }}
          transition={{ duration: DURATION.dramatic, times: [0, 0.3, 1] }}
          style={{
            background: 'radial-gradient(circle at center, rgba(251, 191, 36, 0.4) 0%, transparent 70%)',
          }}
        />

        {/* Confetti particles */}
        {showConfetti && <BrandedConfetti />}

        {/* Success Card */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 300 }}
          className="relative max-w-md w-full mx-4 p-8 rounded-container text-center overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(15, 15, 25, 0.98) 0%, rgba(25, 20, 10, 0.95) 100%)',
            border: '1px solid rgba(251, 191, 36, 0.2)',
            boxShadow: '0 0 60px rgba(251, 191, 36, 0.1), 0 20px 60px rgba(0, 0, 0, 0.5)',
          }}
        >
          {/* Background glow */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse at center top, rgba(251, 191, 36, 0.08) 0%, transparent 60%)',
            }}
          />

          {/* Trophy / Crown animation */}
          <motion.div
            initial={{ scale: 0, y: 30 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ delay: 0.3, type: 'spring', stiffness: 200, damping: 12 }}
            className="relative w-24 h-24 mx-auto mb-4"
          >
            {/* Glow ring behind trophy */}
            <motion.div
              className="absolute inset-0 rounded-full"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5, duration: DURATION.emphasis }}
              style={{
                background: 'radial-gradient(circle, rgba(251, 191, 36, 0.3) 0%, rgba(245, 158, 11, 0.1) 50%, transparent 70%)',
                filter: 'blur(10px)',
              }}
            />
            {/* Crown icon */}
            <motion.div
              className="relative w-full h-full flex items-center justify-center rounded-full"
              style={{
                background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.15) 0%, rgba(217, 119, 6, 0.1) 100%)',
                border: '2px solid rgba(251, 191, 36, 0.3)',
              }}
            >
              <Crown
                className="w-12 h-12"
                style={{
                  color: '#fbbf24',
                  filter: 'drop-shadow(0 0 12px rgba(251, 191, 36, 0.6))',
                }}
              />
            </motion.div>
          </motion.div>

          {/* G.O.A.T. logo flash */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: [0, 1, 1, 0.6], scale: [0.8, 1.1, 1, 1] }}
            transition={{ delay: 0.6, duration: 1.2, times: [0, 0.3, 0.6, 1] }}
            className="mb-2"
          >
            <span
              className="text-sm font-black tracking-widest"
              style={{
                background: 'linear-gradient(135deg, #fcd34d 0%, #f59e0b 50%, #d97706 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              G.O.A.T.
            </span>
          </motion.div>

          {/* Title */}
          <motion.h2
            className="text-2xl font-bold text-white mb-2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            Your list is ready to rank!
          </motion.h2>
          <motion.p
            className="text-gray-400 mb-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9 }}
          >
            &quot;{listTitle}&quot; has been published
          </motion.p>

          {/* Actions */}
          <motion.div
            className="space-y-3 relative z-10"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
          >
            <Button
              onClick={handleStartRanking}
              className="w-full py-3"
              style={{
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                color: 'white',
                border: 'none',
              }}
            >
              Start Ranking
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Button
              variant="outline"
              onClick={handleCreateAnother}
              className="w-full border-gray-700 hover:border-amber-500/30 hover:bg-amber-500/5"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Another List
            </Button>
          </motion.div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Brand-palette confetti with gold/amber/bronze/warm-white particles
 */
function BrandedConfetti() {
  const colors = ['#fbbf24', '#f59e0b', '#fffbeb', '#b45309', '#fcd34d', '#d97706'];
  const particles = Array.from({ length: 50 }).map((_, i) => ({
    id: i,
    x: Math.random() * 100,
    delay: Math.random() * 0.5,
    color: colors[Math.floor(Math.random() * colors.length)],
    duration: 2 + Math.random() * 2,
    size: 3 + Math.random() * 5,
    rotation: Math.random() * 360,
  }));

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          initial={{
            y: -20,
            x: `${p.x}vw`,
            opacity: 1,
            rotate: 0,
          }}
          animate={{
            y: '100vh',
            opacity: 0,
            rotate: p.rotation,
          }}
          transition={{ duration: p.duration, delay: p.delay, ease: 'linear' }}
          className="absolute rounded-sm"
          style={{
            backgroundColor: p.color,
            width: p.size,
            height: p.size * 0.6,
          }}
        />
      ))}
    </div>
  );
}
