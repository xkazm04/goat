"use client";

import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CollectionGroup } from "@/app/features/Collection/types";
import {
  CollectionHeader,
  CollectionSidebar,
  CollectionHorizontalBar,
  CollectionGrid,
  CollectionToggleButton,
  GroupViewMode,
} from "./components";

interface SimpleCollectionPanelProps {
  groups: CollectionGroup[];
}

/**
 * "Glass Dock" Collection Panel
 * A premium, floating dock for managing collection items.
 * 
 * Features:
 * - Fixed at bottom of viewport
 * - Switchable group navigation (sidebar vs horizontal bar)
 * - Filters out items already placed in the grid
 * - Hides groups with 0 available items
 * - Responsive grid layout
 */
export function SimpleCollectionPanel({ groups }: SimpleCollectionPanelProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [activeTab, setActiveTab] = useState<string | 'all'>('all');
  const [groupViewMode, setGroupViewMode] = useState<GroupViewMode>('sidebar');

  // Filter items based on selection and calculate totals
  const { displayGroups, totalItemCount, visibleItemCount } = useMemo(() => {
    // Get groups to display based on active tab
    const selectedGroups = activeTab === 'all' 
      ? groups 
      : groups.filter(g => g.id === activeTab);
    
    // Calculate total items (before filtering used items)
    const total = groups.reduce((sum, g) => {
      const availableItems = (g.items || []).filter(item => !item.used);
      return sum + availableItems.length;
    }, 0);

    // Calculate visible items in current selection
    const visible = selectedGroups.reduce((sum, g) => {
      const availableItems = (g.items || []).filter(item => !item.used);
      return sum + availableItems.length;
    }, 0);

    return {
      displayGroups: selectedGroups,
      totalItemCount: total,
      visibleItemCount: visible,
    };
  }, [groups, activeTab]);

  // Reset to 'all' if the currently selected group becomes empty
  useEffect(() => {
    if (activeTab !== 'all') {
      const selectedGroup = groups.find(g => g.id === activeTab);
      if (selectedGroup) {
        const availableCount = (selectedGroup.items || []).filter(item => !item.used).length;
        if (availableCount === 0) {
          setActiveTab('all');
        }
      }
    }
  }, [groups, activeTab]);

  // Toggle panel visibility
  const togglePanel = () => setIsVisible(prev => !prev);

  return (
    <>
      {/* Toggle Button (When Hidden) */}
      <CollectionToggleButton 
        isVisible={isVisible} 
        onToggle={togglePanel} 
      />

      {/* Main Dock Panel - Fixed at bottom */}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ y: "100%", opacity: 0 }}
            animate={{
              y: 0,
              opacity: 1,
              transition: {
                type: "spring",
                stiffness: 260,
                damping: 26,
                mass: 0.8,
                opacity: { duration: 0.25, ease: "easeOut" }
              }
            }}
            exit={{
              y: "100%",
              opacity: 0,
              transition: {
                type: "spring",
                stiffness: 260,
                damping: 26,
                mass: 0.8,
                opacity: { duration: 0.2 }
              }
            }}
            className="fixed bottom-0 left-0 right-0 z-50"
          >
            <div className="w-full bg-gray-900/95 dark:bg-gray-950/95 backdrop-blur-2xl border-t border-white/10 dark:border-white/5 shadow-[0_-8px_32px_rgba(0,0,0,0.4)] dark:shadow-[0_-8px_48px_rgba(0,0,0,0.6)] flex flex-col max-h-[45vh]">
              
              {/* Header Bar */}
              <CollectionHeader
                totalItems={totalItemCount}
                isVisible={isVisible}
                onTogglePanel={togglePanel}
                groupViewMode={groupViewMode}
                onGroupViewModeChange={setGroupViewMode}
              />

              {/* Horizontal Group Bar (if in horizontal mode) */}
              {groupViewMode === 'horizontal' && (
                <CollectionHorizontalBar
                  groups={groups}
                  activeTab={activeTab}
                  onTabChange={setActiveTab}
                  totalItemCount={totalItemCount}
                />
              )}

              {/* Content Area */}
              <div className="flex flex-1 overflow-hidden">
                
                {/* Sidebar (if in sidebar mode) */}
                {groupViewMode === 'sidebar' && (
                  <CollectionSidebar
                    groups={groups}
                    activeTab={activeTab}
                    onTabChange={setActiveTab}
                    totalItemCount={totalItemCount}
                  />
                )}

                {/* Main Grid */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{
                    opacity: 1,
                    transition: { delay: 0.2, duration: 0.3 }
                  }}
                  className="flex-1 p-4 overflow-y-auto bg-gradient-to-b from-transparent to-black/20 dark:to-black/40"
                >
                  <CollectionGrid
                    displayGroups={displayGroups}
                    showGroupHeaders={activeTab === 'all'}
                  />
                </motion.div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

