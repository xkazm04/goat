"use client";

import { useCallback } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Medal, Award } from 'lucide-react';
import { SimpleDropZone } from '../../sub_DropZone/SimpleDropZone';
import { GridItemType } from '@/types/match';
import { Elevated } from '@/components/visual';
import { useGridStore } from '@/stores/grid-store';
import { triggerHaptic } from '../lib/hapticFeedback';
import { useAnimationPause } from '@/hooks/use-animation-pause';
import { DURATION } from '@/lib/animations/motion-presets';
import { STAGGER, ENTRANCE, ENTRANCE_DURATION, SPRING_CONFIG, GLOW_SHADOWS, CONNECTOR, CSS_TIMING } from '@/lib/animations/motion-tokens';

interface PodiumViewProps {
    gridItems: (GridItemType | null)[];
    onRemove: (position: number) => void;
    getItemTitle: (item: any) => string;
}

const clickToPlaceStyle = { boxShadow: 'var(--glow-brand-sm)', cursor: 'pointer' } as const;

function usePodiumClickToPlace(position: number) {
    const selectedItem = useGridStore((s) => s.mobileSelectedItem);
    const handleClick = useCallback(() => {
        if (selectedItem) {
            useGridStore.getState().handleMobileTapSlot(position);
            triggerHaptic('dropPositionRegular');
        }
    }, [position, selectedItem]);
    return { handleClick, highlightStyle: selectedItem ? clickToPlaceStyle : undefined };
}

const podiumContainer = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: { staggerChildren: STAGGER.podium, delayChildren: STAGGER.podiumDelay },
    },
} as const;

const podiumItem = {
    hidden: { opacity: 0, y: 50, scale: 0.85 },
    show: { opacity: 1, y: 0, scale: 1, transition: SPRING_CONFIG.podiumEntrance },
};

