"use client";

import { motion } from 'framer-motion';
import { Trophy, Medal, Award } from 'lucide-react';
import { useCallback, type ReactNode } from 'react';

import { Elevated } from '@/components/visual';
import { ENTRANCE, ENTRANCE_DURATION, SPRING_CONFIG, GLOW_SHADOWS, CONNECTOR } from '@/lib/animations/motion-tokens';
import { useGridStore } from '@/stores/grid-store';
import { GridItemType } from '@/types/match';

import { SimpleDropZone } from '../../sub_DropZone/SimpleDropZone';
import { triggerHaptic } from '../lib/hapticFeedback';

// ---------------------------------------------------------------------------
// Tier configuration — all per-tier visual differences live here
// ---------------------------------------------------------------------------

type PodiumTier = 'gold' | 'silver' | 'bronze';

interface TierConfig {
    position: number;
    label: number;
    /** Outer motion.div extra classes (e.g. z-index) */
    containerClass: string;
    /** Icon element */
    icon: ReactNode;
    /** Icon wrapper positioning */
    iconWrapperClass: string;
    /** Icon entrance animation */
    iconInitial: Record<string, number>;
    iconAnimate: Record<string, number>;
    iconTransition: { delay: number; [k: string]: unknown };
    /** Whether to render the sparkle effect (gold only) */
    sparkle: boolean;
    /** Drop zone outer size classes */
    dropZoneSize: string;
    /** Podium block width classes */
    blockWidth: string;
    /** Podium block entrance delay & shadow */
    blockDelay: number;
    blockDuration: number;
    blockShadow: string;
    /** Top surface styling */
    topSurfaceClass: string;
    topSurfaceHeight: string;
    /** Main body styling */
    bodyHeight: string;
    bodyClass: string;
    /** Vertical highlight line inset */
    highlightInset: string;
    highlightClass: string;
    /** Center glow (gold only) */
    centerGlow: boolean;
    /** Number styling */
    numberClass: string;
    /** Title text styling */
    titleClass: string;
    titleMaxWidth: string;
}

