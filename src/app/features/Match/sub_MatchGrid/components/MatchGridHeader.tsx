"use client";

import { motion } from 'framer-motion';
import { ArrowLeft, RefreshCw, Share2, Zap } from 'lucide-react';
import Link from 'next/link';
import { useCallback } from 'react';

import { DURATION } from '@/lib/animations/motion-presets';
import { useOffline } from '@/lib/offline/OfflineProvider';
import { useBacklogStore } from '@/stores/backlog-store';
import { useGridStore } from '@/stores/grid-store';
import { useMatchStore } from '@/stores/match-store';

const IS_DEV = process.env.NODE_ENV === 'development';

interface MatchGridHeaderProps {
    title?: string;
}

export function MatchGridHeader({
    title = "Neon Arena",
}: MatchGridHeaderProps) {
    const isComplete = useGridStore(s => s.gridStatistics.isComplete);
    const setShowResultShareModal = useMatchStore(s => s.setShowResultShareModal);
    const { isSyncing, hasPendingChanges, syncNow } = useOffline();

    const handleAutoFill = useCallback(() => {
        const gridState = useGridStore.getState();
        const backlogState = useBacklogStore.getState();
        const emptySlots = gridState.gridItems
            .map((item, idx) => ({ item, idx }))
            .filter(({ item }) => !item.context.matched);

        // Gather all unused backlog items across all groups
        const unusedItems = backlogState.groups
            .flatMap(g => (g.items || []).filter(i => !i.used));

        const toFill = Math.min(emptySlots.length, unusedItems.length);
        for (let i = 0; i < toFill; i++) {
            gridState.assignItemToGrid(unusedItems[i], emptySlots[i].idx);
            backlogState.markItemAsUsed(unusedItems[i].id, true);
        }
    }, []);

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

            {/* Sync status icon - orange when pending, animated when syncing */}
            {(hasPendingChanges || isSyncing) && (
                <motion.button
                    onClick={() => syncNow()}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-2 rounded-control bg-slate-800/60 backdrop-blur-xs hover:bg-slate-700/60 transition-all duration-200 border border-slate-700/50 hover:border-slate-600/50"
                    aria-label={isSyncing ? 'Syncing changes...' : 'Unsaved changes — click to sync'}
                    title={isSyncing ? 'Syncing...' : 'Unsaved changes'}
                >
                    <motion.div
                        animate={isSyncing ? { rotate: 360 } : {}}
                        transition={isSyncing ? { duration: 1, repeat: Infinity, ease: 'linear' } : {}}
                    >
                        <RefreshCw className={`w-4 h-4 ${isSyncing ? 'text-blue-400' : 'text-amber-400'}`} />
                    </motion.div>
                </motion.button>
            )}

            {/* Dev-only: Auto-fill empty grid slots with backlog items */}
            {IS_DEV && !isComplete && (
                <button
                    onClick={handleAutoFill}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-control bg-violet-600/60 backdrop-blur-xs hover:bg-violet-500/60 text-violet-200 hover:text-white text-xs font-medium transition-all duration-200 border border-violet-500/40"
                    title="Auto-fill empty slots with backlog items (dev only)"
                    data-testid="auto-fill-btn"
                >
                    <Zap className="w-3.5 h-3.5" />
                    Auto-fill
                </button>
            )}

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
