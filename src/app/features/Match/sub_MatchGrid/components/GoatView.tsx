"use client";

import { motion } from 'framer-motion';
import { Crown, Sparkles } from 'lucide-react';
import { SimpleDropZone } from '../../sub_MatchCollections/SimpleDropZone';
import { GridItemType } from '@/types/match';
import { Elevated } from '@/components/visual';

interface GoatViewProps {
    gridItems: (GridItemType | null)[];
    onRemove: (position: number) => void;
    getItemTitle: (item: any) => string;
}

export function GoatView({ gridItems, onRemove, getItemTitle }: GoatViewProps) {
    return (
        <div className="mb-16 relative">
            {/* Radial glow effect */}
            <div className="absolute inset-0 bg-gradient-to-b from-yellow-500/10 via-transparent to-transparent blur-3xl -z-10" />

            {/* The GOAT - Centered and Massive */}
            <div className="flex flex-col items-center gap-6">
                {/* GOAT Badge */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-3 mb-4"
                >
                    <Crown className="w-8 h-8 text-yellow-400 drop-shadow-[0_0_20px_rgba(250,204,21,0.8)]" />
                    <h3 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-yellow-200 to-yellow-400 tracking-wider">
                        THE G.O.A.T
                    </h3>
                    <Crown className="w-8 h-8 text-yellow-400 drop-shadow-[0_0_20px_rgba(250,204,21,0.8)]" />
                </motion.div>

                {/* Floating sparkles */}
                <div className="absolute top-0 left-1/4 animate-pulse">
                    <Sparkles className="w-6 h-6 text-yellow-400/40" />
                </div>
                <div className="absolute top-10 right-1/4 animate-pulse delay-75">
                    <Sparkles className="w-4 h-4 text-yellow-400/30" />
                </div>

                {/* Main GOAT Display */}
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", bounce: 0.3, duration: 0.8 }}
                    className="relative w-96 h-96"
                >
                    {/* Golden ring */}
                    <div className="absolute -inset-4 rounded-full border-4 border-yellow-500/30 animate-pulse" />
                    <div className="absolute -inset-8 rounded-full border-2 border-yellow-500/10" />

                    <Elevated level="high" hoverLift={false} className="w-full h-full rounded-full">
                        <SimpleDropZone
                            position={0}
                            isOccupied={!!(gridItems[0] && gridItems[0].matched)}
                            occupiedBy={gridItems[0]?.matched ? getItemTitle(gridItems[0]) : undefined}
                            imageUrl={gridItems[0]?.matched ? gridItems[0].image_url : undefined}
                            gridItem={gridItems[0]?.matched ? gridItems[0] : undefined}
                            onRemove={() => onRemove(0)}
                            showBadge={false}
                        />
                    </Elevated>
                </motion.div>

                {/* Description */}
                <p className="text-yellow-500/60 text-sm font-mono uppercase tracking-widest">
                    Greatest Of All Time
                </p>
            </div>
        </div>
    );
}
