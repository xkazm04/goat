'use client';

/**
 * PublishSuccess
 *
 * Celebration overlay shown after successfully publishing a list.
 * Features confetti animation and navigation options.
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { CheckCircle, ArrowRight, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
    // Auto-hide confetti after animation
    const timer = setTimeout(() => setShowConfetti(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  const handleStartRanking = () => {
    router.push(`/match-test?list=${listId}`);
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
        className="fixed inset-0 z-50 flex items-center justify-center
          bg-black/80 backdrop-blur-sm"
      >
        {/* Confetti particles */}
        {showConfetti && <ConfettiEffect />}

        {/* Success Card */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 300 }}
          className="relative max-w-md w-full mx-4 p-8 bg-gray-900 border border-gray-700
            rounded-2xl text-center"
        >
          {/* Success Icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: 'spring', stiffness: 400 }}
            className="w-20 h-20 mx-auto mb-6 rounded-full
              bg-gradient-to-br from-green-500/20 to-cyan-500/20
              flex items-center justify-center"
          >
            <CheckCircle className="w-12 h-12 text-green-400" />
          </motion.div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-white mb-2">
            List Published!
          </h2>
          <p className="text-gray-400 mb-6">
            &quot;{listTitle}&quot; is ready for ranking
          </p>

          {/* Actions */}
          <div className="space-y-3">
            <Button
              onClick={handleStartRanking}
              className="w-full py-3 bg-gradient-to-r from-cyan-500 to-purple-500
                hover:from-cyan-400 hover:to-purple-400"
            >
              Start Ranking
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Button
              variant="outline"
              onClick={handleCreateAnother}
              className="w-full"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Another List
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Simple confetti effect using CSS animations
 */
function ConfettiEffect() {
  const colors = ['#06b6d4', '#8b5cf6', '#22c55e', '#f59e0b', '#ef4444'];
  const particles = Array.from({ length: 50 }).map((_, i) => ({
    id: i,
    x: Math.random() * 100,
    delay: Math.random() * 0.5,
    color: colors[Math.floor(Math.random() * colors.length)],
    duration: 2 + Math.random() * 2,
  }));

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          initial={{ y: -20, x: `${p.x}vw`, opacity: 1 }}
          animate={{ y: '100vh', opacity: 0 }}
          transition={{ duration: p.duration, delay: p.delay, ease: 'linear' }}
          className="absolute w-2 h-2 rounded-full"
          style={{ backgroundColor: p.color }}
        />
      ))}
    </div>
  );
}
