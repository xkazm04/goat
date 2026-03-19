"use client";

import { motion } from 'framer-motion';
import { ArrowLeft, Share2 } from 'lucide-react';
import Link from 'next/link';
import { useGridStore } from '@/stores/grid-store';
import { useMatchStore } from '@/stores/match-store';
import { DURATION } from '@/lib/animations/motion-presets';

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
            transition={{ duration: DURATION.normal, ease: "easeOut" }}
            className="absolute top-4 left-4 z-10 flex items-center gap-3"
            data-testid="match-grid-header"
        >
            <Link
                href="/"
                className="p-2 rounded-control bg-slate-800/60 backdrop-blur-xs hover:bg-slate-700/60 text-slate-400 hover:text-white transition-all duration-200 border border-slate-700/50 hover:border-slate-600/50 focus-ring"
                aria-label="Back"
                data-testid="match-back-btn"
            >
                <ArrowLeft className="w-5 h-5" />
            </Link>
            <h2 className="text-grid-title font-bold tracking-tight font-heading text-white/90 drop-shadow-xs">
                {title}
            </h2>
            {isComplete && (
                <motion.button
                    onClick={() => setShowResultShareModal(true)}
                    className="ml-2 flex items-center gap-2 px-4 py-2 rounded-control bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-sm transition-colors border border-cyan-500/50"
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
                        opacity: { duration: DURATION.normal },
                        scale: { duration: DURATION.normal },
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
