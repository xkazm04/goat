"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { MatchGrid } from "../MatchGrid";
import { CollectionPanel } from "../../Collection/components/CollectionPanel";
import { ComparisonModal } from "@/components/app/modals/comparison/ComparisonModal";
import MatchContainerHeader from "./MatchContainerHeader";

const MatchContainerContent = () => {
  const [isComparisonModalOpen, setIsComparisonModalOpen] = useState(false)

  return (
    <div className="p-6 relative" data-testid="match-container-content">
      {/* Header */}
      <MatchContainerHeader
        setIsComparisonModalOpen={setIsComparisonModalOpen}
      />

      {/* Content Area */}
      <div className="flex gap-6 relative" data-testid="match-content-area">
        {/* Main Grid Area */}
        <motion.div
          className="flex-1"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          layout
          data-testid="match-grid-area"
        >
          <MatchGrid />
        </motion.div>

        {/* Desktop Sidebar (2XL+ screens only) */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="w-96 fixed right-0 2xl:relative"
            data-testid="collection-sidebar"
          >
            <CollectionPanel />
          </motion.div>

      {/* Comparison Modal */}
      <ComparisonModal
        isOpen={isComparisonModalOpen}
        onClose={() => setIsComparisonModalOpen(false)}
      />
      </div>
    </div>
  );
};

export default MatchContainerContent;