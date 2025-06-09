"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Archive } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { MatchGrid } from "./MatchGrid";
import { BacklogGroups } from "../Backlog/BacklogGroups";
import { ComparisonModal } from "@/app/components/modals/comparison/ComparisonModal";
import MatchContainerHeader from "./MatchContainerHeader";
import MatchContainerMobile from "./MatchContainerMobile";

const MatchContainerContent = () => {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isComparisonModalOpen, setIsComparisonModalOpen] = useState(false);

  const toggleMobileSidebar = () => {
    setIsMobileSidebarOpen(!isMobileSidebarOpen);
  };

  return (
    <div className="p-6 relative">
      {/* Header */}
      <MatchContainerHeader 
        setIsComparisonModalOpen={setIsComparisonModalOpen}
      />

      {/* Content Area */}
      <div className="flex gap-6 relative">
        {/* Main Grid Area */}
        <motion.div
          className="flex-1"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          layout
        >
          <MatchGrid />
        </motion.div>

        {/* Desktop Sidebar (2XL+ screens only) */}
        <div className="hidden 2xl:block">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="w-96"
          >
            <BacklogGroups />
          </motion.div>
        </div>

        {/* Mobile Sidebar Toggle Button (2XL- screens only) */}
        <div className="2xl:hidden">
          <motion.button
            onClick={toggleMobileSidebar}
            className="fixed top-6 right-6 p-3 rounded-xl transition-all duration-300 group z-40"
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
            title={isMobileSidebarOpen ? 'Hide Collection' : 'Show Collection'}
          >
            <div className="flex items-center gap-2">
              {isMobileSidebarOpen ? (
                <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-white transition-colors" />
              ) : (
                <>
                  <Archive className="w-5 h-5 text-slate-300 group-hover:text-white transition-colors" />
                  <ChevronLeft className="w-4 h-4 text-slate-400" />
                </>
              )}
            </div>
          </motion.button>
        </div>
      </div>

      {/* Mobile Fullscreen Sidebar (2XL- screens only) */}
      <AnimatePresence>
        {isMobileSidebarOpen && (
          <MatchContainerMobile
            toggleMobileSidebar={toggleMobileSidebar}
          />
        )}
      </AnimatePresence>

      {/* Comparison Modal */}
      <ComparisonModal
        isOpen={isComparisonModalOpen}
        onClose={() => setIsComparisonModalOpen(false)}
      />
    </div>
  );
};

export default MatchContainerContent;