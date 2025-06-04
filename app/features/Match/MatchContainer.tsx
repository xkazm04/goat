"use client";

import { useMatchStore } from "@/app/stores/match-store";
import { BacklogGroups } from "./BacklogGroups";
import { ComparisonModal } from "./ComparisonModal";
import { useEffect, useState } from "react";
import {  PanelRightOpen, PanelRightClose } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import MatchContainerContent from "./MatchContainerContent";

export function MatchContainer() {
  const { 
    setActiveItem, 
    handleDragEnd, 
    selectedBacklogItem, 
    backlogGroups,
    gridItems,
    assignItemToGrid,
    maxItems = 50,
    activeItem,
    compareList
  } = useMatchStore();
  

  const [isComparisonModalOpen, setIsComparisonModalOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);


  // Keyboard shortcuts for quick assignment
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      const keyNumber = parseInt(event.key);
      if (isNaN(keyNumber) || keyNumber < 0 || keyNumber > 9) return;
      
      // Convert key to position (1-9 maps to 0-8, 0 maps to 9)
      const position = keyNumber === 0 ? 9 : keyNumber - 1;
      if (!selectedBacklogItem || position >= maxItems) return;
      
      const selectedItem = backlogGroups
        .flatMap(group => group.items)
        .find(item => item.id === selectedBacklogItem);
      
      if (!selectedItem || selectedItem.matched) return;
      
      const targetGridItem = gridItems[position];
      if (!targetGridItem || !targetGridItem.matched) {
        assignItemToGrid(selectedItem, position);
        event.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [selectedBacklogItem, backlogGroups, gridItems, assignItemToGrid, maxItems]);


  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  return (
    <div className="min-h-screen relative">
      {/* Fixed Side Panel for XL+ screens */}
      <div className="hidden xl:block">
        <AnimatePresence>
          {!isSidebarCollapsed && (
            <motion.div
              initial={{ x: 400, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 400, opacity: 0 }}
              transition={{ 
                type: "spring", 
                stiffness: 300, 
                damping: 30 
              }}
              className="fixed right-0 top-0 h-full w-96 z-40"
              style={{
                background: `
                  linear-gradient(135deg, 
                    rgba(15, 23, 42, 0.95) 0%,
                    rgba(30, 41, 59, 0.98) 100%
                  )
                `,
                borderLeft: '1px solid rgba(71, 85, 105, 0.3)',
                boxShadow: '-10px 0 30px rgba(0, 0, 0, 0.3)'
              }}
            >
              <div className="h-full overflow-hidden">
                <BacklogGroups />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Fixed Toggle Button for XL+ screens */}
        <motion.button
          onClick={toggleSidebar}
          className="fixed right-4 top-4 p-3 rounded-xl transition-all duration-300 group z-50"
          style={{
            background: `linear-gradient(135deg, 
              rgba(30, 41, 59, 0.9) 0%,
              rgba(51, 65, 85, 0.95) 100%
            )`,
            border: '1px solid rgba(71, 85, 105, 0.4)',
            boxShadow: '0 4px 15px rgba(0, 0, 0, 0.3)',
            backdropFilter: 'blur(10px)'
          }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          title={isSidebarCollapsed ? 'Show Collection' : 'Hide Collection'}
        >
          <div className="flex items-center gap-2">
            {isSidebarCollapsed ? (
              <PanelRightOpen className="w-5 h-5 text-slate-300 group-hover:text-white transition-colors" />
            ) : (
              <PanelRightClose className="w-5 h-5 text-slate-300 group-hover:text-white transition-colors" />
            )}
          </div>
        </motion.button>
      </div>

      {/* Main Content */}
      <div 
        className={`transition-all duration-300 ${
          isSidebarCollapsed  
            ? 'mr-0' 
            : 'xl:mr-96'
        }`}
      >
        <div className="">
          <MatchContainerContent
            setActiveItem={setActiveItem}
            handleDragEnd={handleDragEnd}
            selectedBacklogItem={selectedBacklogItem}
            backlogGroups={backlogGroups}
            compareList={compareList}
            toggleSidebar={toggleSidebar}
            isSidebarCollapsed={isSidebarCollapsed}
            setIsComparisonModalOpen={setIsComparisonModalOpen}
          />

          {/* Comparison Modal */}
          <ComparisonModal
            isOpen={isComparisonModalOpen}
            onClose={() => setIsComparisonModalOpen(false)}
            items={compareList}
          />
        </div>
      </div>
    </div>
  );
}