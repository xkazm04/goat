"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { CompositionModalHeader } from "../../components/modals/composition/CompositionModalHeader";
import { CompositionModalLeftContent } from "../../components/modals/composition/CompositionModalLeftContent";
import { CompositionModalRightContent } from "../../components/modals/composition/CompositionModalRightContent";
import { ShimmerBtn } from "@/app/components/button/AnimButtons";
import { useCreateList } from "@/app/hooks/use-top-lists";
import { useTempUser } from "@/app/hooks/use-temp-user";
import { mapCompositionToCreateListRequest, CompositionResult } from "@/app/types/composition-to-api";
import { toast } from "@/app/hooks/use-toast";

interface CompositionModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCategory?: string;
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
  initialColor = {
    primary: "#f59e0b",
    secondary: "#d97706", 
    accent: "#fbbf24"
  },
  onSuccess
}: CompositionModalProps) {
  const router = useRouter();
  const { tempUserId, isLoaded } = useTempUser();
  const [isCreating, setIsCreating] = useState(false);
  
  const [compositionData, setCompositionData] = useState<CompositionData>({
    selectedCategory: initialCategory,
    selectedSubcategory: "Basketball",
    timePeriod: "all-time",
    selectedDecade: 2020,
    selectedYear: 2024,
    hierarchy: "Top 50",
    isPredefined: true,
    title: "",
    color: initialColor
  });

  const createListMutation = useCreateList({
    onSuccess: (data) => {
      setIsCreating(false);
      const result: CompositionResult = {
        success: true,
        listId: data.id,
        message: `Successfully created "${data.title}"!`,
        redirectUrl: `/lists/${data.id}`
      };
      
      toast({
        title: "List Created! 🎉",
        description: `"${data.title}" is ready for ranking!`,
      });

      // Call success callback if provided
      onSuccess?.(result);
      
      // Navigate to the new list
      router.push(`/lists/${data.id}`);
      
      // Close modal
      onClose();
    },
    onError: (error) => {
      setIsCreating(false);
      const result: CompositionResult = {
        success: false,
        message: `Failed to create list: ${error.message}`
      };
      
      toast({
        title: "Creation Failed",
        description: result.message,
        variant: "destructive",
      });

      onSuccess?.(result);
    }
  });

  // State update helpers
  const updateCompositionData = (updates: Partial<CompositionData>) => {
    setCompositionData(prev => ({ ...prev, ...updates }));
  };

  const handleClose = () => {
    if (!isCreating) {
      onClose();
    }
  };

  // Validation function
  const validateComposition = (): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (!compositionData.selectedCategory) {
      errors.push("Please select a category");
    }

    if (!compositionData.isPredefined && !compositionData.title.trim()) {
      errors.push("Please provide a title for your custom list");
    }

    if (compositionData.timePeriod === "decade" && !compositionData.selectedDecade) {
      errors.push("Please select a decade");
    }

    if (compositionData.timePeriod === "year" && !compositionData.selectedYear) {
      errors.push("Please select a year");
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  };

  // Main creation handler
  const handleCreate = async () => {
    if (!isLoaded || !tempUserId) {
      toast({
        title: "Not Ready",
        description: "Please wait while we prepare your session...",
        variant: "destructive",
      });
      return;
    }

    // Validate composition data
    const validation = validateComposition();
    if (!validation.isValid) {
      toast({
        title: "Validation Error",
        description: validation.errors.join(", "),
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);

    try {
      // Map composition data to API format
      const createListRequest = mapCompositionToCreateListRequest(compositionData, tempUserId);
      
      console.log("Creating list with data:", createListRequest);
      
      // Create the list
      createListMutation.mutate(createListRequest);
      
    } catch (error) {
      setIsCreating(false);
      console.error("Error preparing list creation:", error);
      toast({
        title: "Preparation Error",
        description: "Failed to prepare list data. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Function to prepare data for API integration (for debugging)
  const prepareApiData = () => {
    if (!tempUserId) return null;
    
    return mapCompositionToCreateListRequest(compositionData, tempUserId);
  };

  // Generate dynamic button text
  const getButtonText = () => {
    if (isCreating) return "CREATING...";
    if (!isLoaded) return "LOADING...";
    return "CREATE LIST";
  };

  const isButtonDisabled = isCreating || !isLoaded || !tempUserId;

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
                {/* Header */}
                <CompositionModalHeader 
                  onClose={handleClose}
                  color={compositionData.color}
                />

                {/* Content */}
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
                    <div 
                      onClick={isButtonDisabled ? undefined : handleCreate}
                      className={`cursor-pointer ${isButtonDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <ShimmerBtn 
                        label={getButtonText()}
                        disabled={isButtonDisabled}
                      />
                    </div>
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

                {/* Loading Overlay */}
                {isCreating && (
                  <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-20">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                      <p className="text-white text-lg">Creating your list...</p>
                    </div>
                  </div>
                )}

                {/* Debug Info (remove in production) */}
                {process.env.NODE_ENV === 'development' && (
                  <div className="absolute bottom-4 left-4 text-xs text-gray-400 max-w-xs">
                    <details>
                      <summary>Debug Info</summary>
                      <pre className="mt-2 text-xs overflow-auto max-h-32">
                        {JSON.stringify(prepareApiData(), null, 2)}
                      </pre>
                    </details>
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