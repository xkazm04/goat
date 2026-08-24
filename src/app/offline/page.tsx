'use client';

import { motion } from 'framer-motion';
import { RefreshCw, Home, WifiOff, CloudOff } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { GoatMascot } from '@/components/icons/GoatMascot';
import { Shimmer } from '@/components/visual/decorations/Shimmer';
import { Surface } from '@/components/visual/depth/Surface';
import { syncStatusColors } from '@/lib/offline/sync-status-colors';
import { useBacklogStore } from '@/stores/backlog/store';

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.1 },
  },
};

const staggerItem = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } },
};

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(false);
  const pendingChanges = useBacklogStore((state) => state.pendingChanges);

  useEffect(() => {
    // Check initial online status
    setIsOnline(navigator.onLine);

    // Listen for online/offline events
    const handleOnline = () => {
      setIsOnline(true);
      // Redirect to home after a brief delay
      setTimeout(() => {
        window.location.href = '/';
      }, 1000);
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-linear-to-b from-gray-900 to-gray-950 flex items-center justify-center p-4">
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="text-center max-w-md"
      >
        {/* Goat Mascot Illustration with radial glow */}
        <motion.div variants={staggerItem} className="mb-6 relative">
          {/* Radial glow behind mascot */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-48 h-48 rounded-full bg-gradient-radial from-amber-500/10 to-transparent blur-2xl" />
          </div>
          {/* Floating mascot */}
          <motion.div
            animate={{ y: [-4, 4] }}
            transition={{ duration: 3, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' }}
          >
            <GoatMascot size={200} className="mx-auto relative" />
          </motion.div>
        </motion.div>

        {/* Title */}
        <motion.h1
          variants={staggerItem}
          className="text-3xl font-bold text-white mb-3"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          {isOnline ? 'The G.O.A.T. is back!' : 'The G.O.A.T. is grazing offline'}
        </motion.h1>

        {/* Description */}
        <motion.p variants={staggerItem} className="text-gray-400 mb-6">
          {isOnline
            ? 'Reconnecting you now...'
            : "No worries \u2014 your rankings are saved locally and will sync the moment you\u2019re back online."}
        </motion.p>

        {/* Glass Dock status panel */}
        {!isOnline && (
          <motion.div variants={staggerItem}>
            <Surface variant="glass" elevation="raised" className="rounded-xl p-4 mb-6 border-amber-500/20">
              {/* Reconnection indicator with design system Shimmer */}
              <div className="flex items-center justify-center gap-2.5 mb-3">
                <WifiOff className={`w-4 h-4 ${syncStatusColors.offline.text}`} />
                <Shimmer duration={1200} className="flex-1 max-w-[180px] h-1 rounded-full bg-slate-700/50">
                  <div className="h-1 w-full rounded-full bg-gradient-to-r from-amber-500/60 to-amber-400/40" />
                </Shimmer>
                <span className={`text-xs font-medium ${syncStatusColors.offline.text}`}>Listening...</span>
              </div>

              {/* Pending changes count */}
              {pendingChanges.length > 0 && (
                <div className="flex items-center justify-center gap-2 text-slate-400">
                  <CloudOff className={`w-3.5 h-3.5 ${syncStatusColors.pending.text} opacity-70`} />
                  <span className="text-xs">
                    <strong className={syncStatusColors.pending.text}>{pendingChanges.length}</strong> pending change{pendingChanges.length !== 1 ? 's' : ''} will sync when online
                  </span>
                </div>
              )}
            </Surface>
          </motion.div>
        )}

        {/* Actions */}
        <motion.div variants={staggerItem} className="flex flex-col sm:flex-row gap-3 justify-center">
          <motion.button
            onClick={handleRetry}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="glass-dock-btn flex items-center justify-center gap-2 px-6 py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-medium transition-all shadow-lg shadow-amber-600/20"
          >
            <RefreshCw className="w-5 h-5" />
            Try Again
          </motion.button>

          <Link href="/">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="glass-dock-btn flex items-center justify-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-lg font-medium transition-all border border-white/10"
            >
              <Home className="w-5 h-5" />
              Go Home
            </motion.button>
          </Link>
        </motion.div>

        {/* Info */}
        <motion.p variants={staggerItem} className="text-gray-500 text-sm mt-8">
          G.O.A.T. works offline! Your rankings are automatically saved and will
          sync when you reconnect.
        </motion.p>
      </motion.div>
    </div>
  );
}