const TIER_CONFIGS: Record<PodiumTier, TierConfig> = {
    gold: {
        position: 0,
        label: 1,
        containerClass: 'relative flex flex-col items-center z-20',
        icon: <Trophy className={`w-12 h-12 md:w-14 md:h-14 text-yellow-400 ${GLOW_SHADOWS.gold.dropShadow}`} />,
        iconWrapperClass: 'absolute -top-12 left-1/2 -translate-x-1/2 z-20',
        iconInitial: { scale: 0, y: 20 },
        iconAnimate: { scale: 1, y: 0 },
        iconTransition: { delay: ENTRANCE.hero, ...SPRING_CONFIG.champion },
        sparkle: true,
        dropZoneSize: 'w-40 h-40 md:w-48 md:h-48 lg:w-56 lg:h-56',
        blockWidth: 'relative w-48 md:w-56 lg:w-64',
        blockDelay: ENTRANCE.third,
        blockDuration: ENTRANCE_DURATION.slow,
        blockShadow: '0 12px 32px rgba(0,0,0,0.5)',
        topSurfaceHeight: 'h-5',
        topSurfaceClass: 'bg-linear-to-b from-yellow-300/70 to-yellow-500/60 rounded-t-control border-t border-x border-yellow-400/60 shadow-[inset_0_2px_4px_rgba(255,255,255,0.2)]',
        bodyHeight: 'h-40',
        bodyClass: 'bg-linear-to-b from-yellow-500/40 via-yellow-600/35 to-amber-900/50 border-x border-yellow-500/40 relative overflow-hidden',
        highlightInset: 'left-3',
        highlightClass: 'bg-linear-to-b from-yellow-400/40 via-yellow-500/20 to-transparent',
        centerGlow: true,
        numberClass: `text-7xl font-black text-yellow-400/80 ${GLOW_SHADOWS.gold.textGlow}`,
        titleClass: 'mt-2 text-sm font-bold text-yellow-200/90 text-center leading-tight line-clamp-2',
        titleMaxWidth: 'max-w-[14rem]',
    },
    silver: {
        position: 1,
        label: 2,
        containerClass: 'relative flex flex-col items-center',
        icon: <Medal className={`w-8 h-8 text-slate-300 ${GLOW_SHADOWS.silver.dropShadow}`} />,
        iconWrapperClass: 'absolute -top-8 left-1/2 -translate-x-1/2 z-20',
        iconInitial: { scale: 0, rotate: -20 },
        iconAnimate: { scale: 1, rotate: 0 },
        iconTransition: { delay: ENTRANCE.decoration, ...SPRING_CONFIG.iconReveal },
        sparkle: false,
        dropZoneSize: 'w-32 h-32 md:w-40 md:h-40 lg:w-44 lg:h-44',
        blockWidth: 'relative w-40 md:w-48 lg:w-56',
        blockDelay: ENTRANCE.second,
        blockDuration: ENTRANCE_DURATION.normal,
        blockShadow: '0 8px 24px rgba(0,0,0,0.4)',
        topSurfaceHeight: 'h-4',
        topSurfaceClass: 'bg-linear-to-b from-slate-400/70 to-slate-600/60 rounded-t-control border-t border-x border-slate-400/50',
        bodyHeight: 'h-24',
        bodyClass: 'bg-linear-to-b from-slate-600/70 via-slate-700/80 to-slate-800/90 border-x border-slate-600/40 relative overflow-hidden',
        highlightInset: 'left-2',
        highlightClass: 'bg-linear-to-b from-white/10 via-white/5 to-transparent',
        centerGlow: false,
        numberClass: 'text-5xl font-black text-slate-400/80 drop-shadow-lg',
        titleClass: 'mt-2 text-xs font-medium text-white/90 text-center leading-tight line-clamp-2',
        titleMaxWidth: 'max-w-[10rem]',
    },
    bronze: {
        position: 2,
        label: 3,
        containerClass: 'relative flex flex-col items-center',
        icon: <Award className={`w-7 h-7 text-orange-400 ${GLOW_SHADOWS.bronze.dropShadow}`} />,
        iconWrapperClass: 'absolute -top-6 left-1/2 -translate-x-1/2 z-20',
        iconInitial: { scale: 0, rotate: 20 },
        iconAnimate: { scale: 1, rotate: 0 },
        iconTransition: { delay: ENTRANCE.decorationAlt, ...SPRING_CONFIG.iconReveal },
        sparkle: false,
        dropZoneSize: 'w-28 h-28 md:w-36 md:h-36 lg:w-40 lg:h-40',
        blockWidth: 'relative w-36 md:w-44 lg:w-52',
        blockDelay: ENTRANCE.first,
        blockDuration: ENTRANCE_DURATION.normal,
        blockShadow: '0 6px 18px rgba(0,0,0,0.35)',
        topSurfaceHeight: 'h-3',
        topSurfaceClass: 'bg-linear-to-b from-orange-400/50 to-orange-600/45 rounded-t-control border-t border-x border-orange-500/45',
        bodyHeight: 'h-16',
        bodyClass: 'bg-linear-to-b from-orange-600/40 via-orange-800/45 to-orange-900/50 border-x border-orange-600/35 relative overflow-hidden',
        highlightInset: 'left-2',
        highlightClass: 'bg-linear-to-b from-orange-400/15 via-orange-500/8 to-transparent',
        centerGlow: false,
        numberClass: 'text-4xl font-black text-orange-500/70 drop-shadow-lg',
        titleClass: 'mt-2 text-xs font-medium text-white/90 text-center leading-tight line-clamp-2',
        titleMaxWidth: 'max-w-[9rem]',
    },
};

// ---------------------------------------------------------------------------
// Click-to-place hook
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Podium slot variants (shared with parent)
// ---------------------------------------------------------------------------

export const podiumItem = {
    hidden: { opacity: 0, y: 50, scale: 0.85 },
    show: { opacity: 1, y: 0, scale: 1, transition: SPRING_CONFIG.podiumEntrance },
};

