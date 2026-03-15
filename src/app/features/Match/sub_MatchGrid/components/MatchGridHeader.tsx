"use client";

import { motion } from 'framer-motion';
import { Home, Share2 } from 'lucide-react';
import Link from 'next/link';
import { useGridStore } from '@/stores/grid-store';
import { useMatchStore } from '@/stores/match-store';

interface MatchGridHeaderProps {
    title?: string;
}

export function MatchGridHeader({
    title = "Neon Arena",
}: MatchGridHeaderProps) {
    const isComplete = useGridStore(s => s.gridStatistics.isComplete);
    const setShowResultShareModal = useMatchStore(s => s.setShowResultShareModal);

    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="absolute top-4 left-4 z-10 flex items-center gap-3"
        >
            <Link
                href="/"
                className="p-2 rounded-lg bg-slate-800/60 backdrop-blur-xs hover:bg-slate-700/60 text-slate-400 hover:text-white transition-all duration-200 border border-slate-700/50 hover:border-slate-600/50
                    focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-hover focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
                aria-label="Back to Home"
            >
                <Home className="w-5 h-5" />
            </Link>
            <h2 className="text-xl font-bold font-grotesk text-white/90 tracking-tight drop-shadow-xs">
                {title}
            </h2>
            {isComplete && (
                <motion.button
                    onClick={() => setShowResultShareModal(true)}
                    className="ml-2 flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-sm transition-colors border border-cyan-500/50"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{
                        opacity: 1,
                        scale: 1,
                        boxShadow: [
                            '0 0 0 0 rgba(6,182,212,0.4)',
                            '0 0 0 12px rgba(6,182,212,0)',
                            '0 0 0 0 rgba(6,182,212,0.4)',
                        ],
                    }}
                    transition={{
                        opacity: { duration: 0.3 },
                        scale: { duration: 0.3 },
                        boxShadow: { duration: 2, repeat: Infinity },
                    }}
                    data-testid="share-results-btn"
                >
                    <Share2 className="w-4 h-4" />
                    Share
                </motion.button>
            )}
        </motion.div>
    );
}
