"use client";

import { motion } from 'framer-motion';
import { Trophy } from 'lucide-react';
import { SimpleDropZone } from '../../sub_MatchCollections/SimpleDropZone';
import { GridItemType } from '@/types/match';

interface PodiumViewProps {
    gridItems: (GridItemType | null)[];
    onRemove: (position: number) => void;
    getItemTitle: (item: any) => string;
}

export function PodiumView({ gridItems, onRemove, getItemTitle }: PodiumViewProps) {
    return (
        <div className="mb-16 relative">
            <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/5 to-transparent blur-3xl -z-10" />

            <div className="flex justify-center items-end gap-8">
                {/* 2nd Place */}
                <div className="relative -mb-4 scale-110">
                    <SimpleDropZone
                        position={1}
                        isOccupied={!!(gridItems[1] && gridItems[1].matched)}
                        occupiedBy={gridItems[1]?.matched ? getItemTitle(gridItems[1]) : undefined}
                        imageUrl={gridItems[1]?.matched ? gridItems[1].image_url : undefined}
                        gridItem={gridItems[1]?.matched ? gridItems[1] : undefined}
                        onRemove={() => onRemove(1)}
                    />
                    <div className="h-16 bg-gradient-to-b from-slate-800/50 to-transparent mt-2 rounded-t-lg mx-4 backdrop-blur-sm border-x border-t border-white/5" />
                </div>

                {/* 1st Place */}
                <div className="relative z-10 scale-150 origin-bottom mx-4">
                    <div className="absolute -top-16 left-1/2 -translate-x-1/2">
                        <Trophy className="w-12 h-12 text-yellow-400 drop-shadow-[0_0_20px_rgba(250,204,21,0.6)]" />
                    </div>
                    <SimpleDropZone
                        position={0}
                        isOccupied={!!(gridItems[0] && gridItems[0].matched)}
                        occupiedBy={gridItems[0]?.matched ? getItemTitle(gridItems[0]) : undefined}
                        imageUrl={gridItems[0]?.matched ? gridItems[0].image_url : undefined}
                        gridItem={gridItems[0]?.matched ? gridItems[0] : undefined}
                        onRemove={() => onRemove(0)}
                    />
                    <div className="h-28 bg-gradient-to-b from-yellow-500/15 to-transparent mt-2 rounded-t-lg mx-2 backdrop-blur-sm border-x border-t border-yellow-500/30" />
                </div>

                {/* 3rd Place */}
                <div className="relative -mb-8 scale-105">
                    <SimpleDropZone
                        position={2}
                        isOccupied={!!(gridItems[2] && gridItems[2].matched)}
                        occupiedBy={gridItems[2]?.matched ? getItemTitle(gridItems[2]) : undefined}
                        imageUrl={gridItems[2]?.matched ? gridItems[2].image_url : undefined}
                        gridItem={gridItems[2]?.matched ? gridItems[2] : undefined}
                        onRemove={() => onRemove(2)}
                    />
                    <div className="h-12 bg-gradient-to-b from-orange-900/30 to-transparent mt-2 rounded-t-lg mx-4 backdrop-blur-sm border-x border-t border-white/5" />
                </div>
            </div>
        </div>
    );
}
