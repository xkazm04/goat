"use client";

import { motion } from 'framer-motion';
import { Mountain } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

import { Elevated } from '@/components/visual';
import { DURATION } from '@/lib/animations/motion-presets';
import { cn } from '@/lib/utils';
import { GridItemType } from '@/types/match';

import { PositionBadge } from '../../components/PositionBadge';
import { SimpleDropZone } from '../../sub_DropZone/SimpleDropZone';





interface MountRushmoreViewProps {
    gridItems: (GridItemType | null)[];
    onRemove: (position: number) => void;
    getItemTitle: (item: any) => string;
    onFillViaBracket?: (position: number) => void;
}

const rushmoreContainer = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: { staggerChildren: 0.12, delayChildren: 0.2 },
    },
} as const;

const rushmoreCard = {
    hidden: { opacity: 0, y: 30, scale: 0.85, rotateX: 15 },
    show: {
        opacity: 1, y: 0, scale: 1, rotateX: 0,
        transition: { type: "spring" as const, stiffness: 90, damping: 14 },
    },
};

/** Tracks newly placed items to trigger the chiseling reveal animation */
function useChiselingReveal(gridItems: (GridItemType | null)[]) {
    const prevMatchedRef = useRef<Set<number>>(new Set());
    const [chiselingSlots, setChiselingSlots] = useState<Set<number>>(new Set());

    useEffect(() => {
        const currentMatched = new Set<number>();
        const newlyPlaced = new Set<number>();

        for (let i = 0; i < 4; i++) {
            if (gridItems[i]?.context.matched) {
                currentMatched.add(i);
                if (!prevMatchedRef.current.has(i)) {
                    newlyPlaced.add(i);
                }
            }
        }

        if (newlyPlaced.size > 0) {
            setChiselingSlots(prev => {
                const merged = new Set(Array.from(prev));
                newlyPlaced.forEach(s => merged.add(s));
                return merged;
            });
            const timer = setTimeout(() => {
                setChiselingSlots(prev => {
                    const next = new Set(Array.from(prev));
                    newlyPlaced.forEach(s => next.delete(s));
                    return next;
                });
            }, 600);
            prevMatchedRef.current = currentMatched;
            return () => clearTimeout(timer);
        }

        prevMatchedRef.current = currentMatched;
    }, [gridItems]);

    return chiselingSlots;
}

export function MountRushmoreView({ gridItems, onRemove, getItemTitle, onFillViaBracket }: MountRushmoreViewProps) {
    const chiselingSlots = useChiselingReveal(gridItems);

    return (
        <motion.div
            className="mb-16 relative"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: DURATION.normal }}
        >
            {/* Mountain silhouette effect */}
            <motion.div
                className="absolute inset-0 bg-linear-to-b from-slate-700/10 to-transparent blur-2xl -z-10"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: DURATION.slow, duration: DURATION.emphasis }}
            />

            <div className="flex flex-col items-center gap-8">
                {/* Mount Rushmore Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ type: "spring", stiffness: 100, damping: 15 }}
                    className="flex items-center gap-3 mb-2"
                >
                    <Mountain className="w-7 h-7 text-slate-400 drop-shadow-[0_0_8px_rgba(100,116,139,0.5)]" />
                    <h3 className="text-3xl font-black text-transparent bg-clip-text bg-linear-to-r from-slate-300 via-slate-100 to-slate-300 tracking-wider">
                        MOUNT RUSHMORE
                    </h3>
                    <Mountain className="w-7 h-7 text-slate-400 drop-shadow-[0_0_8px_rgba(100,116,139,0.5)]" />
                </motion.div>

                <motion.p
                    className="text-slate-500 text-2xs font-mono uppercase tracking-widest mb-4"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15, duration: DURATION.normal }}
                >
                    The Four Legends Carved in Stone
                </motion.p>

                {/* 4 Faces Side by Side */}
                <motion.div
                    className="grid grid-cols-4 gap-8 w-full max-w-6xl px-4 auto-rows-[1fr]"
                    variants={rushmoreContainer}
                    initial="hidden"
                    animate="show"
                    style={{ perspective: 800 }}
                >
                    {[0, 1, 2, 3].map((position) => {
                        const isOccupied = !!(gridItems[position] && gridItems[position].context.matched);
                        const isChiseling = chiselingSlots.has(position);

                        return (
                            <motion.div
                                key={position}
                                variants={rushmoreCard}
                                className={cn(
                                    "relative aspect-[3/5]",
                                    position === 0 && "z-10"
                                )}
                                style={position === 0 ? {
                                    boxShadow: '0 0 20px rgba(100, 116, 139, 0.4)'
                                } : undefined}
                            >
                                {/* Position label - Tier-based visual hierarchy */}
                                <div className="absolute -top-8 left-1/2 -translate-x-1/2 z-20">
                                    <PositionBadge position={position} />
                                </div>

                                {/* Stone frame - outer glow */}
                                <div className="absolute -inset-2 bg-linear-to-br from-slate-600/40 to-slate-900/50 rounded-card blur-xs" />
                                {/* Stone frame - inner carved effect */}
                                <div className="absolute inset-0 rounded-card shadow-[inset_0_2px_4px_rgba(0,0,0,0.3),inset_0_-2px_4px_rgba(255,255,255,0.05)]" />

                                <Elevated level="medium" hoverLift={false} className="w-full h-full rounded-card">
                                    <div
                                        className="rushmore-slot relative w-full h-full overflow-hidden rounded-card"
                                        style={{
                                            // Stone-carved filter: desaturate slightly, boost contrast, warm sepia tint
                                            filter: isOccupied
                                                ? isChiseling
                                                    ? 'grayscale(1) contrast(1.2) sepia(0.3)' // full stone during chisel-in
                                                    : 'grayscale(0.3) contrast(1.1) sepia(0.2)' // final carved look
                                                : undefined,
                                            transition: 'filter 600ms ease-out',
                                        }}
                                    >
                                        <SimpleDropZone
                                            position={position}
                                            isOccupied={isOccupied}
                                            occupiedBy={gridItems[position]?.context.matched ? getItemTitle(gridItems[position]) : undefined}
                                            imageUrl={gridItems[position]?.context.matched ? gridItems[position].item?.image_url : undefined}
                                            gridItem={gridItems[position]?.context.matched ? gridItems[position] : undefined}
                                            onRemove={() => onRemove(position)}
                                            showBadge={false}
                                            onFillViaBracket={onFillViaBracket ? () => onFillViaBracket(position) : undefined}
                                        />

                                        {/* Stone texture overlay - only on occupied slots */}
                                        {isOccupied && (
                                            <div
                                                className="pointer-events-none absolute inset-0 rounded-card z-10"
                                                style={{
                                                    background: `
                                                        repeating-conic-gradient(
                                                            rgba(120, 113, 100, 0.06) 0% 25%,
                                                            transparent 0% 50%
                                                        ) 0 0 / 4px 4px,
                                                        linear-gradient(
                                                            135deg,
                                                            rgba(160, 150, 130, 0.12) 0%,
                                                            transparent 40%,
                                                            rgba(80, 75, 65, 0.1) 60%,
                                                            transparent 100%
                                                        )
                                                    `,
                                                    mixBlendMode: 'overlay',
                                                    opacity: isChiseling ? 0 : 1,
                                                    transition: 'opacity 600ms ease-out',
                                                }}
                                            />
                                        )}
                                    </div>
                                </Elevated>
                            </motion.div>
                        );
                    })}
                </motion.div>
            </div>
        </motion.div>
    );
}
