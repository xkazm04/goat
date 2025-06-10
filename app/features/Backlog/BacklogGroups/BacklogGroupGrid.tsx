import { motion, AnimatePresence } from "framer-motion";
import { useMemo, useState, useEffect } from "react";
import { AddItemPlaceholder } from "../AddItemPlaceholder";
import { PlusIcon } from "lucide-react";
import { BacklogItem } from "../BacklogItem";

type Props = {
    isExpanded: boolean;
    isDatabaseGroup: boolean;
    showMatched: boolean;
    group: any; // Replace with actual type
    availableItems: any[]; // Replace with actual type
    displayItems: any[]; // Replace with actual type
    assignedItemIds: Set<string>;
    setIsAddModalOpen: (open: boolean) => void;
    setShowMatched: (show: boolean) => void;
    isExpandedView?: boolean;
}

const BacklogGroupGrid = ({ 
  isExpanded, 
  isDatabaseGroup, 
  showMatched, 
  group, 
  availableItems, 
  displayItems,
  assignedItemIds, 
  setIsAddModalOpen, 
  setShowMatched, 
  isExpandedView 
}: Props) => {
  const [debouncedDisplayItems, setDebouncedDisplayItems] = useState(displayItems);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const assignedItems = useMemo(() =>
    group.items.filter(item =>
      item.matched || assignedItemIds.has(item.id)
    ),
    [group.items, assignedItemIds]
  );

  // Debounced display items for smoother grid transitions
  useEffect(() => {
    setIsTransitioning(true);
    
    const timer = setTimeout(() => {
      setDebouncedDisplayItems(displayItems);
      setIsTransitioning(false);
    }, 250); // 250ms debounce for grid changes

    return () => clearTimeout(timer);
  }, [displayItems]);

  const getGridClasses = () => {
    if (isExpandedView) {
      return "grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-3";
    }
    return "grid grid-cols-2 sm:grid-cols-3 gap-3";
  };

  return (
    <AnimatePresence mode="wait">
      {isExpanded && (
        <motion.div
          initial={{
            height: 0,
            opacity: 0,
            y: -20
          }}
          animate={{
            height: "auto",
            opacity: 1,
            y: 0
          }}
          exit={{
            height: 0,
            opacity: 0,
            y: -20
          }}
          transition={{
            duration: 0.5, // Slower transition
            ease: [0.04, 0.62, 0.23, 0.98],
            opacity: { duration: 0.4 },
            y: { duration: 0.4 }
          }}
          className="overflow-hidden"
        >
          <motion.div
            className="p-4"
            style={{
              background: 'rgba(15, 23, 42, 0.4)'
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
          >
            {/* Enhanced Items Grid with Debounced Content */}
            <motion.div
              className={getGridClasses()}
              initial={{ opacity: 0, y: 10 }}
              animate={{ 
                opacity: isTransitioning ? 0.7 : 1, 
                y: 0,
                scale: isTransitioning ? 0.98 : 1
              }}
              transition={{ 
                delay: 0.3, 
                duration: 0.4,
                opacity: { duration: 0.3 },
                scale: { duration: 0.3 }
              }}
            >
              {/* Add Item Placeholder */}
              {!isDatabaseGroup && !showMatched && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8, y: -20 }}
                  transition={{
                    duration: 0.4,
                    delay: 0.15,
                    ease: [0.04, 0.62, 0.23, 0.98]
                  }}
                  layout
                  layoutId={`add-placeholder-${group.id}`}
                >
                  <AddItemPlaceholder onClick={() => setIsAddModalOpen(true)} />
                </motion.div>
              )}

              {/* Items with Enhanced Staggered Animation */}
              <AnimatePresence mode="popLayout">
                {debouncedDisplayItems.map((item, index) => (
                  <motion.div
                    key={`${item.id}-${showMatched ? 'matched' : 'available'}`}
                    initial={{
                      opacity: 0,
                      scale: 0.85,
                      y: 30,
                      rotateX: -20
                    }}
                    animate={{
                      opacity: 1,
                      scale: 1,
                      y: 0,
                      rotateX: 0
                    }}
                    exit={{
                      opacity: 0,
                      scale: 0.85,
                      y: -30,
                      rotateX: 20
                    }}
                    transition={{
                      duration: 0.5, // Slower item transitions
                      delay: 0.3 + ((!isDatabaseGroup && !showMatched) ? index + 1 : index) * 0.08, // Slower stagger
                      ease: [0.04, 0.62, 0.23, 0.98],
                      layout: { duration: 0.4 }
                    }}
                    layout
                    layoutId={`backlog-item-${item.id}`}
                  >
                    <BacklogItem
                      item={{
                        ...item,
                        matched: item.matched || assignedItemIds.has(item.id)
                      }}
                      isAssignedToGrid={assignedItemIds.has(item.id)}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>

            {/* Enhanced Empty States */}
            {debouncedDisplayItems.length === 0 && !isTransitioning && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{
                  delay: 0.4,
                  duration: 0.4,
                  ease: [0.04, 0.62, 0.23, 0.98]
                }}
                className="text-center py-8"
              >
                <motion.div
                  className="text-sm text-slate-400 mb-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5, duration: 0.3 }}
                >
                  {showMatched
                    ? "No ranked items yet"
                    : availableItems.length === 0 && "Add item into this group"
                  }
                </motion.div>

                {/* Enhanced Action buttons */}
                <motion.div
                  className="flex justify-center gap-2 mt-3"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.6, duration: 0.3 }}
                >
                  {!showMatched && (
                    <motion.button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsAddModalOpen(true);
                      }}
                      className="text-xs text-blue-400 rounded-xl hover:text-blue-300 transition-colors px-3 py-1 bg-blue-500/10 hover:bg-blue-500/20 flex items-center gap-1"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <PlusIcon size={14} />
                      Add Item
                    </motion.button>
                  )}

                  {assignedItems.length > 0 && !showMatched && availableItems.length === 0 && (
                    <motion.button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowMatched(true);
                      }}
                      className="text-xs text-green-400 hover:text-green-300 transition-colors px-3 py-1 rounded-lg bg-green-500/10 hover:bg-green-500/20"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      View ranked items
                    </motion.button>
                  )}
                </motion.div>
              </motion.div>
            )}

            {/* Enhanced Group Stats Footer */}
            <motion.div
              className="mt-4 pt-3 border-t border-slate-600/30"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: 0.5 + debouncedDisplayItems.length * 0.08,
                duration: 0.4
              }}
            >
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-3 text-slate-400">
                  <motion.span
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6, duration: 0.3 }}
                  >
                    {availableItems.length} available
                  </motion.span>
                  {assignedItems.length > 0 && (
                    <motion.span
                      className="text-green-400"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.7, duration: 0.3 }}
                    >
                      {assignedItems.length} ranked
                    </motion.span>
                  )}
                  <motion.span
                    className="text-slate-500"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.8, duration: 0.3 }}
                  >
                    {group.items.length} total
                  </motion.span>
                </div>

                {/* Toggle matched items view */}
                {assignedItems.length > 0 && (
                  <motion.button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMatched(!showMatched);
                    }}
                    className="text-xs text-slate-400 hover:text-slate-300 transition-colors px-2 py-1 rounded bg-slate-700/30 hover:bg-slate-700/50"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.9, duration: 0.3 }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {showMatched ? 'Show available' : 'Show ranked'}
                  </motion.button>
                )}
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default BacklogGroupGrid;