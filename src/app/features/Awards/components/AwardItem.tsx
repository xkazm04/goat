"use client";

import { motion } from 'framer-motion';
import { Trophy } from 'lucide-react';
import { SimpleDropZone } from '../../Match/sub_MatchCollections/SimpleDropZone';
import { GridItemType } from '@/types/match';
import { TopList } from '@/types/top-lists';

interface AwardItemProps {
    list: TopList;
    gridItem: GridItemType | null;
    onRemove: () => void;
    getItemTitle: (item: any) => string;
}

export function AwardItem({ list, gridItem, onRemove, getItemTitle }: AwardItemProps) {
    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-6 p-4 bg-gray-900/40 border border-white/5 rounded-xl hover:bg-gray-900/60 hover:border-white/10 transition-all group"
        >
            {/* Left: Award Title */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                    <div className="p-2 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                        <Trophy className="w-5 h-5 text-yellow-500" />
                    </div>
                    <h3 className="text-xl font-bold text-white truncate">{list.title}</h3>
                </div>
                <p className="text-sm text-gray-400 pl-[3.25rem] truncate">
                    {list.description || `Select the winner for ${list.title}`}
                </p>
            </div>

            {/* Right: Drop Zone */}
            <div className="flex-shrink-0">
                <div className="w-24 h-24 relative">
                    <SimpleDropZone
                        position={0} // Always 0 as it's a single item list
                        isOccupied={!!(gridItem && gridItem.matched)}
                        occupiedBy={gridItem?.matched ? getItemTitle(gridItem) : undefined}
                        imageUrl={gridItem?.matched ? gridItem.image_url : undefined}
                        gridItem={gridItem?.matched ? gridItem : undefined}
                        onRemove={onRemove}
                    />
                </div>
            </div>
        </motion.div>
    );
}