export function PodiumView({ gridItems, onRemove, getItemTitle }: PodiumViewProps) {
    const slot0 = usePodiumClickToPlace(0);
    const slot1 = usePodiumClickToPlace(1);
    const slot2 = usePodiumClickToPlace(2);
    const { ref, shouldAnimate } = useAnimationPause();

    return (
        <motion.div
            ref={ref}
            className="mb-16 relative py-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: DURATION.normal }}
        >
            {/* Background glow effect */}
            <motion.div
                className="absolute inset-0 bg-linear-to-b from-brand/5 via-yellow-500/5 to-transparent blur-3xl -z-10"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: ENTRANCE.ambient, duration: ENTRANCE_DURATION.ambient }}
            />

            {/* Spotlight effect for 1st place */}
            <motion.div
                className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-linear-to-b from-yellow-400/10 to-transparent blur-2xl -z-5"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: ENTRANCE.decoration, duration: ENTRANCE_DURATION.scenic }}
            />

            {/* Podium Container */}
            <motion.div
                className="flex justify-center items-end gap-0 pt-16"
                variants={podiumContainer}
                initial="hidden"
                animate="show"
            >

                {/* 2nd Place */}
                <motion.div
                    className="relative flex flex-col items-center"
                    variants={podiumItem}
                >
                    {/* Medal icon */}
                    <motion.div
                        className="absolute -top-8 left-1/2 -translate-x-1/2 z-20"
                        initial={{ scale: 0, rotate: -20 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ delay: ENTRANCE.decoration, ...SPRING_CONFIG.iconReveal }}
                    >
                        <Medal className={`w-8 h-8 text-slate-300 ${GLOW_SHADOWS.silver.dropShadow}`} />
                    </motion.div>

                    {/* Drop zone */}
                    <div className="w-32 h-32 md:w-40 md:h-40 lg:w-44 lg:h-44 relative z-10 rounded-card" style={slot1.highlightStyle} onClick={slot1.handleClick}>
                        <Elevated level="medium" hoverLift={false} className="w-full h-full rounded-card">
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
                        transition={{ delay: ENTRANCE.second, duration: ENTRANCE_DURATION.normal, ease: "easeOut" }}
                        style={{ originY: 0 }}
                    >
                        {/* Top surface with shine */}
                        <div className="h-4 bg-linear-to-b from-slate-400/70 to-slate-600/60 rounded-t-control border-t border-x border-slate-400/50" />

                        {/* Main block body */}
                        <div className="h-24 bg-linear-to-b from-slate-600/70 via-slate-700/80 to-slate-800/90 border-x border-slate-600/40 relative overflow-hidden">
                            {/* Vertical highlight lines */}
                            <div className="absolute left-2 top-0 bottom-0 w-px bg-linear-to-b from-white/10 via-white/5 to-transparent" />
                            <div className="absolute right-2 top-0 bottom-0 w-px bg-linear-to-b from-white/10 via-white/5 to-transparent" />

                            {/* Number */}
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-5xl font-black text-slate-400/80 drop-shadow-lg">2</span>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>

                {/* 1st Place - Center, tallest */}
                <motion.div
                    className="relative flex flex-col items-center z-20"
                    variants={podiumItem}
                >
                    {/* Trophy with glow */}
                    <motion.div
                        className="absolute -top-12 left-1/2 -translate-x-1/2 z-20"
                        initial={{ scale: 0, y: 20 }}
                        animate={{ scale: 1, y: 0 }}
                        transition={{ delay: ENTRANCE.hero, ...SPRING_CONFIG.champion }}
                    >
                        <div className="relative">
                            <Trophy className={`w-12 h-12 md:w-14 md:h-14 text-yellow-400 ${GLOW_SHADOWS.gold.dropShadow}`} />
                            {/* Trophy sparkle */}
                            <motion.div
                                className="absolute -top-1 -right-1 w-3 h-3"
                                animate={shouldAnimate ? { scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] } : { scale: 1, opacity: 0.5 }}
                                transition={{ duration: CONNECTOR.sparkleLoop, repeat: Infinity }}
                            >
                                <div className="w-full h-full bg-yellow-300 rounded-full blur-xs" />
                            </motion.div>
                        </div>
                    </motion.div>

                    {/* Drop zone */}
                    <div className="w-40 h-40 md:w-48 md:h-48 lg:w-56 lg:h-56 relative z-10 rounded-card" style={slot0.highlightStyle} onClick={slot0.handleClick}>
                        <Elevated level="medium" hoverLift={false} className="w-full h-full rounded-card">
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
                        transition={{ delay: ENTRANCE.first, duration: ENTRANCE_DURATION.slow, ease: "easeOut" }}
                        style={{ originY: 0 }}
                    >
                        {/* Gold top surface with shine */}
                        <div className="h-5 bg-linear-to-b from-yellow-300/70 to-yellow-500/60 rounded-t-control border-t border-x border-yellow-400/60 shadow-[inset_0_2px_4px_rgba(255,255,255,0.2)]" />

                        {/* Main block body with gold tint */}
                        <div className="h-40 bg-linear-to-b from-yellow-500/40 via-yellow-600/35 to-amber-900/50 border-x border-yellow-500/40 relative overflow-hidden">
                            {/* Vertical highlight lines */}
                            <div className="absolute left-3 top-0 bottom-0 w-px bg-linear-to-b from-yellow-400/40 via-yellow-500/20 to-transparent" />
                            <div className="absolute right-3 top-0 bottom-0 w-px bg-linear-to-b from-yellow-400/40 via-yellow-500/20 to-transparent" />

                            {/* Center glow */}
                            <div className="absolute inset-x-8 top-4 bottom-4 bg-linear-to-b from-yellow-400/20 to-transparent rounded-full blur-xl" />

                            {/* Number */}
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className={`text-7xl font-black text-yellow-400/80 ${GLOW_SHADOWS.gold.textGlow}`}>1</span>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>

                {/* 3rd Place */}
                <motion.div
                    className="relative flex flex-col items-center"
                    variants={podiumItem}
                >
                    {/* Award icon */}
                    <motion.div
                        className="absolute -top-6 left-1/2 -translate-x-1/2 z-20"
                        initial={{ scale: 0, rotate: 20 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ delay: ENTRANCE.decorationAlt, ...SPRING_CONFIG.iconReveal }}
                    >
                        <Award className={`w-7 h-7 text-orange-400 ${GLOW_SHADOWS.bronze.dropShadow}`} />
                    </motion.div>

                    {/* Drop zone */}
                    <div className="w-28 h-28 md:w-36 md:h-36 lg:w-40 lg:h-40 relative z-10 rounded-card" style={slot2.highlightStyle} onClick={slot2.handleClick}>
                        <Elevated level="medium" hoverLift={false} className="w-full h-full rounded-card">
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
                        transition={{ delay: ENTRANCE.third, duration: ENTRANCE_DURATION.normal, ease: "easeOut" }}
                        style={{ originY: 0 }}
                    >
                        {/* Bronze top surface */}
                        <div className="h-3 bg-linear-to-b from-orange-400/50 to-orange-600/45 rounded-t-control border-t border-x border-orange-500/45" />

                        {/* Main block body */}
                        <div className="h-16 bg-linear-to-b from-orange-600/40 via-orange-800/45 to-orange-900/50 border-x border-orange-600/35 relative overflow-hidden">
                            {/* Vertical highlight lines */}
                            <div className="absolute left-2 top-0 bottom-0 w-px bg-linear-to-b from-orange-400/15 via-orange-500/8 to-transparent" />
                            <div className="absolute right-2 top-0 bottom-0 w-px bg-linear-to-b from-orange-400/15 via-orange-500/8 to-transparent" />

                            {/* Number */}
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-4xl font-black text-orange-500/70 drop-shadow-lg">3</span>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            </motion.div>

            {/* Connected podium base / stage floor */}
            <motion.div
                className="relative mx-auto max-w-4xl mt-0"
                initial={{ opacity: 0, scaleX: 0.5 }}
                animate={{ opacity: 1, scaleX: 1 }}
                transition={{ delay: ENTRANCE.ambient, duration: ENTRANCE_DURATION.normal }}
            >
                <div className="h-3 bg-linear-to-r from-transparent via-slate-700/50 to-transparent rounded-b-control" />
                <div className="h-1 bg-linear-to-r from-transparent via-brand/20 to-transparent blur-xs" />
            </motion.div>
        </motion.div>
    );
}