// ---------------------------------------------------------------------------
// PodiumSlot component
// ---------------------------------------------------------------------------

interface PodiumSlotProps {
    tier: PodiumTier;
    gridItem: GridItemType | null;
    onRemove: (position: number) => void;
    getItemTitle: (item: any) => string;
    onFillViaBracket?: (position: number) => void;
    shouldAnimate: boolean;
}

export function PodiumSlot({ tier, gridItem, onRemove, getItemTitle, onFillViaBracket, shouldAnimate }: PodiumSlotProps) {
    const cfg = TIER_CONFIGS[tier];
    const { handleClick, highlightStyle } = usePodiumClickToPlace(cfg.position);
    const isOccupied = !!(gridItem && gridItem.context.matched);

    return (
        <motion.div className={cfg.containerClass} variants={podiumItem}>
            {/* Medal / Trophy icon */}
            <motion.div
                className={cfg.iconWrapperClass}
                initial={cfg.iconInitial}
                animate={cfg.iconAnimate}
                transition={cfg.iconTransition}
            >
                {cfg.sparkle ? (
                    <div className="relative">
                        {cfg.icon}
                        <motion.div
                            className="absolute -top-1 -right-1 w-3 h-3"
                            animate={shouldAnimate ? { scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] } : { scale: 1, opacity: 0.5 }}
                            transition={{ duration: CONNECTOR.sparkleLoop, repeat: Infinity }}
                        >
                            <div className="w-full h-full bg-yellow-300 rounded-full blur-xs" />
                        </motion.div>
                    </div>
                ) : (
                    cfg.icon
                )}
            </motion.div>

            {/* Drop zone */}
            <div className={`${cfg.dropZoneSize} relative z-10 rounded-card`} style={highlightStyle} onClick={handleClick}>
                <Elevated level="medium" hoverLift={false} className="w-full h-full rounded-card">
                    <SimpleDropZone
                        position={cfg.position}
                        isOccupied={isOccupied}
                        occupiedBy={isOccupied ? getItemTitle(gridItem!) : undefined}
                        imageUrl={isOccupied ? gridItem!.item?.image_url : undefined}
                        gridItem={isOccupied ? gridItem! : undefined}
                        onRemove={() => onRemove(cfg.position)}
                        showBadge={false}
                        hideTitle
                        onFillViaBracket={onFillViaBracket ? () => onFillViaBracket(cfg.position) : undefined}
                    />
                </Elevated>
            </div>

            {/* Podium block */}
            <motion.div
                className={cfg.blockWidth}
                initial={{ scaleY: 0, boxShadow: '0 0 0 rgba(0,0,0,0)' }}
                animate={{ scaleY: 1, boxShadow: cfg.blockShadow }}
                transition={{ delay: cfg.blockDelay, duration: cfg.blockDuration, ease: "easeOut" }}
                style={{ originY: 1 }}
            >
                <div className={`${cfg.topSurfaceHeight} ${cfg.topSurfaceClass}`} />
                <div className={`${cfg.bodyHeight} ${cfg.bodyClass}`}>
                    <div className={`absolute ${cfg.highlightInset} top-0 bottom-0 w-px ${cfg.highlightClass}`} />
                    <div className={`absolute right-2 top-0 bottom-0 w-px ${cfg.highlightClass}`} />
                    {cfg.centerGlow && (
                        <div className="absolute inset-x-8 top-4 bottom-4 bg-linear-to-b from-yellow-400/20 to-transparent rounded-full blur-xl" />
                    )}
                    <div className="absolute inset-0 flex items-center justify-center">
                        <span className={cfg.numberClass}>{cfg.label}</span>
                    </div>
                </div>
            </motion.div>

            {/* Title below podium */}
            {isOccupied && (
                <p className={`${cfg.titleClass} ${cfg.titleMaxWidth}`}>
                    {getItemTitle(gridItem!)}
                </p>
            )}
        </motion.div>
    );
}
