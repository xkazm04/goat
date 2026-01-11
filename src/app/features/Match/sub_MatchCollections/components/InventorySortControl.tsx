'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp,
  ArrowUpDown,
  Zap,
  Target,
  SortAsc,
  Clock,
  ChevronDown,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useConsensusStore,
  useConsensusSortConfig,
} from '@/stores/consensus-store';
import type { InventorySortBy, InventorySortOrder } from '@/types/ranked-inventory';

interface SortOption {
  value: InventorySortBy;
  label: string;
  description: string;
  icon: React.ReactNode;
}

const SORT_OPTIONS: SortOption[] = [
  {
    value: 'consensus',
    label: 'Popular',
    description: 'Sort by community consensus ranking',
    icon: <TrendingUp className="w-3.5 h-3.5" />,
  },
  {
    value: 'volatility',
    label: 'Contested',
    description: 'Most debated items first',
    icon: <Zap className="w-3.5 h-3.5" />,
  },
  {
    value: 'confidence',
    label: 'Confident',
    description: 'Most agreed upon rankings',
    icon: <Target className="w-3.5 h-3.5" />,
  },
  {
    value: 'alphabetical',
    label: 'A-Z',
    description: 'Sort alphabetically',
    icon: <SortAsc className="w-3.5 h-3.5" />,
  },
  {
    value: 'default',
    label: 'Default',
    description: 'Original order',
    icon: <Clock className="w-3.5 h-3.5" />,
  },
];

interface InventorySortControlProps {
  className?: string;
}

/**
 * InventorySortControl
 *
 * Allows users to control how items in the Collection Panel (unranked pool)
 * are sorted. The key insight is that popular items should bubble to the top
 * when sorted by consensus ranking.
 */
export function InventorySortControl({ className }: InventorySortControlProps) {
  const [isOpen, setIsOpen] = useState(false);
  const sortConfig = useConsensusSortConfig();
  const setSortConfig = useConsensusStore((s) => s.setSortConfig);

  const currentOption = useMemo(() => {
    return SORT_OPTIONS.find((opt) => opt.value === sortConfig.sortBy) || SORT_OPTIONS[0];
  }, [sortConfig.sortBy]);

  const handleSelect = (value: InventorySortBy) => {
    setSortConfig({
      sortBy: value,
      sortOrder: value === 'alphabetical' ? 'asc' : sortConfig.sortOrder,
    });
    setIsOpen(false);
  };

  const toggleOrder = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSortConfig({
      ...sortConfig,
      sortOrder: sortConfig.sortOrder === 'asc' ? 'desc' : 'asc',
    });
  };

  return (
    <div className={cn('relative', className)}>
      {/* Main Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-1.5 px-2.5 py-1.5',
          'bg-gray-800/60 hover:bg-gray-700/60',
          'border border-gray-700/50 hover:border-gray-600/50',
          'rounded-lg transition-all duration-200',
          'text-xs text-gray-300 hover:text-white',
          isOpen && 'bg-gray-700/60 border-gray-600/50'
        )}
        data-testid="inventory-sort-control-btn"
      >
        <span className="text-cyan-400">{currentOption.icon}</span>
        <span className="font-medium">{currentOption.label}</span>
        <ChevronDown
          className={cn(
            'w-3 h-3 text-gray-500 transition-transform',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      {/* Sort Order Toggle (only show for certain sort types) */}
      {sortConfig.sortBy !== 'default' && sortConfig.sortBy !== 'alphabetical' && (
        <button
          onClick={toggleOrder}
          className={cn(
            'absolute -right-7 top-1/2 -translate-y-1/2',
            'p-1 rounded hover:bg-gray-700/50',
            'text-gray-500 hover:text-gray-300 transition-colors'
          )}
          title={sortConfig.sortOrder === 'asc' ? 'Best first' : 'Worst first'}
          data-testid="inventory-sort-order-toggle"
        >
          <ArrowUpDown className="w-3 h-3" />
        </button>
      )}

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />

            {/* Dropdown Menu */}
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className={cn(
                'absolute left-0 top-full mt-1 z-50',
                'min-w-[200px] p-1',
                'bg-gray-900/95 backdrop-blur-xl',
                'border border-gray-700/50 rounded-lg',
                'shadow-xl shadow-black/40'
              )}
              data-testid="inventory-sort-dropdown"
            >
              {SORT_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleSelect(option.value)}
                  className={cn(
                    'w-full flex items-start gap-2.5 px-2.5 py-2',
                    'rounded-md transition-colors',
                    'hover:bg-gray-800/60',
                    sortConfig.sortBy === option.value && 'bg-cyan-500/10'
                  )}
                  data-testid={`sort-option-${option.value}`}
                >
                  <span
                    className={cn(
                      'mt-0.5',
                      sortConfig.sortBy === option.value
                        ? 'text-cyan-400'
                        : 'text-gray-500'
                    )}
                  >
                    {option.icon}
                  </span>
                  <div className="flex-1 text-left">
                    <div
                      className={cn(
                        'text-xs font-medium',
                        sortConfig.sortBy === option.value
                          ? 'text-cyan-300'
                          : 'text-gray-200'
                      )}
                    >
                      {option.label}
                    </div>
                    <div className="text-[10px] text-gray-500 mt-0.5">
                      {option.description}
                    </div>
                  </div>
                  {sortConfig.sortBy === option.value && (
                    <Check className="w-3.5 h-3.5 text-cyan-400 mt-0.5" />
                  )}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export default InventorySortControl;
