"use client";

import { motion } from 'framer-motion';
import { Trophy, Crown, Mountain, Swords, ListOrdered } from 'lucide-react';
import { DURATION } from '@/lib/animations/motion-presets';

export type ViewMode = 'podium' | 'goat' | 'rushmore' | 'bracket' | 'tierlist';

interface ViewSwitcherProps {
    currentView: ViewMode;
    onViewChange: (view: ViewMode) => void;
}

const viewOptions = [
    { id: 'podium' as ViewMode, label: 'Podium', icon: Trophy, description: 'Top 3 Winners' },
    { id: 'goat' as ViewMode, label: 'G.O.A.T', icon: Crown, description: 'The Greatest' },
    { id: 'rushmore' as ViewMode, label: 'Mt. Rushmore', icon: Mountain, description: 'Top 4 Legends' },
    { id: 'bracket' as ViewMode, label: 'Bracket', icon: Swords, description: 'Tournament Mode' },
    { id: 'tierlist' as ViewMode, label: 'Tier List', icon: ListOrdered, description: 'S/A/B/C Tiers' },
];

export function ViewSwitcher({ currentView, onViewChange }: ViewSwitcherProps) {
    return (
        <div className="flex items-center gap-2 p-1 rounded-container bg-slate-900/50 backdrop-blur-xs border border-slate-800/50">
            {viewOptions.map((option) => {
                const Icon = option.icon;
                const isActive = currentView === option.id;

                return (
                    <motion.button
                        key={option.id}
                        onClick={() => onViewChange(option.id)}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        aria-label={`${option.label} view: ${option.description}`}
                        aria-pressed={isActive}
                        className={`
              relative px-4 py-2 rounded-control font-bold text-xs tracking-wide
              transition-all duration-200 flex items-center gap-2
              focus-ring touch-target
              ${isActive
                                ? 'bg-linear-to-r from-brand/20 to-blue-500/20 border border-brand/40 text-brand-hover shadow-lg shadow-brand/15'
                                : 'bg-transparent border border-transparent text-gray-400 hover:bg-slate-800/50 hover:text-brand-hover'
                            }
            `}
                        data-testid={`view-${option.id}-btn`}
                    >
                        {/* Icon with subtle transition */}
                        <Icon className={`w-4 h-4 transition-colors duration-200 ${isActive ? 'text-brand-hover' : 'text-gray-500 group-hover:text-brand-hover'}`} />

                        {/* Label */}
                        <span className="hidden sm:inline text-xs font-bold font-grotesk uppercase whitespace-nowrap">{option.label}</span>

                        {/* Active indicator with glow */}
                        {isActive && (
                            <motion.div
                                layoutId="activeView"
                                className="absolute inset-0 rounded-control border border-brand-hover/40 shadow-glow-brand-sm"
                                transition={{ type: "spring", bounce: 0.2, duration: DURATION.emphasis }}
                            />
                        )}
                    </motion.button>
                );
            })}
        </div>
    );
}
