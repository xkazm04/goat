"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Layers, Search, Filter, X } from "lucide-react";
import { CollectionGroup, CollectionItem } from "@/app/features/Collection/types";
import { SimpleCollectionItem } from "@/app/features/Collection/SimpleCollectionItem";
import { motion, AnimatePresence } from "framer-motion";

interface SimpleCollectionPanelProps {
  groups: CollectionGroup[];
}

/**
 * "Glass Dock" Collection Panel
 * A premium, floating dock for managing collection items.
 */
export function SimpleCollectionPanel({ groups }: SimpleCollectionPanelProps) {
  const [selectedGroupIds, setSelectedGroupIds] = useState<Set<string>>(
    new Set(groups.map(g => g.id))
  );
  const [isVisible, setIsVisible] = useState(true);
  const [activeTab, setActiveTab] = useState<string | 'all'>('all');

  const toggleGroup = (groupId: string) => {
    setSelectedGroupIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    setSelectedGroupIds(new Set(groups.map(g => g.id)));
    setActiveTab('all');
  };

  // Filter items based on selection
  const selectedGroups = groups.filter(g => selectedGroupIds.has(g.id));

  // If a specific tab is active, show only that group (unless 'all' is selected)
  const displayGroups = activeTab === 'all'
    ? selectedGroups
    : groups.filter(g => g.id === activeTab);

  const totalItems = displayGroups.reduce((sum, g) => sum + (g.items?.length || 0), 0);

  // Toggle panel visibility
  const togglePanel = () => setIsVisible(prev => !prev);

  return (
    <>
      {/* Toggle Button (When Hidden) */}
      <AnimatePresence>
        {!isVisible && (
          <motion.button
            initial={{ y: 100, opacity: 0, scale: 0.9 }}
            animate={{
              y: 0,
              opacity: 1,
              scale: 1,
              transition: {
                type: "spring",
                stiffness: 300,
                damping: 24,
                opacity: { duration: 0.2 }
              }
            }}
            exit={{
              y: 100,
              opacity: 0,
              scale: 0.9,
              transition: { duration: 0.2 }
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
            onClick={togglePanel}
            aria-expanded={isVisible}
            aria-label="Open inventory panel"
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-gray-900/90 dark:bg-gray-950/90 backdrop-blur-xl border border-cyan-500/30 dark:border-cyan-400/20 text-cyan-400 dark:text-cyan-300 px-6 py-3 rounded-full shadow-[0_0_20px_rgba(6,182,212,0.2)] hover:shadow-[0_0_30px_rgba(6,182,212,0.4)] flex items-center gap-2 font-bold tracking-wide"
            data-testid="open-inventory-btn"
          >
            <Layers className="w-4 h-4" />
            OPEN INVENTORY
          </motion.button>
        )}
      </AnimatePresence>

      {/* Main Dock Panel */}
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
            className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none flex justify-center pb-4 px-4"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{
                scale: 1,
                transition: {
                  type: "spring",
                  stiffness: 300,
                  damping: 24,
                  delay: 0.05
                }
              }}
              className="pointer-events-auto w-full max-w-7xl bg-gray-900/85 dark:bg-gray-950/85 backdrop-blur-2xl border border-white/10 dark:border-white/5 rounded-3xl overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.4)] dark:shadow-[0_8px_48px_rgba(0,0,0,0.6)] flex flex-col max-h-[40vh]"
            >

              {/* Header Bar */}
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{
                  opacity: 1,
                  y: 0,
                  transition: { delay: 0.1, duration: 0.2 }
                }}
                className="flex items-center justify-between px-6 py-3 border-b border-white/5 dark:border-white/[0.02] bg-black/20 dark:bg-black/30 backdrop-blur-sm"
              >
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-cyan-400 dark:text-cyan-300">
                    <Layers className="w-5 h-5" />
                    <span className="font-bold tracking-wider text-sm">INVENTORY</span>
                  </div>
                  <div className="h-4 w-[1px] bg-white/10 dark:bg-white/5" />
                  <span className="text-xs text-gray-400 dark:text-gray-500 font-mono">{totalItems} ITEMS AVAILABLE</span>
                </div>

                <div className="flex items-center gap-3">
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={togglePanel}
                    aria-expanded={isVisible}
                    aria-label="Close inventory panel"
                    className="p-2 hover:bg-white/5 dark:hover:bg-white/10 rounded-full text-gray-400 dark:text-gray-500 hover:text-white dark:hover:text-white transition-colors"
                    data-testid="close-inventory-btn"
                  >
                    <ChevronDown className="w-5 h-5" />
                  </motion.button>
                </div>
              </motion.div>

              {/* Content Area */}
              <div className="flex flex-1 overflow-hidden">

                {/* Sidebar: Categories */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{
                    opacity: 1,
                    x: 0,
                    transition: { delay: 0.15, duration: 0.25 }
                  }}
                  className="w-64 bg-black/20 dark:bg-black/40 backdrop-blur-sm border-r border-white/5 dark:border-white/[0.02] p-4 overflow-y-auto space-y-2"
                >
                  <motion.button
                    onClick={() => setActiveTab('all')}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold tracking-wide transition-all duration-200 flex items-center justify-between group ${activeTab === 'all'
                        ? 'bg-cyan-500/20 dark:bg-cyan-500/10 text-cyan-300 dark:text-cyan-200 border border-cyan-500/30 dark:border-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.1)]'
                        : 'text-gray-400 dark:text-gray-500 hover:bg-white/5 dark:hover:bg-white/10 hover:text-white'
                      }`}
                    data-testid="category-all-items-btn"
                  >
                    <span>ALL ITEMS</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${activeTab === 'all' ? 'bg-cyan-500/20 dark:bg-cyan-500/10' : 'bg-white/5 dark:bg-white/10'}`}>
                      {groups.reduce((sum, g) => sum + (g.items?.length || 0), 0)}
                    </span>
                  </motion.button>

                  <div className="h-[1px] bg-white/5 dark:bg-white/[0.02] my-2" />

                  {groups.map((group, index) => (
                    <motion.button
                      key={group.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{
                        opacity: 1,
                        x: 0,
                        transition: { delay: 0.2 + index * 0.03, duration: 0.2 }
                      }}
                      onClick={() => setActiveTab(group.id)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={`w-full text-left px-4 py-3 rounded-xl text-xs transition-all duration-200 flex items-center justify-between group ${activeTab === group.id
                          ? 'bg-white/10 dark:bg-white/5 text-white border border-white/20 dark:border-white/10'
                          : 'text-gray-500 dark:text-gray-600 hover:bg-white/5 dark:hover:bg-white/10 hover:text-gray-300 dark:hover:text-gray-400'
                        }`}
                      data-testid={`category-${group.id}-btn`}
                    >
                      <span className="font-medium truncate pr-2">{group.name}</span>
                      <span className="text-[10px] opacity-50">{group.items?.length || 0}</span>
                    </motion.button>
                  ))}
                </motion.div>

                {/* Main Grid */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{
                    opacity: 1,
                    transition: { delay: 0.2, duration: 0.3 }
                  }}
                  className="flex-1 p-6 overflow-y-auto bg-gradient-to-b from-transparent to-black/20 dark:to-black/40"
                >
                  {displayGroups.length === 0 ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{
                        opacity: 1,
                        scale: 1,
                        transition: { delay: 0.3, duration: 0.2 }
                      }}
                      className="h-full flex flex-col items-center justify-center text-gray-500 dark:text-gray-600 gap-3"
                    >
                      <Search className="w-8 h-8 opacity-20" />
                      <p className="text-sm">No items found in this category</p>
                    </motion.div>
                  ) : (
                    <div className="space-y-8">
                      {displayGroups.map((group, groupIndex) => (
                        <motion.div
                          key={group.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{
                            opacity: 1,
                            y: 0,
                            transition: {
                              delay: 0.25 + groupIndex * 0.05,
                              duration: 0.3,
                              ease: "easeOut"
                            }
                          }}
                        >
                          <div className="flex items-center gap-3 mb-4">
                            <h4 className="text-xs font-bold text-cyan-500/70 dark:text-cyan-400/60 uppercase tracking-widest">{group.name}</h4>
                            <div className="h-[1px] flex-1 bg-gradient-to-r from-cyan-500/20 dark:from-cyan-400/10 to-transparent" />
                          </div>

                          <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-3">
                            {(group.items || []).map((item: CollectionItem) => (
                              <SimpleCollectionItem
                                key={item.id}
                                item={item}
                                groupId={group.id}
                              />
                            ))}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

