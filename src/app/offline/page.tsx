'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { WifiOff, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(false);

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
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-950 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-md"
      >
        {/* Icon */}
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', duration: 0.5 }}
          className="mb-8"
        >
          <div className="w-24 h-24 bg-yellow-900/30 rounded-full flex items-center justify-center mx-auto">
            <WifiOff className="w-12 h-12 text-yellow-400" />
          </div>
        </motion.div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-white mb-4">
          {isOnline ? 'Back Online!' : "You're Offline"}
        </h1>

        {/* Description */}
        <p className="text-gray-400 mb-8">
          {isOnline
            ? 'Reconnecting...'
            : "Don't worry, your progress is saved locally. Connect to the internet to sync your data."}
        </p>

        {/* Status indicator */}
        {!isOnline && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-gray-800/50 rounded-lg p-4 mb-8"
          >
            <div className="flex items-center justify-center gap-2 text-yellow-400">
              <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
              <span className="text-sm">Waiting for connection...</span>
            </div>
          </motion.div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <motion.button
            onClick={handleRetry}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            <RefreshCw className="w-5 h-5" />
            Try Again
          </motion.button>

          <Link href="/">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
            >
              <Home className="w-5 h-5" />
              Go Home
            </motion.button>
          </Link>
        </div>

        {/* Info */}
        <p className="text-gray-500 text-sm mt-8">
          G.O.A.T. works offline! Your rankings are automatically saved and will
          sync when you reconnect.
        </p>
      </motion.div>
    </div>
  );
}
