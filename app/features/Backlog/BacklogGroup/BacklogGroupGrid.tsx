import { motion, AnimatePresence } from "framer-motion";
import { useMemo, useState, useEffect } from "react";
import { AddItemPlaceholder } from "../AddItemPlaceholder";
import { Loader2 } from "lucide-react";
import { BacklogItem } from "../BacklogItem";
import { BacklogItem as BacklogItemType } from "@/app/types/backlog-groups";
import AddItemButton from "./AddtemButton";
import BacklogGroupFooter from "./BacklogGroupFooter";
import BacklogGroupEmpty from "./BacklogGroupEmpty";

type Props = {
    isExpanded: boolean;
    isDatabaseGroup: boolean;
    showMatched: boolean;
    group: {
        id: string;
        name: string;
        items: BacklogItemType[];
    };
    availableItems: BacklogItemType[];
    displayItems: BacklogItemType[];
    assignedItemIds: Set<string>;
    setIsAddModalOpen: (open: boolean) => void;
    setShowMatched: (show: boolean) => void;
    isExpandedView?: boolean;
    isLoading?: boolean;
    hasLoadedItems?: boolean;
    onAddNewItem?: () => void; // New prop for research-based item addition
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
  isExpandedView,
  isLoading = false,
  hasLoadedItems = false,
  onAddNewItem
}: Props) => {
  const [debouncedDisplayItems, setDebouncedDisplayItems] = useState(displayItems);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const assignedItems = useMemo(() =>
    group.items.filter(item => {
      const isAssigned = assignedItemIds.has(item.id);
      const isMatched = item.matched;
      return isAssigned || isMatched;
    }),
    [group.items, assignedItemIds]
  );

  useEffect(() => {
    setIsTransitioning(true);
    const timer = setTimeout(() => {
      setDebouncedDisplayItems(displayItems);
      setIsTransitioning(false);
    }, 250);
    return () => clearTimeout(timer);
  }, [displayItems]);

  const getGridClasses = () => {
    if (isExpandedView) {
      return "grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-3";
    }
    return "grid grid-cols-2 sm:grid-cols-3 gap-3";
  };

  const shouldShowLoadingState = isExpanded && isDatabaseGroup && isLoading && !hasLoadedItems;

  return (
    <AnimatePresence mode="wait">
      {isExpanded && (
        <motion.div
          initial={{ height: 0, opacity: 0, y: -20 }}
          animate={{ height: "auto", opacity: 1, y: 0 }}
          exit={{ height: 0, opacity: 0, y: -20 }}
          transition={{
            duration: 0.5,
            ease: [0.04, 0.62, 0.23, 0.98],
            opacity: { duration: 0.4 },
            y: { duration: 0.4 }
          }}
          className="overflow-hidden"
        >
          <motion.div
            className="p-4"
            style={{ background: 'rgba(15, 23, 42, 0.4)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
          >
            {shouldShowLoadingState ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-center py-12"
              >
                <div className="flex items-center gap-3 text-slate-400">
                  <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
                  <span className="text-sm">Loading items...</span>
                </div>
              </motion.div>
            ) : (
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
                {/* Items */}
                <AnimatePresence mode="popLayout">
                  {debouncedDisplayItems.map((item, index) => (
                    <motion.div
                      key={`${item.id}-${showMatched ? 'matched' : 'available'}`}
                      initial={{ opacity: 0, scale: 0.85, y: 30, rotateX: -20 }}
                      animate={{ opacity: 1, scale: 1, y: 0, rotateX: 0 }}
                      exit={{ opacity: 0, scale: 0.85, y: -30, rotateX: 20 }}
                      transition={{
                        duration: 0.5,
                        delay: 0.3 + index * 0.08,
                        ease: [0.04, 0.62, 0.23, 0.98],
                        layout: { duration: 0.4 }
                      }}
                      layout
                      layoutId={`backlog-item-${item.id}`}
                    >
                      <BacklogItem
                        item={{
                          id: item.id,
                          title: item.name || item.title || '',
                          description: item.description || '',
                          matched: item.matched || assignedItemIds.has(item.id),
                          tags: item.tags || []
                        }}
                        isAssignedToGrid={assignedItemIds.has(item.id)}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>

                {/* Add Item Placeholders - Enhanced for both custom and DB groups */}
                {!showMatched && (
                  <>
                    {/* Custom Group: Original Add Item Placeholder */}
                    {!isDatabaseGroup && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.8, y: -20 }}
                        transition={{
                          duration: 0.4,
                          delay: 0.15 + debouncedDisplayItems.length * 0.08,
                          ease: [0.04, 0.62, 0.23, 0.98]
                        }}
                        layout
                        layoutId={`add-placeholder-${group.id}`}
                      >
                        <AddItemPlaceholder onClick={() => setIsAddModalOpen(true)} />
                      </motion.div>
                    )}

                    {/* New Research-Based Add Item (for both group types) */}
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8, y: 20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.8, y: -20 }}
                      transition={{
                        duration: 0.4,
                        delay: 0.15 + (debouncedDisplayItems.length + (isDatabaseGroup ? 0 : 1)) * 0.08,
                        ease: [0.04, 0.62, 0.23, 0.98]
                      }}
                      layout
                      layoutId={`add-research-${group.id}`}
                    >
                      <AddItemButton onAddNewItem={onAddNewItem} />
                    </motion.div>
                  </>
                )}
              </motion.div>
            )}

            {/* Empty States */}
            {!shouldShowLoadingState && debouncedDisplayItems.length === 0 && !isTransitioning && (
                <BacklogGroupEmpty
                  showMatched={showMatched}
                  isDatabaseGroup={isDatabaseGroup}
                  hasLoadedItems={hasLoadedItems}
                  availableItems={availableItems}
                  setIsAddModalOpen={setIsAddModalOpen}
                  onAddNewItem={onAddNewItem}
                  />
            )}

            {/* Enhanced Group Stats Footer */}
            {!shouldShowLoadingState && (
              <BacklogGroupFooter
                showMatched={showMatched}
                assignedItems={assignedItems}
                availableItems={availableItems}
                debouncedDisplayItems={debouncedDisplayItems}
                group={group}
                setShowMatched={setShowMatched}
                />
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default BacklogGroupGrid;