"use client";

import { motion } from 'framer-motion';
import { Trophy, Crown, Mountain, Swords, ListOrdered } from 'lucide-react';

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
        <div className="flex items-center gap-2 p-1 rounded-xl bg-slate-900/50 backdrop-blur-sm border border-slate-800/50">
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
              relative px-4 py-2 rounded-lg font-bold text-xs tracking-wide
              transition-all duration-200 flex items-center gap-2
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900
              ${isActive
                                ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/40 text-cyan-300 shadow-lg shadow-cyan-500/15'
                                : 'bg-transparent border border-transparent text-gray-400 hover:bg-slate-800/50 hover:text-cyan-400'
                            }
            `}
                        data-testid={`view-${option.id}-btn`}
                    >
                        {/* Icon with subtle transition */}
                        <Icon className={`w-4 h-4 transition-colors duration-200 ${isActive ? 'text-cyan-400' : 'text-gray-500 group-hover:text-cyan-400'}`} />

                        {/* Label */}
                        <span className="hidden sm:inline text-xs font-bold uppercase whitespace-nowrap">{option.label}</span>

                        {/* Active indicator with glow */}
                        {isActive && (
                            <motion.div
                                layoutId="activeView"
                                className="absolute inset-0 rounded-lg border border-cyan-400/40 shadow-[0_0_12px_rgba(34,211,238,0.15)]"
                                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                            />
                        )}
                    </motion.button>
                );
            })}
        </div>
    );
}
