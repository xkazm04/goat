"use client";

import { useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { CompositionModalHeader } from "@/components/app/modals/composition/CompositionModalHeader";
import { CompositionModalLeftContent } from "@/components/app/modals/composition/CompositionModalLeftContent";
import { CompositionModalRightContent } from "@/components/app/modals/composition/CompositionModalRightContent";
import { useCreateListWithUser } from "@/hooks/use-top-lists";
import { useTempUser } from "@/hooks/use-temp-user";
import { useListStore } from "@/stores/use-list-store";
import { CompositionResult, mapCompositionToCreateListRequest } from "@/types/composition-to-api";
import { toast } from "@/hooks/use-toast";
import ListCreateButton from "./ListCreateButton";
import { useComposition } from "@/hooks/use-composition";

interface CompositionModalProps {
  initialAuthor?: string;
  initialComment?: string;
  onSuccess?: (result: CompositionResult) => void;
}

export interface CompositionData {
  selectedCategory: string;
  selectedSubcategory?: string;
  timePeriod: "all-time" | "decade" | "year";
  selectedDecade?: string;
  selectedYear?: string;
  hierarchy: number;
  isPredefined: boolean;
  title?: string;
  description?: string;
  color: {
    primary: string;
    secondary: string;
    accent: string;
  };
}

// Default color constant - defined outside component to prevent reference changes
const DEFAULT_COLOR = {
  primary: "#f59e0b",
  secondary: "#d97706",
  accent: "#fbbf24"
} as const;

// Helper function to determine if category has subcategories
const getInitialSubcategory = (category: string, providedSubcategory?: string): string | undefined => {
  switch (category.toLowerCase()) {
    case 'sports':
      return providedSubcategory || 'Basketball'; // Sports has subcategories
    case 'music':
    case 'games':
    case 'stories':
      return undefined; // These categories don't use subcategories
    default:
      return providedSubcategory;
  }
};

export function CompositionModal({
  initialAuthor = "You",
  initialComment = "Build your ultimate ranking",
  onSuccess
}: CompositionModalProps) {
  const router = useRouter();
  const { tempUserId, isLoaded } = useTempUser();
  const { setCurrentList } = useListStore();
  const createListMutation = useCreateListWithUser();

  // Use global composition store
  const {
    isOpen,
    isExpanded,
    formData: compositionData,
    closeComposition,
    toggleExpanded,
    updateFormData
  } = useComposition();

  // Enhanced category change handler that clears subcategory appropriately
  const handleCategoryChange = (category: string) => {
    const subcategory = getInitialSubcategory(category);
    updateFormData({
      selectedCategory: category,
      selectedSubcategory: subcategory,
      isPredefined: false
    });
  };

  const handleClose = () => {
    if (!createListMutation.isPending) {
      closeComposition();
    }
  };

  // Handle predefined list creation (quick path)
  const handleCreatePredefined = async () => {
    if (!isLoaded || !tempUserId) {
      toast({
        title: "Not Ready",
        description: "Please wait while we prepare your session...",
      });
      return;
    }

    try {
      const createListRequest = mapCompositionToCreateListRequest(compositionData, tempUserId);
      console.log("Creating predefined list:", createListRequest);
      
      const result = await createListMutation.mutateAsync(createListRequest);
      
      // Create enhanced list data with metadata
      const enhancedListData: any = {
        ...result.list,
        metadata: {
          size: compositionData.hierarchy,
          selectedCategory: compositionData.selectedCategory,
          selectedSubcategory: compositionData.selectedSubcategory, // This will be undefined for Games/Music
          timePeriod: compositionData.timePeriod,
          selectedDecade: compositionData.selectedDecade ? parseInt(compositionData.selectedDecade) : undefined,
          selectedYear: compositionData.selectedYear ? parseInt(compositionData.selectedYear) : undefined,
          color: compositionData.color
        }
      };

      // Set the list in local state immediately to prevent race condition
      setCurrentList(enhancedListData);

      toast({
        title: "List Created! 🎉",
        description: `"${result.list.title}" is ready for ranking!`,
      });

      const compositionResult: CompositionResult = {
        success: true,
        listId: result.list.id,
        message: `Successfully created "${result.list.title}"!`,
        redirectUrl: `/match-test?list=${result.list.id}`
      };
      
      onSuccess?.(compositionResult);
      closeComposition();

      // Navigate to match-test page with the list
      router.push(`/match-test?list=${result.list.id}`);

    } catch (error) {
      console.error("Error creating predefined list:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to create list";
      
      toast({
        title: "Creation Failed",
        description: errorMessage,
      });
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
            data-testid="composition-modal-backdrop"
          >
            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", duration: 0.3 }}
              className={`w-full max-h-[90vh] overflow-hidden ${
                isExpanded ? 'max-w-6xl' : 'max-w-4xl'
              }`}
              onClick={(e) => e.stopPropagation()}
              data-testid="composition-modal-container"
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
                {/* Header */}
                <CompositionModalHeader
                  setIsExpanded={(expanded) => toggleExpanded(expanded)}
                  onClose={handleClose}
                  compositionData={compositionData}
                  title="Create Your Ranking"
                  author={initialAuthor}
                  comment={initialComment}
                  hierarchy={`Top ${compositionData.hierarchy}`}
                  color={compositionData.color}
                  isExpanded={isExpanded}
                  onCreatePredefined={handleCreatePredefined}
                  isCreating={createListMutation.isPending}
                />

                {/* Content - Only show when expanded (custom mode) */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="relative grid grid-cols-1 lg:grid-cols-2 min-h-[600px]"
                    >
                      {/* Left Half - Configuration */}
                      <CompositionModalLeftContent
                        selectedCategory={compositionData.selectedCategory}
                        setSelectedCategory={handleCategoryChange}
                        selectedSubcategory={compositionData.selectedSubcategory}
                        setSelectedSubcategory={(subcategory) => {
                          updateFormData({ selectedSubcategory: subcategory, isPredefined: false });
                        }}
                        timePeriod={compositionData.timePeriod}
                        setTimePeriod={(period) => {
                          updateFormData({ timePeriod: period, isPredefined: false });
                        }}
                        selectedDecade={compositionData.selectedDecade ? parseInt(compositionData.selectedDecade) : 2020}
                        setSelectedDecade={(decade: number) => {
                          updateFormData({ selectedDecade: decade.toString(), isPredefined: false });
                        }}
                        selectedYear={compositionData.selectedYear ? parseInt(compositionData.selectedYear) : 2024}
                        setSelectedYear={(year: number) => {
                          updateFormData({ selectedYear: year.toString(), isPredefined: false });
                        }}
                        hierarchy={`Top ${compositionData.hierarchy}`}
                        setHierarchy={(hierarchy: string) => {
                          updateFormData({ hierarchy: parseInt(hierarchy.replace("Top ", "")), isPredefined: false });
                        }}
                        customName={compositionData.title || ""}
                        setCustomName={(name) => {
                          updateFormData({ title: name, isPredefined: false });
                        }}
                        color={compositionData.color}
                      />
                      
                      {/* Create Button - For custom mode */}
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
                        selectedDecade={compositionData.selectedDecade ? parseInt(compositionData.selectedDecade) : 2020}
                        selectedYear={compositionData.selectedYear ? parseInt(compositionData.selectedYear) : 2024}
                        hierarchy={`Top ${compositionData.hierarchy}`}
                        customName={compositionData.title || ""}
                        color={compositionData.color}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}