"use client";

import { motion } from 'framer-motion';

import { Elevated } from '@/components/visual';
import { useAnimationPause } from '@/hooks/use-animation-pause';
import { DURATION } from '@/lib/animations/motion-presets';
import { GridItemType } from '@/types/match';

import { SimpleDropZone } from '../../sub_DropZone/SimpleDropZone';

interface GoatViewProps {
    gridItems: (GridItemType | null)[];
    onRemove: (position: number) => void;
    getItemTitle: (item: any) => string;
    onFillViaBracket?: (position: number) => void;
}

/* ── Inline SVG icons for authentic GOAT visuals ── */

function GoatCrown({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 48 48" fill="none" className={className}>
            {/* Crown base */}
            <path d="M8 36h32v4H8z" fill="currentColor" opacity={0.9} />
            {/* Crown body with 5 points */}
            <path
                d="M8 36L4 18l10 8 10-14 10 14 10-8-4 18H8z"
                fill="currentColor"
                opacity={0.85}
            />
            {/* Jewel highlights */}
            <circle cx="24" cy="28" r="3" fill="currentColor" opacity={0.4} />
            <circle cx="15" cy="30" r="2" fill="currentColor" opacity={0.3} />
            <circle cx="33" cy="30" r="2" fill="currentColor" opacity={0.3} />
            {/* Top point gems */}
            <circle cx="4" cy="18" r="2.5" fill="currentColor" opacity={0.6} />
            <circle cx="14" cy="26" r="2" fill="currentColor" opacity={0.5} />
            <circle cx="24" cy="12" r="3" fill="currentColor" opacity={0.7} />
            <circle cx="34" cy="26" r="2" fill="currentColor" opacity={0.5} />
            <circle cx="44" cy="18" r="2.5" fill="currentColor" opacity={0.6} />
        </svg>
    );
}

function GoatStarburst({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 32 32" fill="none" className={className}>
            {/* 4-point starburst */}
            <path
                d="M16 2l2.5 10.5L28 16l-9.5 3.5L16 30l-2.5-10.5L4 16l9.5-3.5z"
                fill="currentColor"
                opacity={0.9}
            />
            {/* Diagonal rays */}
            <path
                d="M16 6l1.5 7.5L24 16l-6.5 2.5L16 26l-1.5-7.5L8 16l6.5-2.5z"
                fill="currentColor"
                opacity={0.4}
            />
        </svg>
    );
}

