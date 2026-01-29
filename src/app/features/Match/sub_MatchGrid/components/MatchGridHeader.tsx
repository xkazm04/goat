"use client";

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Home, Settings } from 'lucide-react';
import Link from 'next/link';
import { ListSettingsModal } from '../../components/ListSettingsModal';

interface MatchGridHeaderProps {
    title?: string;
    listId?: string;
    listCategory?: string;
}

export function MatchGridHeader({
    title = "Neon Arena",
    listId,
    listCategory,
}: MatchGridHeaderProps) {
    const [showSettings, setShowSettings] = useState(false);

    return (
        <>
            <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="absolute top-4 left-4 z-10 flex items-center gap-3"
            >
                <Link
                    href="/"
                    className="p-2 rounded-lg bg-slate-800/50 hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors
                        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
                    aria-label="Back to Home"
                >
                    <Home className="w-5 h-5" />
                </Link>
                {listId && (
                    <button
                        onClick={() => setShowSettings(true)}
                        className="p-2 rounded-lg bg-slate-800/50 hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors
                            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
                        aria-label="List Settings"
                    >
                        <Settings className="w-5 h-5" />
                    </button>
                )}
                <h2 className="text-xl font-bold text-white/80 tracking-tight">
                    {title}
                </h2>
            </motion.div>

            {/* Settings Modal */}
            {listId && (
                <ListSettingsModal
                    isOpen={showSettings}
                    onClose={() => setShowSettings(false)}
                    listId={listId}
                    listCategory={listCategory}
                    listTitle={title}
                />
            )}
        </>
    );
}
