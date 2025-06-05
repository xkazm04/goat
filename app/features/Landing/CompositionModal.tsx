"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CompositionModalHeader } from "../../components/modals/composition/CompositionModalHeader";
import { CompositionModalLeftContent } from "../../components/modals/composition/CompositionModalLeftContent";
import { CompositionModalRightContent } from "../../components/modals/composition/CompositionModalRightContent";
import { useCreateListWithUser } from "@/app/hooks/use-top-lists";
import { useTempUser } from "@/app/hooks/use-temp-user";
import { CompositionResult } from "@/app/types/composition-to-api";
import ListCreateButton from "./ListCreateButton";

interface CompositionModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCategory?: string;
  initialSubcategory?: string;
  initialTimePeriod?: "all-time" | "decade" | "year";
  initialHierarchy?: string;
  initialTitle?: string;
  initialAuthor?: string;
  initialComment?: string;
  initialColor?: {
    primary: string;
    secondary: string;
    accent: string;
  };
  onSuccess?: (result: CompositionResult) => void;
}

export interface CompositionData {
  selectedCategory: string;
  selectedSubcategory?: string;
  timePeriod: "all-time" | "decade" | "year";
  selectedDecade: number;
  selectedYear: number;
  hierarchy: string;
  isPredefined: boolean;
  title: string;
  color: {
    primary: string;
    secondary: string;
    accent: string;
  };
}

export function CompositionModal({ 
  isOpen, 
  onClose, 
  initialCategory = "Sports",
  initialSubcategory = "Basketball",
  initialTimePeriod = "all-time",
  initialHierarchy = "Top 50",
  initialTitle = "Create Your Ranking",
  initialAuthor = "You",
  initialComment = "Build your ultimate ranking",
  initialColor = {
    primary: "#f59e0b",
    secondary: "#d97706", 
    accent: "#fbbf24"
  },
  onSuccess
}: CompositionModalProps) {
 
  const { tempUserId } = useTempUser();  
  const [compositionData, setCompositionData] = useState<CompositionData>({
    selectedCategory: initialCategory,
    selectedSubcategory: initialSubcategory,
    timePeriod: initialTimePeriod,
    selectedDecade: 2020,
    selectedYear: 2024,
    hierarchy: initialHierarchy,
    isPredefined: true,
    title: "",
    color: initialColor
  });

  // Update composition data when props change (when different cards are clicked)
  useEffect(() => {
    setCompositionData(prev => ({
      ...prev,
      selectedCategory: initialCategory,
      selectedSubcategory: initialSubcategory,
      timePeriod: initialTimePeriod,
      hierarchy: initialHierarchy,
      color: initialColor,
      // Reset custom title when switching to a new predefined list
      title: "",
      isPredefined: true
    }));
  }, [initialCategory, initialSubcategory, initialTimePeriod, initialHierarchy, initialColor, isOpen]);

  const [isExpanded, setIsExpanded] = useState(false);
  const createListMutation = useCreateListWithUser();

  // State update helpers
  const updateCompositionData = (updates: Partial<CompositionData>) => {
    setCompositionData(prev => ({ ...prev, ...updates }));
  };

  const handleClose = () => {
    if (!createListMutation.isPending) {
      onClose();
    }
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
                  border: `2px solid ${compositionData.color.primary}40`,
                  boxShadow: `
                    0 25px 50px -12px rgba(0, 0, 0, 0.8),
                    0 0 0 1px rgba(148, 163, 184, 0.1),
                    0 0 30px ${compositionData.color.primary}20
                  `
                }}
              >
                {/* Header with dynamic content */}
                <CompositionModalHeader
                  setIsExpanded={setIsExpanded} 
                  onClose={handleClose}
                  compositionData={compositionData}
                  title={initialTitle}
                  author={initialAuthor}
                  comment={initialComment}
                />

                {/* Content */}
                {isExpanded && <>
                <div className="relative grid grid-cols-1 lg:grid-cols-2 min-h-[600px]">
                  {/* Left Half - Configuration */}
                  <CompositionModalLeftContent
                    selectedCategory={compositionData.selectedCategory}
                    setSelectedCategory={(category) => updateCompositionData({ selectedCategory: category })}
                    selectedSubcategory={compositionData.selectedSubcategory}
                    setSelectedSubcategory={(subcategory) => updateCompositionData({ selectedSubcategory: subcategory })}
                    timePeriod={compositionData.timePeriod}
                    setTimePeriod={(period) => updateCompositionData({ timePeriod: period })}
                    selectedDecade={compositionData.selectedDecade}
                    setSelectedDecade={(decade) => updateCompositionData({ selectedDecade: decade })}
                    selectedYear={compositionData.selectedYear}
                    setSelectedYear={(year) => updateCompositionData({ selectedYear: year })}
                    hierarchy={compositionData.hierarchy}
                    setHierarchy={(hierarchy) => updateCompositionData({ hierarchy })}
                    isPredefined={compositionData.isPredefined}
                    setIsPredefined={(predefined) => updateCompositionData({ isPredefined: predefined })}
                    customName={compositionData.title}
                    setCustomName={(name) => updateCompositionData({ title: name })}
                    color={compositionData.color}
                  />
                  
                  {/* Create Button */}
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
                    <ListCreateButton
                      compositionData={compositionData}
                      createListMutation={createListMutation}
                      onClose={handleClose}
                      onSuccess={onSuccess}
                      />
                  </div>

                  {/* Right Half - Preview & Actions */}
                  <CompositionModalRightContent
                    selectedCategory={compositionData.selectedCategory}
                    selectedSubcategory={compositionData.selectedSubcategory}
                    timePeriod={compositionData.timePeriod}
                    selectedDecade={compositionData.selectedDecade}
                    selectedYear={compositionData.selectedYear}
                    hierarchy={compositionData.hierarchy}
                    customName={compositionData.title}
                    color={compositionData.color}
                  />
                </div>
                </>}

                {/* Loading Overlay */}
                {createListMutation.isPending && (
                  <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-20">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                      <p className="text-white text-lg">Creating your list...</p>
                      <p className="text-white/70 text-sm mt-2">Setting up your ranking session</p>
                    </div>
                  </div>
                )}

              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}