"use client";

import { Clock } from 'lucide-react';

interface TimeframeSelectorProps {
  selectedTimeframe: 'daily' | 'weekly' | 'monthly' | 'all-time';
  onSelectTimeframe: (timeframe: 'daily' | 'weekly' | 'monthly' | 'all-time') => void;
}

const TIMEFRAMES = [
  { id: 'daily' as const, label: 'Today' },
  { id: 'weekly' as const, label: 'This Week' },
  { id: 'monthly' as const, label: 'This Month' },
  { id: 'all-time' as const, label: 'All Time' },
];

export function TimeframeSelector({ selectedTimeframe, onSelectTimeframe }: TimeframeSelectorProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <Clock className="w-4 h-4" />
        <span className="font-medium">Period:</span>
      </div>

      {TIMEFRAMES.map((timeframe) => (
        <button
          key={timeframe.id}
          onClick={() => onSelectTimeframe(timeframe.id)}
          className={`
            px-3 py-1.5 text-sm font-medium rounded-lg border transition-all
            ${
              selectedTimeframe === timeframe.id
                ? 'bg-purple-500/20 border-purple-500/50 text-purple-300'
                : 'bg-gray-800/50 border-gray-700 text-gray-400 hover:border-gray-600 hover:text-gray-300'
            }
          `}
          data-testid={`timeframe-selector-${timeframe.id}`}
        >
          {timeframe.label}
        </button>
      ))}
    </div>
  );
}
