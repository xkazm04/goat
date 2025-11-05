"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { ChevronUp, ChevronDown, Layers } from "lucide-react";
import { useBacklogStore } from "@/stores/backlog-store";
import { useCurrentList } from "@/stores/use-list-store";
import { CollectionGroupSelector } from "./CollectionGroupSelector";
import { CollectionItemsPanel } from "./CollectionItemsPanel";

interface CollectionDrawerProps {
  className?: string;
}

/**
 * CollectionDrawer - Bottom drawer for browsing and selecting items
 *
 * Replaces the sidebar Backlog with a bottom drawer design that mimics tier list layouts
 * - Items on top, collection at the bottom
 * - Two-part layout: group selector (left) + items panel (right)
 * - Preserves drag & drop functionality
 */
export function CollectionDrawer({ className }: CollectionDrawerProps) {
  // Store state
  const groups = useBacklogStore(state => state.groups);
  const isLoading = useBacklogStore(state => state.isLoading);
  const { initializeGroups, loadGroupItems, filterGroupsByCategory } = useBacklogStore();
  const currentList = useCurrentList();

  // Local UI state
  const [isOpen, setIsOpen] = useState(false);
  const [selectedGroupIds, setSelectedGroupIds] = useState<Set<string>>(new Set());
  const [isInitialized, setIsInitialized] = useState(false);

  // Constants - Fixed height at 40vh
  const DRAWER_HEIGHT = '40vh';

  // Initialize groups when category changes
  useEffect(() => {
    if (!currentList?.category) return;

    if (!isInitialized) {
      console.log(`🔄 Initializing Collection for category: ${currentList.category}`);
      initializeGroups(currentList.category, currentList.subcategory, true);
      setIsInitialized(true);
    }
  }, [currentList?.category, currentList?.subcategory, isInitialized, initializeGroups]);

  // Filter groups by current category
  const filteredGroups = useMemo(() => {
    if (!currentList?.category) return [];
    return filterGroupsByCategory(currentList.category, currentList.subcategory);
  }, [currentList?.category, currentList?.subcategory, filterGroupsByCategory, groups]);

  // Auto-select all groups initially
  useEffect(() => {
    if (filteredGroups.length > 0 && selectedGroupIds.size === 0) {
      setSelectedGroupIds(new Set(filteredGroups.map(g => g.id)));
    }
  }, [filteredGroups, selectedGroupIds.size]);

  // Get items from selected groups
  const selectedItems = useMemo(() => {
    return filteredGroups
      .filter(group => selectedGroupIds.has(group.id))
      .flatMap(group => (group.items || []).map(item => ({
        ...item,
        groupId: group.id,
        groupName: group.name
      })));
  }, [filteredGroups, selectedGroupIds]);

  // Toggle drawer
  const toggleDrawer = useCallback(() => {
    setIsOpen(!isOpen);
  }, [isOpen]);

  // Handle group selection (multi-select)
  const handleGroupToggle = useCallback((groupId: string) => {
    setSelectedGroupIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
        // Load items if not already loaded
        const group = filteredGroups.find(g => g.id === groupId);
        if (group && (!group.items || group.items.length === 0)) {
          loadGroupItems(groupId);
        }
      }
      return newSet;
    });
  }, [filteredGroups, loadGroupItems]);

  // Select/Deselect all groups
  const handleSelectAll = useCallback(() => {
    setSelectedGroupIds(new Set(filteredGroups.map(g => g.id)));
  }, [filteredGroups]);

  const handleDeselectAll = useCallback(() => {
    setSelectedGroupIds(new Set());
  }, []);

  // Handle ESC key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  return (
    <>
      {/* Toggle Button - Fixed at bottom with enhanced design */}
      <motion.button
        onClick={toggleDrawer}
        whileHover={{ scale: 1.05, y: -4 }}
        whileTap={{ scale: 0.95 }}
        animate={{
          boxShadow: isOpen
            ? '0 20px 60px rgba(6, 182, 212, 0.3), 0 0 20px rgba(6, 182, 212, 0.2)'
            : '0 10px 40px rgba(6, 182, 212, 0.2)'
        }}
        className={`fixed bottom-4 right-4 z-40 px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 rounded-lg border border-cyan-400/30 transition-all overflow-hidden ${className}`}
      >
        {/* Animated background shimmer */}
        <motion.div
          animate={{
            x: ['-100%', '100%']
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "linear"
          }}
          className="absolute inset-0 w-full h-full"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent)'
          }}
        />

        <div className="relative flex items-center gap-2">
          <motion.div
            animate={{ rotate: isOpen ? 0 : 360 }}
            transition={{ duration: 0.5 }}
          >
            <Layers className="w-4 h-4 text-white" />
          </motion.div>
          <span className="text-xs font-semibold text-white tracking-wide">Collection</span>
          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.3 }}
          >
            <ChevronUp className="w-3.5 h-3.5 text-white" />
          </motion.div>
          {selectedItems.length > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="px-1.5 py-0.5 bg-white/25 backdrop-blur-sm rounded text-xs font-mono font-semibold text-white border border-white/20"
            >
              {selectedItems.length}
            </motion.span>
          )}
        </div>
      </motion.button>

      {/* Bottom Drawer - No backdrop, fixed height */}
      <AnimatePresence mode="wait">
        {isOpen && (
          <motion.div
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{
              type: 'spring',
              damping: 35,
              stiffness: 300,
              mass: 0.8
            }}
            style={{ height: DRAWER_HEIGHT }}
            className="fixed bottom-0 left-0 right-0 z-30"
          >
            {/* Drawer Content */}
            <div className="relative h-full bg-gradient-to-br from-gray-900 via-gray-850 to-gray-900 border-t-2 border-cyan-500/40 shadow-2xl overflow-hidden">
              {/* Animated top glow */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent"
              />

              {/* Blueprint grid background with animation */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.05 }}
                transition={{ duration: 0.5 }}
                className="absolute inset-0 pointer-events-none"
                style={{
                  backgroundImage: `
                    linear-gradient(rgba(6, 182, 212, 0.15) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(6, 182, 212, 0.15) 1px, transparent 1px)
                  `,
                  backgroundSize: '40px 40px',
                }}
              />

              {/* Main Content Area - No drag handle, no top padding */}
              <div className="relative h-full flex">
                {/* Left Sidebar - Group Selector */}
                <div className="w-64 border-r border-gray-700/50 flex-shrink-0">
                  <CollectionGroupSelector
                    groups={filteredGroups}
                    selectedGroupIds={selectedGroupIds}
                    onGroupToggle={handleGroupToggle}
                    onSelectAll={handleSelectAll}
                    onDeselectAll={handleDeselectAll}
                    isLoading={isLoading}
                  />
                </div>

                {/* Right Panel - Items Grid */}
                <div className="flex-1 overflow-hidden">
                  <CollectionItemsPanel
                    groups={filteredGroups.filter(g => selectedGroupIds.has(g.id))}
                    selectedGroupIds={selectedGroupIds}
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
