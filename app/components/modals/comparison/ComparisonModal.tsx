"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Star } from "lucide-react";
import { useComparisonStore } from "@/app/stores/comparison-store";
import { useItemStore } from "@/app/stores/item-store";
import { ComparisonItem } from "./ComparisonItem";
import { ComparisonHeader } from "./ComparisonHeader";
import { ComparisonActions } from "./ComparisonActions";

interface ComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ComparisonModal({ isOpen, onClose }: ComparisonModalProps) {
  const {
    items,
    selectedForComparison,
    comparisonMode,
    setComparisonMode,
    toggleComparisonSelection,
    removeFromComparison,
    clearComparison,
    closeComparison
  } = useComparisonStore();

  const { 
    assignItemToGrid,
    getNextAvailableGridPosition
  } = useItemStore();

  const handleClose = () => {
    closeComparison();
    onClose();
  };

  const handleModeChange = (mode: typeof comparisonMode) => {
    setComparisonMode(mode);
  };

  const handleQuickAssign = (item: any) => {
    const nextPosition = getNextAvailableGridPosition();
    if (nextPosition !== null) {
      assignItemToGrid(item, nextPosition);
      removeFromComparison(item.id);
    }
  };

  const handleBulkAssign = () => {
    selectedForComparison.forEach(itemId => {
      const item = items.find(i => i.id === itemId);
      if (item) {
        handleQuickAssign(item);
      }
    });
  };

  const getGridClasses = () => {
    switch (comparisonMode) {
      case 'grid':
        return "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4";
      case 'list':
        return "space-y-3";
      case 'side-by-side':
        return "grid grid-cols-1 md:grid-cols-2 gap-6";
      default:
        return "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4";
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={handleClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="w-full max-w-7xl max-h-[90vh] rounded-2xl overflow-hidden"
          style={{
            background: `
              linear-gradient(135deg, 
                rgba(15, 23, 42, 0.95) 0%,
                rgba(30, 41, 59, 0.98) 50%,
                rgba(51, 65, 85, 0.95) 100%
              )
            `,
            border: '2px solid rgba(71, 85, 105, 0.4)',
            boxShadow: `
              0 25px 50px -12px rgba(0, 0, 0, 0.6),
              0 0 0 1px rgba(71, 85, 105, 0.3)
            `
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <ComparisonHeader
            onClose={handleClose}
            comparisonMode={comparisonMode}
            onModeChange={handleModeChange}
            itemCount={items.length}
            selectedCount={selectedForComparison.length}
          />

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6" style={{ maxHeight: 'calc(90vh - 200px)' }}>
            {items.length === 0 ? (
              // Empty State
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center py-16"
              >
                <div 
                  className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
                  style={{
                    background: `linear-gradient(135deg, 
                      rgba(59, 130, 246, 0.2) 0%,
                      rgba(147, 51, 234, 0.2) 100%
                    )`,
                    border: '2px dashed rgba(59, 130, 246, 0.4)'
                  }}
                >
                  <Star className="w-10 h-10 text-blue-400" />
                </div>
                <h3 className="text-xl font-bold text-slate-200 mb-2">
                  No Items to Compare
                </h3>
                <p className="text-slate-400 text-center max-w-md">
                  Add items to comparison from the backlog groups using the context menu. 
                  Items will appear here for side-by-side comparison and analysis.
                </p>
                <button
                  onClick={handleClose}
                  className="mt-6 px-6 py-3 rounded-xl font-semibold transition-all duration-200"
                  style={{
                    background: `linear-gradient(135deg, 
                      rgba(59, 130, 246, 0.8) 0%,
                      rgba(147, 51, 234, 0.8) 100%
                    )`,
                    color: 'white',
                    boxShadow: '0 4px 15px rgba(59, 130, 246, 0.3)'
                  }}
                >
                  Back to Collection
                </button>
              </motion.div>
            ) : (
              // Items Grid/List
              <div className={getGridClasses()}>
                <AnimatePresence mode="popLayout">
                  {items.map((item, index) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, scale: 0.8, y: 20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.8, y: -20 }}
                      transition={{
                        duration: 0.3,
                        delay: index * 0.05,
                        layout: { duration: 0.2 }
                      }}
                      layout
                    >
                      <ComparisonItem
                        item={item}
                        isSelected={selectedForComparison.includes(item.id)}
                        onToggleSelection={() => toggleComparisonSelection(item.id)}
                        onRemove={() => removeFromComparison(item.id)}
                        onQuickAssign={() => handleQuickAssign(item)}
                        comparisonMode={comparisonMode}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* Actions Footer */}
          {items.length > 0 && (
            <ComparisonActions
              selectedCount={selectedForComparison.length}
              totalCount={items.length}
              onBulkAssign={handleBulkAssign}
              onClearAll={clearComparison}
              onClose={handleClose}
            />
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}