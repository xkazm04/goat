"use client";

import { BacklogGroupType } from "@/app/types/match";
import { BacklogItem } from "./BacklogItem";
import { AddItemPlaceholder } from "./AddItemPlaceholder";
import { AddItemModal } from "./AddItemModal";
import { useItemStore } from "@/app/stores/item-store";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Gamepad2, ChevronDown, ChevronRight, Database, Sparkles, Trophy, Music, Film } from "lucide-react";
import { useMemo, useState } from "react";

interface BacklogGroupProps {
  group: BacklogGroupType;
}

const getGroupIcon = (title: string) => {
  const lower = title.toLowerCase();
  if (lower.includes('game') || lower.includes('video')) {
    return Gamepad2;
  }
  if (lower.includes('basketball') || lower.includes('soccer') || lower.includes('hockey')) {
    return Trophy;
  }
  if (lower.includes('music') || lower.includes('rock') || lower.includes('artist')) {
    return Music;
  }
  if (lower.includes('movie') || lower.includes('film')) {
    return Film;
  }
  return Users;
};

export function BacklogGroup({ group }: BacklogGroupProps) {
  const { toggleBacklogGroup, addItemToGroup } = useItemStore();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  
  const availableItems = useMemo(() => 
    group.items.filter(item => !item.matched), 
    [group.items]
  );
  
  const IconComponent = getGroupIcon(group.title);
  
  const handleToggle = () => {
    toggleBacklogGroup(group.id);
  };

  const handleAddItem = async (title: string) => {
    await addItemToGroup(group.id, title);
  };

  // Check if this group came from database (has proper IDs)
  const isDatabaseGroup = group.items.some(item => 
    item.id && item.id.length > 10 && !item.id.startsWith('item-')
  );

  return (
    <>
      <div 
        className="rounded-xl border overflow-hidden"
        style={{
          background: `
            linear-gradient(135deg, 
              rgba(30, 41, 59, 0.8) 0%,
              rgba(51, 65, 85, 0.9) 100%
            )
          `,
          border: '1px solid rgba(71, 85, 105, 0.4)'
        }}
      >
        {/* Header */}
        <button
          onClick={handleToggle}
          className="w-full p-4 flex items-center gap-3 text-left transition-colors hover:bg-slate-700/30"
        >
          <div 
            className="p-2 rounded-lg"
            style={{
              background: isDatabaseGroup ? 'rgba(34, 197, 94, 0.2)' : 'rgba(59, 130, 246, 0.2)',
              color: isDatabaseGroup ? '#4ade80' : '#93c5fd'
            }}
          >
            {isDatabaseGroup ? (
              <Database className="w-4 h-4" />
            ) : (
              <IconComponent className="w-4 h-4" />
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-sm truncate text-slate-200">
                {group.title}
              </h3>
              {isDatabaseGroup && (
                <div className="flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-green-400" />
                  <span className="text-xs text-green-400 font-medium">Live</span>
                </div>
              )}
            </div>
            <p className="text-xs text-slate-400">
              {availableItems.length} available
              {isDatabaseGroup && (
                <span className="ml-2 text-green-400">• From database</span>
              )}
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <div 
              className="px-2 py-1 rounded text-xs font-medium"
              style={{
                background: isDatabaseGroup ? 'rgba(34, 197, 94, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                color: isDatabaseGroup ? '#4ade80' : '#60a5fa'
              }}
            >
              {availableItems.length}
            </div>
            
            {/* Expand/Collapse Indicator */}
            <div className="text-slate-400 group-hover:text-slate-300 transition-colors">
              {group.isOpen ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </div>
          </div>
        </button>
        
        {/* Items Grid */}
        <AnimatePresence>
          {group.isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div 
                className="p-4"
                style={{
                  background: 'rgba(15, 23, 42, 0.4)'
                }}
              >
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {/* Add Item Placeholder - only show for non-database groups */}
                  {!isDatabaseGroup && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.2 }}
                      layout
                    >
                      <AddItemPlaceholder onClick={() => setIsAddModalOpen(true)} />
                    </motion.div>
                  )}

                  {/* Existing Items */}
                  <AnimatePresence mode="popLayout">
                    {availableItems.map((item, index) => (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ 
                          duration: 0.2, 
                          delay: (isDatabaseGroup ? index : index + 1) * 0.03,
                          layout: { duration: 0.2 }
                        }}
                        layout
                      >
                        <BacklogItem item={item} />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
                
                {/* No items available state */}
                {availableItems.length === 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-4 mt-3"
                  >
                    <div className="text-sm text-slate-400">
                      {isDatabaseGroup 
                        ? "All items from this group are ranked"
                        : "No items in this group yet"
                      }
                    </div>
                    {!isDatabaseGroup && (
                      <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="mt-2 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        Add first item
                      </button>
                    )}
                  </motion.div>
                )}

                {/* Database group info */}
                {isDatabaseGroup && availableItems.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-slate-600/30">
                    <p className="text-xs text-green-400/80 text-center">
                      Items loaded from database • Updates automatically
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Add Item Modal - only for non-database groups */}
      {!isDatabaseGroup && (
        <AddItemModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onConfirm={handleAddItem}
          groupTitle={group.title}
        />
      )}
    </>
  );
}