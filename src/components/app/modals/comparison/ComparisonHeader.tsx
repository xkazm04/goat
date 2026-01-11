import { X, Grid3X3, List, Columns2, Users } from "lucide-react";
import { motion } from "framer-motion";

interface ComparisonHeaderProps {
  onClose: () => void;
  comparisonMode: 'grid' | 'list' | 'side-by-side';
  onModeChange: (mode: 'grid' | 'list' | 'side-by-side') => void;
  itemCount: number;
  selectedCount: number;
}

export function ComparisonHeader({
  onClose,
  comparisonMode,
  onModeChange,
  itemCount,
  selectedCount
}: ComparisonHeaderProps) {
  const viewModes = [
    { id: 'grid', label: 'Grid', icon: Grid3X3 },
    { id: 'list', label: 'List', icon: List },
    { id: 'side-by-side', label: 'Side by Side', icon: Columns2 }
  ] as const;

  return (
    <div
      className="px-6 py-4 border-b flex items-center justify-between"
      data-testid="comparison-header"
      style={{
        borderColor: 'rgba(71, 85, 105, 0.4)',
        background: `
          linear-gradient(135deg, 
            rgba(30, 41, 59, 0.8) 0%,
            rgba(51, 65, 85, 0.9) 100%
          )
        `
      }}
    >
      <div className="flex items-center gap-4">
        <div 
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{
            background: `linear-gradient(135deg, 
              rgba(59, 130, 246, 0.8) 0%,
              rgba(147, 51, 234, 0.8) 100%
            )`
          }}
        >
          <Users className="w-5 h-5 text-white" />
        </div>
        
        <div>
          <h2 className="text-xl font-bold text-slate-200">
            Item Comparison
          </h2>
          <p className="text-sm text-slate-400">
            {itemCount} items • {selectedCount} selected for bulk actions
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* View Mode Toggle */}
        <div className="flex bg-slate-800/50 rounded-lg p-1" data-testid="comparison-view-mode-toggle">
          {viewModes.map((mode) => (
            <button
              key={mode.id}
              onClick={() => onModeChange(mode.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded text-sm font-medium transition-all ${
                comparisonMode === mode.id
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
              data-testid={`comparison-view-mode-${mode.id}-btn`}
            >
              <mode.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{mode.label}</span>
            </button>
          ))}
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="p-2 rounded-lg transition-colors hover:bg-slate-700/50"
          data-testid="comparison-close-btn"
        >
          <X className="w-5 h-5 text-slate-400" />
        </button>
      </div>
    </div>
  );
}