export function GoatView({ gridItems, onRemove, getItemTitle, onFillViaBracket }: GoatViewProps) {
    const isFirstPositionAssigned = gridItems[0]?.context.matched;
    const { ref, shouldAnimate } = useAnimationPause();

    return (
        <div ref={ref} className="mb-8 relative">
            {/* Goat Illustration - left side */}
            <motion.div
                initial={{ opacity: 0.4, filter: 'grayscale(0.8) brightness(0.6)' }}
                animate={{
                    opacity: isFirstPositionAssigned ? 1 : 0.4,
                    filter: isFirstPositionAssigned
                        ? 'grayscale(0) brightness(1)'
                        : 'grayscale(0.8) brightness(0.6)',
                }}
                transition={{ opacity: { duration: DURATION.normal } }}
                className="absolute left-0 top-0 bottom-0 w-1/4 flex items-center justify-center pointer-events-none z-0"
            >
                <div className="relative">
                    <div className="text-[140px] leading-none filter drop-shadow-[0_0_40px_rgba(250,204,21,0.4)]">
                        🐐
                    </div>
                    <motion.div
                        animate={shouldAnimate ? { y: [0, -8, 0] } : { y: 0 }}
                        transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                        className="absolute -top-6 left-1/2 -translate-x-1/2"
                    >
                        <GoatCrown className="w-14 h-14 text-yellow-400 drop-shadow-[0_0_20px_rgba(250,204,21,0.8)]" />
                    </motion.div>
                    <motion.div
                        animate={shouldAnimate ? { scale: [1, 1.3, 1], opacity: [0.4, 1, 0.4] } : { scale: 1, opacity: 0.4 }}
                        transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                        className="absolute top-2 -right-3"
                    >
                        <GoatStarburst className="w-7 h-7 text-yellow-400" />
                    </motion.div>
                    <motion.div
                        animate={shouldAnimate ? { scale: [1, 1.2, 1], opacity: [0.3, 0.7, 0.3] } : { scale: 1, opacity: 0.3 }}
                        transition={{ repeat: Infinity, duration: 2, ease: "easeInOut", delay: 0.5 }}
                        className="absolute bottom-6 -left-3"
                    >
                        <GoatStarburst className="w-5 h-5 text-yellow-300" />
                    </motion.div>
                </div>
            </motion.div>

            {/* Radial glow */}
            <div className="absolute inset-0 bg-linear-to-b from-yellow-500/15 via-yellow-400/5 to-transparent blur-3xl -z-10" />

            {/* Main layout: GOAT title + 1st place + 2nd/3rd row */}
            <div className="flex flex-col items-center gap-4">
                {/* GOAT Badge */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-3"
                >
                    <GoatCrown className="w-8 h-8 text-yellow-400 drop-shadow-[0_0_20px_rgba(250,204,21,0.8)]" />
                    <h3 className="text-3xl font-black text-transparent bg-clip-text bg-linear-to-r from-yellow-400 via-yellow-200 to-yellow-400 tracking-wider">
                        THE G.O.A.T
                    </h3>
                    <GoatCrown className="w-8 h-8 text-yellow-400 drop-shadow-[0_0_20px_rgba(250,204,21,0.8)]" />
                </motion.div>

                {/* Floating starbursts */}
                <div className={`absolute top-0 left-1/4 ${shouldAnimate ? 'animate-pulse' : ''}`}>
                    <GoatStarburst className="w-5 h-5 text-yellow-400/40" />
                </div>
                <div className={`absolute top-8 right-1/4 ${shouldAnimate ? 'animate-pulse delay-75' : ''}`}>
                    <GoatStarburst className="w-4 h-4 text-yellow-400/30" />
                </div>

                {/* 1st Place — large centered card */}
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", bounce: 0.3, duration: DURATION.dramatic }}
                    className="relative w-72 h-[22rem] md:w-80 md:h-[25rem] lg:w-96 lg:h-[30rem]"
                >
                    <div className={`absolute -inset-3 rounded-container border-2 border-yellow-500/40 ${shouldAnimate ? 'animate-pulse' : ''}`} />
                    <div className="absolute -inset-6 rounded-container border border-yellow-500/20" />

                    <Elevated level="high" hoverLift={false} className="w-full h-full rounded-container">
                        <SimpleDropZone
                            position={0}
                            isOccupied={!!(gridItems[0] && gridItems[0].context.matched)}
                            occupiedBy={gridItems[0]?.context.matched ? getItemTitle(gridItems[0]) : undefined}
                            imageUrl={gridItems[0]?.context.matched ? gridItems[0].item?.image_url : undefined}
                            gridItem={gridItems[0]?.context.matched ? gridItems[0] : undefined}
                            onRemove={() => onRemove(0)}
                            showBadge={false}
                            onFillViaBracket={onFillViaBracket ? () => onFillViaBracket(0) : undefined}
                        />
                    </Elevated>
                </motion.div>

                <p className="text-yellow-500/70 text-sm font-mono uppercase tracking-widest">
                    Greatest Of All Time
                </p>

                {/* 2nd & 3rd Place — row below */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4, type: "spring", stiffness: 100, damping: 14 }}
                    className="flex items-start justify-center gap-6 mt-2"
                >
                    {/* 2nd Place */}
                    <div className="flex flex-col items-center gap-2">
                        <div className="flex items-center gap-1.5">
                            <span className="text-lg font-black text-slate-300/80">#2</span>
                            <span className="text-xs text-slate-500 uppercase tracking-wide font-mono">Silver</span>
                        </div>
                        <div className="w-32 h-40 md:w-36 md:h-44 lg:w-40 lg:h-48 relative">
                            <div className="absolute -inset-1.5 rounded-card border border-slate-400/30" />
                            <Elevated level="medium" hoverLift={false} className="w-full h-full rounded-card">
                                <SimpleDropZone
                                    position={1}
                                    isOccupied={!!(gridItems[1] && gridItems[1].context.matched)}
                                    occupiedBy={gridItems[1]?.context.matched ? getItemTitle(gridItems[1]) : undefined}
                                    imageUrl={gridItems[1]?.context.matched ? gridItems[1].item?.image_url : undefined}
                                    gridItem={gridItems[1]?.context.matched ? gridItems[1] : undefined}
                                    onRemove={() => onRemove(1)}
                                    showBadge={false}
                                    onFillViaBracket={onFillViaBracket ? () => onFillViaBracket(1) : undefined}
                                />
                            </Elevated>
                        </div>
                    </div>

                    {/* 3rd Place */}
                    <div className="flex flex-col items-center gap-2">
                        <div className="flex items-center gap-1.5">
                            <span className="text-lg font-black text-orange-400/80">#3</span>
                            <span className="text-xs text-slate-500 uppercase tracking-wide font-mono">Bronze</span>
                        </div>
                        <div className="w-32 h-40 md:w-36 md:h-44 lg:w-40 lg:h-48 relative">
                            <div className="absolute -inset-1.5 rounded-card border border-orange-500/25" />
                            <Elevated level="medium" hoverLift={false} className="w-full h-full rounded-card">
                                <SimpleDropZone
                                    position={2}
                                    isOccupied={!!(gridItems[2] && gridItems[2].context.matched)}
                                    occupiedBy={gridItems[2]?.context.matched ? getItemTitle(gridItems[2]) : undefined}
                                    imageUrl={gridItems[2]?.context.matched ? gridItems[2].item?.image_url : undefined}
                                    gridItem={gridItems[2]?.context.matched ? gridItems[2] : undefined}
                                    onRemove={() => onRemove(2)}
                                    showBadge={false}
                                    onFillViaBracket={onFillViaBracket ? () => onFillViaBracket(2) : undefined}
                                />
                            </Elevated>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
