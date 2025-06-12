"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BacklogGroups } from "./BacklogGroups";

interface BacklogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function BacklogModal({ isOpen, onClose }: BacklogModalProps) {
  const [expandedViewMode, setExpandedViewMode] = useState<'grid' | 'list'>('grid');

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={onClose}
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2, ease: [0.04, 0.62, 0.23, 0.98] }}
            className="fixed inset-4 z-50 overflow-hidden rounded-2xl"
            style={{
              background: `
                linear-gradient(135deg, 
                  rgba(15, 23, 42, 0.98) 0%,
                  rgba(30, 41, 59, 0.99) 50%,
                  rgba(51, 65, 85, 0.98) 100%
                )
              `,
              border: '2px solid rgba(71, 85, 105, 0.3)',
              boxShadow: `
                0 25px 50px -12px rgba(0, 0, 0, 0.8),
                inset 0 1px 0 rgba(148, 163, 184, 0.1)
              `
            }}
          >
            {/* Content */}
            <div className="h-full overflow-hidden">
              <BacklogGroups 
                className="h-full"
                isModal={true}
                expandedViewMode={expandedViewMode}
                onCloseModal={onClose}
              />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}