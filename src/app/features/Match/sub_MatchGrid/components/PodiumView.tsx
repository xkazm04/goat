"use client";

import { motion } from 'framer-motion';
import { Trophy, Medal, Award } from 'lucide-react';
import { SimpleDropZone } from '../../sub_MatchCollections/SimpleDropZone';
import { GridItemType } from '@/types/match';
import { Elevated } from '@/components/visual';

interface PodiumViewProps {
    gridItems: (GridItemType | null)[];
    onRemove: (position: number) => void;
    getItemTitle: (item: any) => string;
}

export function PodiumView({ gridItems, onRemove, getItemTitle }: PodiumViewProps) {
    return (
        <div className="mb-16 relative py-8">
            {/* Background glow effect */}
            <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/5 via-yellow-500/5 to-transparent blur-3xl -z-10" />

            {/* Spotlight effect for 1st place */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-gradient-to-b from-yellow-400/10 to-transparent blur-2xl -z-5" />

            {/* Podium Container */}
            <div className="flex justify-center items-end gap-0 pt-16">

                {/* 2nd Place */}
                <motion.div
                    className="relative flex flex-col items-center"
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15, type: "spring", stiffness: 100 }}
                >
                    {/* Medal icon */}
                    <motion.div
                        className="absolute -top-8 left-1/2 -translate-x-1/2 z-20"
                        initial={{ scale: 0, rotate: -20 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ delay: 0.4, type: "spring" }}
                    >
                        <Medal className="w-8 h-8 text-slate-300 drop-shadow-[0_0_10px_rgba(203,213,225,0.5)]" />
                    </motion.div>

                    {/* Drop zone */}
                    <div className="w-32 h-32 md:w-40 md:h-40 lg:w-44 lg:h-44 relative z-10">
                        <Elevated level="medium" hoverLift={false} className="w-full h-full rounded-xl">
                            <SimpleDropZone
                                position={1}
                                isOccupied={!!(gridItems[1] && gridItems[1].matched)}
                                occupiedBy={gridItems[1]?.matched ? getItemTitle(gridItems[1]) : undefined}
                                imageUrl={gridItems[1]?.matched ? gridItems[1].image_url : undefined}
                                gridItem={gridItems[1]?.matched ? gridItems[1] : undefined}
                                onRemove={() => onRemove(1)}
                                showBadge={false}
                            />
                        </Elevated>
                    </div>

                    {/* Podium block - 2nd place */}
                    <motion.div
                        className="relative w-40 md:w-48 lg:w-56"
                        initial={{ scaleY: 0 }}
                        animate={{ scaleY: 1 }}
                        transition={{ delay: 0.2, duration: 0.4, ease: "easeOut" }}
                        style={{ originY: 0 }}
                    >
                        {/* Top surface with shine */}
                        <div className="h-4 bg-gradient-to-b from-slate-400/40 to-slate-600/30 rounded-t-lg border-t border-x border-slate-400/30" />

                        {/* Main block body */}
                        <div className="h-24 bg-gradient-to-b from-slate-600/40 via-slate-700/50 to-slate-800/60 border-x border-slate-600/20 relative overflow-hidden">
                            {/* Vertical highlight lines */}
                            <div className="absolute left-2 top-0 bottom-0 w-px bg-gradient-to-b from-white/10 via-white/5 to-transparent" />
                            <div className="absolute right-2 top-0 bottom-0 w-px bg-gradient-to-b from-white/10 via-white/5 to-transparent" />

                            {/* Number */}
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-5xl font-black text-slate-400/50 drop-shadow-lg">2</span>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>

                {/* 1st Place - Center, tallest */}
                <motion.div
                    className="relative flex flex-col items-center z-20"
                    initial={{ opacity: 0, y: 60 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0, type: "spring", stiffness: 100 }}
                >
                    {/* Trophy with glow */}
                    <motion.div
                        className="absolute -top-14 left-1/2 -translate-x-1/2 z-20"
                        initial={{ scale: 0, y: 20 }}
                        animate={{ scale: 1, y: 0 }}
                        transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
                    >
                        <div className="relative">
                            <Trophy className="w-12 h-12 md:w-14 md:h-14 text-yellow-400 drop-shadow-[0_0_25px_rgba(250,204,21,0.8)]" />
                            {/* Trophy sparkle */}
                            <motion.div
                                className="absolute -top-1 -right-1 w-3 h-3"
                                animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
                                transition={{ duration: 2, repeat: Infinity }}
                            >
                                <div className="w-full h-full bg-yellow-300 rounded-full blur-sm" />
                            </motion.div>
                        </div>
                    </motion.div>

                    {/* Drop zone */}
                    <div className="w-40 h-40 md:w-48 md:h-48 lg:w-56 lg:h-56 relative z-10">
                        <Elevated level="medium" hoverLift={false} className="w-full h-full rounded-xl">
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
                    </div>

                    {/* Podium block - 1st place (tallest) */}
                    <motion.div
                        className="relative w-48 md:w-56 lg:w-64"
                        initial={{ scaleY: 0 }}
                        animate={{ scaleY: 1 }}
                        transition={{ delay: 0.1, duration: 0.5, ease: "easeOut" }}
                        style={{ originY: 0 }}
                    >
                        {/* Gold top surface with shine */}
                        <div className="h-5 bg-gradient-to-b from-yellow-300/50 to-yellow-500/40 rounded-t-lg border-t border-x border-yellow-400/40 shadow-[inset_0_2px_4px_rgba(255,255,255,0.2)]" />

                        {/* Main block body with gold tint */}
                        <div className="h-40 bg-gradient-to-b from-yellow-500/20 via-yellow-600/15 to-amber-900/30 border-x border-yellow-500/20 relative overflow-hidden">
                            {/* Vertical highlight lines */}
                            <div className="absolute left-3 top-0 bottom-0 w-px bg-gradient-to-b from-yellow-400/20 via-yellow-500/10 to-transparent" />
                            <div className="absolute right-3 top-0 bottom-0 w-px bg-gradient-to-b from-yellow-400/20 via-yellow-500/10 to-transparent" />

                            {/* Center glow */}
                            <div className="absolute inset-x-8 top-4 bottom-4 bg-gradient-to-b from-yellow-400/10 to-transparent rounded-full blur-xl" />

                            {/* Number */}
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-7xl font-black text-yellow-400/60 drop-shadow-[0_0_20px_rgba(250,204,21,0.3)]">1</span>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>

                {/* 3rd Place */}
                <motion.div
                    className="relative flex flex-col items-center"
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25, type: "spring", stiffness: 100 }}
                >
                    {/* Award icon */}
                    <motion.div
                        className="absolute -top-8 left-1/2 -translate-x-1/2 z-20"
                        initial={{ scale: 0, rotate: 20 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ delay: 0.45, type: "spring" }}
                    >
                        <Award className="w-7 h-7 text-orange-400 drop-shadow-[0_0_8px_rgba(251,146,60,0.5)]" />
                    </motion.div>

                    {/* Drop zone */}
                    <div className="w-28 h-28 md:w-36 md:h-36 lg:w-40 lg:h-40 relative z-10">
                        <Elevated level="medium" hoverLift={false} className="w-full h-full rounded-xl">
                            <SimpleDropZone
                                position={2}
                                isOccupied={!!(gridItems[2] && gridItems[2].matched)}
                                occupiedBy={gridItems[2]?.matched ? getItemTitle(gridItems[2]) : undefined}
                                imageUrl={gridItems[2]?.matched ? gridItems[2].image_url : undefined}
                                gridItem={gridItems[2]?.matched ? gridItems[2] : undefined}
                                onRemove={() => onRemove(2)}
                                showBadge={false}
                            />
                        </Elevated>
                    </div>

                    {/* Podium block - 3rd place (shortest) */}
                    <motion.div
                        className="relative w-36 md:w-44 lg:w-52"
                        initial={{ scaleY: 0 }}
                        animate={{ scaleY: 1 }}
                        transition={{ delay: 0.3, duration: 0.35, ease: "easeOut" }}
                        style={{ originY: 0 }}
                    >
                        {/* Bronze top surface */}
                        <div className="h-3 bg-gradient-to-b from-orange-400/30 to-orange-600/25 rounded-t-lg border-t border-x border-orange-500/25" />

                        {/* Main block body */}
                        <div className="h-16 bg-gradient-to-b from-orange-600/20 via-orange-800/25 to-orange-900/30 border-x border-orange-600/15 relative overflow-hidden">
                            {/* Vertical highlight lines */}
                            <div className="absolute left-2 top-0 bottom-0 w-px bg-gradient-to-b from-orange-400/15 via-orange-500/8 to-transparent" />
                            <div className="absolute right-2 top-0 bottom-0 w-px bg-gradient-to-b from-orange-400/15 via-orange-500/8 to-transparent" />

                            {/* Number */}
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-4xl font-black text-orange-500/40 drop-shadow-lg">3</span>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            </div>

            {/* Connected podium base / stage floor */}
            <motion.div
                className="relative mx-auto max-w-4xl mt-0"
                initial={{ opacity: 0, scaleX: 0.5 }}
                animate={{ opacity: 1, scaleX: 1 }}
                transition={{ delay: 0.4, duration: 0.4 }}
            >
                <div className="h-3 bg-gradient-to-r from-transparent via-slate-700/50 to-transparent rounded-b-lg" />
                <div className="h-1 bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent blur-sm" />
            </motion.div>
        </div>
    );
}
