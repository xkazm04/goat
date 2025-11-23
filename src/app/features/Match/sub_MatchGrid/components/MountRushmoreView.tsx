"use client";

import { motion } from 'framer-motion';
import { Mountain } from 'lucide-react';
import { SimpleDropZone } from '../../sub_MatchCollections/SimpleDropZone';
import { GridItemType } from '@/types/match';

interface MountRushmoreViewProps {
    gridItems: (GridItemType | null)[];
    onRemove: (position: number) => void;
    getItemTitle: (item: any) => string;
}

export function MountRushmoreView({ gridItems, onRemove, getItemTitle }: MountRushmoreViewProps) {
    return (
        <div className="mb-16 relative">
            {/* Mountain silhouette effect */}
            <div className="absolute inset-0 bg-gradient-to-b from-slate-700/10 to-transparent blur-2xl -z-10" />

            <div className="flex flex-col items-center gap-8">
                {/* Mount Rushmore Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-3 mb-2"
                >
                    <Mountain className="w-7 h-7 text-slate-400" />
                    <h3 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-slate-300 via-slate-100 to-slate-300 tracking-wider">
                        MOUNT RUSHMORE
                    </h3>
                    <Mountain className="w-7 h-7 text-slate-400" />
                </motion.div>

                <p className="text-slate-500 text-xs font-mono uppercase tracking-widest mb-4">
                    The Four Legends Carved in Stone
                </p>

                {/* 4 Faces Side by Side */}
                <div className="grid grid-cols-4 gap-8 w-full max-w-6xl px-4">
                    {[0, 1, 2, 3].map((position, idx) => (
                        <motion.div
                            key={position}
                            initial={{ opacity: 0, y: 20, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={{ delay: idx * 0.1, type: "spring", bounce: 0.3 }}
                            className="relative aspect-square"
                        >
                            {/* Position label */}
                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 z-20">
                                <div className="px-3 py-1 bg-slate-800/80 rounded-full border border-slate-600/50 backdrop-blur-sm">
                                    <span className="text-xs font-bold text-slate-300">#{position + 1}</span>
                                </div>
                            </div>

                            {/* Stone frame effect */}
                            <div className="absolute -inset-2 bg-gradient-to-br from-slate-700/20 to-slate-900/20 rounded-xl blur-sm" />

                            <SimpleDropZone
                                position={position}
                                isOccupied={!!(gridItems[position] && gridItems[position].matched)}
                                occupiedBy={gridItems[position]?.matched ? getItemTitle(gridItems[position]) : undefined}
                                imageUrl={gridItems[position]?.matched ? gridItems[position].image_url : undefined}
                                gridItem={gridItems[position]?.matched ? gridItems[position] : undefined}
                                onRemove={() => onRemove(position)}
                            />
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    );
}
