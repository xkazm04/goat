"use client";

import { motion } from 'framer-motion';
import { Sparkles, HelpCircle } from 'lucide-react';

interface MatchGridHeaderProps {
    title?: string;
    subtitle?: string;
    onHelpClick?: () => void;
}

export function MatchGridHeader({
    title = "Neon Arena",
    subtitle = "Assemble Your Dream Team",
    onHelpClick,
}: MatchGridHeaderProps) {
    return (
        <div className="py-4">
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="inline-flex items-center gap-3 mb-2"
            >
                <Sparkles className="w-6 h-6 text-cyan-400" />
                <h2
                    className="text-3xl font-black text-white tracking-tight uppercase"
                    style={{ textShadow: '0 0 30px rgba(34, 211, 238, 0.3)' }}
                >
                    {title}
                </h2>
                <Sparkles className="w-6 h-6 text-cyan-400" />

                {/* Help button */}
                {onHelpClick && (
                    <motion.button
                        onClick={onHelpClick}
                        className="ml-2 p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10
                            text-white/50 hover:text-cyan-400 transition-colors"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        title="How to use"
                        data-testid="match-grid-help-button"
                    >
                        <HelpCircle className="w-4 h-4" />
                    </motion.button>
                )}
            </motion.div>
            <p className="text-cyan-500/60 font-mono text-sm tracking-widest uppercase">
                {subtitle}
            </p>
        </div>
    );
}
