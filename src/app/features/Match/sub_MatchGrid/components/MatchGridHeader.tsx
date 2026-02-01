"use client";

import { motion } from 'framer-motion';
import { Home } from 'lucide-react';
import Link from 'next/link';

interface MatchGridHeaderProps {
    title?: string;
}

export function MatchGridHeader({
    title = "Neon Arena",
}: MatchGridHeaderProps) {
    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="absolute top-4 left-4 z-10 flex items-center gap-3"
        >
            <Link
                href="/"
                className="p-2 rounded-lg bg-slate-800/60 backdrop-blur-sm hover:bg-slate-700/60 text-slate-400 hover:text-white transition-all duration-200 border border-slate-700/50 hover:border-slate-600/50
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
                aria-label="Back to Home"
            >
                <Home className="w-5 h-5" />
            </Link>
            <h2 className="text-xl font-bold text-white/90 tracking-tight drop-shadow-sm">
                {title}
            </h2>
        </motion.div>
    );
}
