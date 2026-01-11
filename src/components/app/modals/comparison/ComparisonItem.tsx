"use client";

import { BacklogItemType } from "@/types/match";
import { motion } from "framer-motion";
import { Star, Gamepad2, Trophy, X, ArrowUpRight, Check, Grid3X3 } from "lucide-react";
import { useState } from "react";

interface ComparisonItemProps {
  item: BacklogItemType;
  isSelected: boolean;
  onToggleSelection: () => void;
  onRemove: () => void;
  onQuickAssign: () => void;
  comparisonMode: 'grid' | 'list' | 'side-by-side';
}

const getItemIcon = (title: string) => {
  const lower = title.toLowerCase();
  if (lower.includes('game') || lower.includes('gta') || lower.includes('mario')) {
    return Gamepad2;
  }
  if (lower.includes('jordan') || lower.includes('lebron') || lower.includes('sport')) {
    return Trophy;
  }
  return Star;
};

export function ComparisonItem({
  item,
  isSelected,
  onToggleSelection,
  onRemove,
  onQuickAssign,
  comparisonMode
}: ComparisonItemProps) {
  const [isHovered, setIsHovered] = useState(false);
  const IconComponent = getItemIcon(item.title);

  // Different layouts based on comparison mode
  const getLayoutClasses = () => {
    switch (comparisonMode) {
      case 'list':
        return "flex items-center gap-4 p-4 rounded-xl";
      case 'side-by-side':
        return "flex flex-col p-6 rounded-xl h-full";
      case 'grid':
      default:
        return "aspect-square rounded-xl p-4 flex flex-col items-center justify-center";
    }
  };

  const getContentLayout = () => {
    if (comparisonMode === 'list') {
      return (
        <>
          {/* Icon */}
          <div 
            className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{
              background: `linear-gradient(135deg, 
                #4c1d95 0%, 
                #7c3aed 50%,
                #3b82f6 100%
              )`,
              boxShadow: '0 2px 8px rgba(124, 58, 237, 0.3)'
            }}
          >
            <IconComponent className="w-6 h-6 text-white" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-slate-200 text-base mb-1 truncate">
              {item.title}
            </h4>
            {item.description && (
              <p className="text-sm text-slate-400 line-clamp-2">
                {item.description}
              </p>
            )}
            <div className="flex items-center gap-2 mt-2">
              {item.tags?.map((tag) => (
                <span 
                  key={tag}
                  className="text-xs px-2 py-1 rounded-full bg-slate-700/50 text-slate-300"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onQuickAssign();
              }}
              className="p-2 rounded-lg transition-all duration-200 hover:scale-110"
              style={{
                background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.8), rgba(16, 185, 129, 0.8))',
                boxShadow: '0 2px 8px rgba(34, 197, 94, 0.3)'
              }}
              title="Quick assign to grid"
              data-testid="comparison-item-quick-assign-btn"
            >
              <Grid3X3 className="w-4 h-4 text-white" />
            </button>
          </div>
        </>
      );
    }

    if (comparisonMode === 'side-by-side') {
      return (
        <>
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div 
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{
                background: `linear-gradient(135deg, 
                  #4c1d95 0%, 
                  #7c3aed 50%,
                  #3b82f6 100%
                )`,
                boxShadow: '0 2px 8px rgba(124, 58, 237, 0.3)'
              }}
            >
              <IconComponent className="w-5 h-5 text-white" />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1">
            <h4 className="font-semibold text-slate-200 text-lg mb-3">
              {item.title}
            </h4>
            
            {item.description && (
              <p className="text-sm text-slate-400 mb-4 leading-relaxed">
                {item.description}
              </p>
            )}

            {/* Tags */}
            {item.tags && item.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {item.tags.map((tag) => (
                  <span 
                    key={tag}
                    className="text-xs px-3 py-1 rounded-full bg-slate-700/50 text-slate-300"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 mt-auto pt-4">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onQuickAssign();
              }}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition-all duration-200"
              style={{
                background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.8), rgba(16, 185, 129, 0.8))',
                boxShadow: '0 2px 8px rgba(34, 197, 94, 0.3)',
                color: 'white'
              }}
              data-testid="comparison-item-assign-btn"
            >
              <Grid3X3 className="w-4 h-4" />
              Assign to Grid
            </button>
          </div>
        </>
      );
    }

    // Grid mode (default)
    return (
      <>
        {/* Icon */}
        <div 
          className="w-12 h-12 rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform"
          style={{
            background: `linear-gradient(135deg, 
              #4c1d95 0%, 
              #7c3aed 50%,
              #3b82f6 100%
            )`,
            boxShadow: '0 2px 8px rgba(124, 58, 237, 0.3)'
          }}
        >
          <IconComponent className="w-6 h-6 text-white" />
        </div>
        
        {/* Name */}
        <h4 className="font-semibold text-center leading-tight line-clamp-2 text-slate-200 text-sm">
          {item.title}
        </h4>
      </>
    );
  };

  return (
    <motion.div
      layout
      whileHover={{ scale: comparisonMode === 'grid' ? 1.02 : 1 }}
      whileTap={{ scale: 0.98 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className={`relative group cursor-pointer transition-all duration-300 ${getLayoutClasses()}`}
      onClick={onToggleSelection}
      style={{
        background: isSelected 
          ? `linear-gradient(135deg, 
              rgba(59, 130, 246, 0.2) 0%,
              rgba(147, 51, 234, 0.2) 100%
            )`
          : `linear-gradient(135deg, 
              rgba(30, 41, 59, 0.9) 0%,
              rgba(51, 65, 85, 0.95) 100%
            )`,
        border: isSelected 
          ? '2px solid rgba(59, 130, 246, 0.6)'
          : '2px solid rgba(71, 85, 105, 0.3)',
        boxShadow: isSelected
          ? '0 0 20px rgba(59, 130, 246, 0.3)'
          : '0 2px 8px rgba(0, 0, 0, 0.3)'
      }}
    >
      {/* Selection Indicator */}
      <div className="absolute top-2 left-2 z-10">
        {isSelected && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center"
          >
            <Check className="w-3 h-3 text-white" />
          </motion.div>
        )}
      </div>

      {/* Remove Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className={`absolute top-2 right-2 p-1 rounded-full transition-all duration-200 z-10 ${
          isHovered || comparisonMode === 'list' ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          background: 'rgba(239, 68, 68, 0.8)',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)'
        }}
        title="Remove from comparison"
        data-testid="comparison-item-remove-btn"
      >
        <X className="w-3 h-3 text-white" />
      </button>

      {/* Content */}
      {getContentLayout()}

      {/* Quick Assign Button for Grid Mode */}
      {comparisonMode === 'grid' && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onQuickAssign();
          }}
          className={`absolute bottom-2 right-2 p-2 rounded-lg transition-all duration-200 ${
            isHovered ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
          }`}
          style={{
            background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.8), rgba(16, 185, 129, 0.8))',
            boxShadow: '0 2px 8px rgba(34, 197, 94, 0.3)'
          }}
          title="Quick assign to grid"
          data-testid="comparison-item-grid-assign-btn"
        >
          <ArrowUpRight className="w-4 h-4 text-white" />
        </button>
      )}
    </motion.div>
  );
}