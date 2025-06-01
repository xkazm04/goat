"use client";

import { BacklogGroupType } from "@/app/types/match";
import { BacklogItem } from "./BacklogItem";
import { useMatchStore } from "@/app/stores/match-store";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Gamepad2 } from "lucide-react";
import { useMemo } from "react";

interface BacklogGroupProps {
  group: BacklogGroupType;
}

const getGroupIcon = (title: string) => {
  const lower = title.toLowerCase();
  if (lower.includes('game') || lower.includes('video')) {
    return Gamepad2;
  }
  return Users;
};

export function BacklogGroup({ group }: BacklogGroupProps) {
  const { toggleBacklogGroup } = useMatchStore();
  const availableItems = useMemo(() => 
    group.items.filter(item => !item.matched), 
    [group.items]
  );
  
  const IconComponent = getGroupIcon(group.title);
  
  const handleToggle = () => {
    toggleBacklogGroup(group.id);
  };

  return (
    <div 
      className="rounded-xl border overflow-hidden"
    >
      {/* Header */}
      <button
        onClick={handleToggle}
        className="w-full p-4 flex items-center gap-3 text-left transition-colors hover:bg-opacity-80"
      >
        <div 
          className="p-2 rounded-lg"
        >
          <IconComponent 
            className="w-4 h-4" 
          />
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 
            className="font-semibold text-sm truncate"
          >
            {group.title}
          </h3>
          <p 
            className="text-xs mt-0.5"
          >
            {availableItems.length} available
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <div 
            className="px-2 py-1 rounded text-xs font-medium"
          >
            {availableItems.length}
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
            <div className="p-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <AnimatePresence mode="popLayout">
                  {availableItems.map((item, index) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ 
                        duration: 0.2, 
                        delay: index * 0.03,
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
                  className="text-center py-8"
                >
                  <div 
                    className="text-sm"
                  >
                    All items from this group are ranked
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}