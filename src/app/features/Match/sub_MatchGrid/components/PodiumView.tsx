"use client";

import { motion } from 'framer-motion';

import { useAnimationPause } from '@/hooks/use-animation-pause';
import { DURATION } from '@/lib/animations/motion-presets';
import { STAGGER, ENTRANCE, ENTRANCE_DURATION } from '@/lib/animations/motion-tokens';
import { GridItemType } from '@/types/match';

import { PodiumSlot, podiumItem } from './PodiumSlot';

interface PodiumViewProps {
    gridItems: (GridItemType | null)[];
    onRemove: (position: number) => void;
    getItemTitle: (item: any) => string;
    onFillViaBracket?: (position: number) => void;
}

const podiumContainer = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: { staggerChildren: STAGGER.podium, delayChildren: STAGGER.podiumDelay },
    },
} as const;

// Re-export so any consumers referencing podiumItem from here still work
export { podiumItem };

export function PodiumView({ gridItems, onRemove, getItemTitle, onFillViaBracket }: PodiumViewProps) {
    const { ref, shouldAnimate } = useAnimationPause();

    const sharedProps = { onRemove, getItemTitle, onFillViaBracket, shouldAnimate };

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
                <PodiumSlot tier="silver" gridItem={gridItems[1]} {...sharedProps} />
                <PodiumSlot tier="gold"   gridItem={gridItems[0]} {...sharedProps} />
                <PodiumSlot tier="bronze" gridItem={gridItems[2]} {...sharedProps} />
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
