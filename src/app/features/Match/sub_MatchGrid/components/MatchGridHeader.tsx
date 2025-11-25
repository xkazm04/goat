"use client";

import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

interface MatchGridHeaderProps {
    title?: string;
    subtitle?: string;
}

export function MatchGridHeader({
    title = "Neon Arena",
    subtitle = "Assemble Your Dream Team"
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
            </motion.div>
            <p className="text-cyan-500/60 font-mono text-sm tracking-widest uppercase">
                {subtitle}
            </p>
        </div>
    );
}
