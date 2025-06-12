"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { CompositionModalHeader } from "../../components/modals/composition/CompositionModalHeader";
import { CompositionModalLeftContent } from "../../components/modals/composition/CompositionModalLeftContent";
import { CompositionModalRightContent } from "../../components/modals/composition/CompositionModalRightContent";
import { useCreateListWithUser } from "@/app/hooks/use-top-lists";
import { useTempUser } from "@/app/hooks/use-temp-user";
import { useListStore } from "@/app/stores/use-list-store";
import { CompositionResult, mapCompositionToCreateListRequest } from "@/app/types/composition-to-api";
import { toast } from "@/app/hooks/use-toast";
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
  const router = useRouter();
  const { tempUserId, isLoaded } = useTempUser();
  const { setCurrentList } = useListStore();
  const createListMutation = useCreateListWithUser();
  
  const [compositionData, setCompositionData] = useState<CompositionData>({
    selectedCategory: initialCategory,
    selectedSubcategory: getInitialSubcategory(initialCategory, initialSubcategory),
    timePeriod: initialTimePeriod,
    selectedDecade: 2020,
    selectedYear: 2024,
    hierarchy: initialHierarchy,
    isPredefined: true,
    title: "",
    color: initialColor
  });

  const [isExpanded, setIsExpanded] = useState(false);

  // Update composition data when props change (when different cards are clicked)
  useEffect(() => {
    setCompositionData(prev => ({
      ...prev,
      selectedCategory: initialCategory,
      selectedSubcategory: getInitialSubcategory(initialCategory, initialSubcategory),
      timePeriod: initialTimePeriod,
      hierarchy: initialHierarchy,
      color: initialColor,
      title: "",
      isPredefined: true,
    }));
    setIsExpanded(false);
  }, [initialCategory, initialSubcategory, initialTimePeriod, initialHierarchy, initialColor, isOpen]);

  // State update helpers
  const updateCompositionData = (updates: Partial<CompositionData>) => {
    setCompositionData(prev => ({ ...prev, ...updates }));
  };

  // Enhanced category change handler that clears subcategory appropriately
  const handleCategoryChange = (category: string) => {
    const subcategory = getInitialSubcategory(category);
    updateCompositionData({ 
      selectedCategory: category,
      selectedSubcategory: subcategory,
      isPredefined: false 
    });
  };

  const handleClose = () => {
    if (!createListMutation.isPending) {
      onClose();
      setIsExpanded(false);
    }
  };

  // Handle predefined list creation (quick path)
  const handleCreatePredefined = async () => {
    if (!isLoaded || !tempUserId) {
      toast({
        title: "Not Ready",
        description: "Please wait while we prepare your session...",
        variant: "destructive",
      });
      return;
    }

    try {
      const createListRequest = mapCompositionToCreateListRequest(compositionData, tempUserId);
      console.log("Creating predefined list:", createListRequest);
      
      const result = await createListMutation.mutateAsync(createListRequest);
      
      // Create enhanced list data with metadata
      const enhancedListData = {
        ...result.list,
        metadata: {
          size: compositionData.hierarchy,
          selectedCategory: compositionData.selectedCategory,
          selectedSubcategory: compositionData.selectedSubcategory, // This will be undefined for Games/Music
          timePeriod: compositionData.timePeriod,
          selectedDecade: compositionData.selectedDecade,
          selectedYear: compositionData.selectedYear,
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
        redirectUrl: `/match?list=${result.list.id}`
      };
      
      onSuccess?.(compositionResult);
      onClose();

      // Navigate to match page with the list
      router.push(`/match?list=${result.list.id}`);

    } catch (error) {
      console.error("Error creating predefined list:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to create list";
      
      toast({
        title: "Creation Failed",
        description: errorMessage,
        variant: "destructive",
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
                  setIsExpanded={setIsExpanded} 
                  onClose={handleClose}
                  compositionData={compositionData}
                  title={initialTitle}
                  author={initialAuthor}
                  comment={initialComment}
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
                        setSelectedCategory={handleCategoryChange} // Use enhanced handler
                        selectedSubcategory={compositionData.selectedSubcategory}
                        setSelectedSubcategory={(subcategory) => {
                          updateCompositionData({ selectedSubcategory: subcategory });
                          updateCompositionData({ isPredefined: false });
                        }}
                        timePeriod={compositionData.timePeriod}
                        setTimePeriod={(period) => {
                          updateCompositionData({ timePeriod: period });
                          updateCompositionData({ isPredefined: false });
                        }}
                        selectedDecade={compositionData.selectedDecade}
                        setSelectedDecade={(decade) => {
                          updateCompositionData({ selectedDecade: decade });
                          updateCompositionData({ isPredefined: false });
                        }}
                        selectedYear={compositionData.selectedYear}
                        setSelectedYear={(year) => {
                          updateCompositionData({ selectedYear: year });
                          updateCompositionData({ isPredefined: false });
                        }}
                        hierarchy={compositionData.hierarchy}
                        setHierarchy={(hierarchy) => {
                          updateCompositionData({ hierarchy });
                          updateCompositionData({ isPredefined: false });
                        }}
                        isPredefined={compositionData.isPredefined}
                        setIsPredefined={(predefined) => updateCompositionData({ isPredefined: predefined })}
                        customName={compositionData.title}
                        setCustomName={(name) => {
                          updateCompositionData({ title: name });
                          updateCompositionData({ isPredefined: false });
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
                        selectedDecade={compositionData.selectedDecade}
                        selectedYear={compositionData.selectedYear}
                        hierarchy={compositionData.hierarchy}
                        customName={compositionData.title}
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