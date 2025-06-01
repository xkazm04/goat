"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CompositionModalHeader } from "../../components/modals/composition/CompositionModalHeader";
import { CompositionModalLeftContent } from "../../components/modals/composition/CompositionModalLeftContent";
import { CompositionModalRightContent } from "../../components/modals/composition/CompositionModalRightContent";

interface CompositionModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCategory?: string;
  initialColor?: {
    primary: string;
    secondary: string;
    accent: string;
  };
}

export function CompositionModal({ 
  isOpen, 
  onClose, 
  initialCategory = "Sports",
  initialColor = {
    primary: "#f59e0b",
    secondary: "#d97706", 
    accent: "#fbbf24"
  }
}: CompositionModalProps) {
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [timePeriod, setTimePeriod] = useState<"all-time" | "decade" | "year">("all-time");
  const [selectedDecade, setSelectedDecade] = useState(2020);
  const [selectedYear, setSelectedYear] = useState(2024);
  const [hierarchy, setHierarchy] = useState("Top 50");

  const handleClose = () => {
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={handleClose}
          >
            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", duration: 0.3 }}
              className="w-full max-w-6xl max-h-[90vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className="rounded-3xl border-2 overflow-hidden"
                style={{
                  background: `
                    linear-gradient(135deg, 
                      rgba(15, 23, 42, 0.98) 0%,
                      rgba(30, 41, 59, 0.98) 25%,
                      rgba(51, 65, 85, 0.98) 50%,
                      rgba(30, 41, 59, 0.98) 75%,
                      rgba(15, 23, 42, 0.98) 100%
                    )
                  `,
                  border: `2px solid ${initialColor.primary}40`,
                  boxShadow: `
                    0 25px 50px -12px rgba(0, 0, 0, 0.8),
                    0 0 0 1px rgba(148, 163, 184, 0.1),
                    0 0 30px ${initialColor.primary}20
                  `
                }}
              >
                {/* Header */}
                <CompositionModalHeader 
                  onClose={handleClose}
                  color={initialColor}
                />

                {/* Content */}
                <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[600px]">
                  {/* Left Half - Configuration */}
                  <CompositionModalLeftContent
                    selectedCategory={selectedCategory}
                    setSelectedCategory={setSelectedCategory}
                    timePeriod={timePeriod}
                    setTimePeriod={setTimePeriod}
                    selectedDecade={selectedDecade}
                    setSelectedDecade={setSelectedDecade}
                    selectedYear={selectedYear}
                    setSelectedYear={setSelectedYear}
                    hierarchy={hierarchy}
                    setHierarchy={setHierarchy}
                    color={initialColor}
                  />

                  {/* Right Half - Preview & Actions */}
                  <CompositionModalRightContent
                    selectedCategory={selectedCategory}
                    timePeriod={timePeriod}
                    selectedDecade={selectedDecade}
                    selectedYear={selectedYear}
                    hierarchy={hierarchy}
                    color={initialColor}
                  />
                </div>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}