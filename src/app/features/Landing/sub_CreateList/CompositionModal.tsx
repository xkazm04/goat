"use client";

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
import ListCreateButton from "../ListCreateButton";
import { useComposition } from "@/hooks/use-composition";
import { modalBackdropVariants, modalContentVariants } from "../shared/animations";

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

// Helper to determine initial subcategory based on category
const getInitialSubcategory = (category: string, providedSubcategory?: string): string | undefined => {
  if (category.toLowerCase() === "sports") {
    return providedSubcategory || "Basketball";
  }
  return undefined; // Music, Games, Stories don't use subcategories
};

export function CompositionModal({
  initialAuthor = "You",
  initialComment = "Build your ultimate ranking",
  onSuccess,
}: CompositionModalProps) {
  const router = useRouter();
  const { isLoaded } = useTempUser();
  const { setCurrentList } = useListStore();
  const createListMutation = useCreateListWithUser();

  const {
    isOpen,
    isExpanded,
    formData: compositionData,
    closeComposition,
    toggleExpanded,
    updateFormData,
  } = useComposition();

  const handleCategoryChange = (category: string) => {
    updateFormData({
      selectedCategory: category,
      selectedSubcategory: getInitialSubcategory(category),
      isPredefined: false,
    });
  };

  const handleClose = () => {
    if (!createListMutation.isPending) {
      closeComposition();
    }
  };

  const handleCreatePredefined = async () => {
    if (!isLoaded) {
      toast({ title: "Not Ready", description: "Please wait while we prepare your session..." });
      return;
    }

    try {
      const createListRequest = mapCompositionToCreateListRequest(compositionData, "");
      const result = await createListMutation.mutateAsync(createListRequest);

      const enhancedListData = {
        ...result.list,
        metadata: {
          size: compositionData.hierarchy,
          selectedCategory: compositionData.selectedCategory,
          selectedSubcategory: compositionData.selectedSubcategory,
          timePeriod: compositionData.timePeriod,
          selectedDecade: compositionData.selectedDecade ? parseInt(compositionData.selectedDecade) : undefined,
          selectedYear: compositionData.selectedYear ? parseInt(compositionData.selectedYear) : undefined,
          color: compositionData.color,
        },
      };

      setCurrentList(enhancedListData);

      toast({ title: "List Created! 🎉", description: `"${result.list.title}" is ready for ranking!` });

      const compositionResult: CompositionResult = {
        success: true,
        listId: result.list.id,
        message: `Successfully created "${result.list.title}"!`,
        redirectUrl: `/match-test?list=${result.list.id}`,
      };

      onSuccess?.(compositionResult);
      closeComposition();
      router.push(`/match-test?list=${result.list.id}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to create list";
      toast({ title: "Creation Failed", description: errorMessage });
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          variants={modalBackdropVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={handleClose}
          data-testid="composition-modal-backdrop"
        >
          <motion.div
            variants={modalContentVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className={`w-full max-h-[90vh] overflow-hidden ${isExpanded ? "max-w-6xl" : "max-w-4xl"}`}
            onClick={(e) => e.stopPropagation()}
            data-testid="composition-modal-container"
          >
            <div
              className="rounded-3xl overflow-hidden"
              style={{
                background: `
                  linear-gradient(135deg,
                    rgba(15, 20, 35, 0.98) 0%,
                    rgba(25, 35, 55, 0.98) 50%,
                    rgba(15, 20, 35, 0.98) 100%
                  )
                `,
                boxShadow: `
                  0 30px 80px rgba(0, 0, 0, 0.6),
                  0 0 100px ${compositionData.color.primary}15,
                  inset 0 1px 0 rgba(255, 255, 255, 0.05)
                `,
              }}
            >
              {/* Header */}
              <CompositionModalHeader
                setIsExpanded={toggleExpanded}
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

              {/* Expanded content for custom mode */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="relative grid grid-cols-1 lg:grid-cols-2 min-h-[600px]"
                  >
                    {/* Left - Configuration */}
                    <CompositionModalLeftContent
                      selectedCategory={compositionData.selectedCategory}
                      setSelectedCategory={handleCategoryChange}
                      selectedSubcategory={compositionData.selectedSubcategory}
                      setSelectedSubcategory={(subcategory) =>
                        updateFormData({ selectedSubcategory: subcategory, isPredefined: false })
                      }
                      timePeriod={compositionData.timePeriod}
                      setTimePeriod={(period) => updateFormData({ timePeriod: period, isPredefined: false })}
                      selectedDecade={compositionData.selectedDecade ? parseInt(compositionData.selectedDecade) : 2020}
                      setSelectedDecade={(decade: number) =>
                        updateFormData({ selectedDecade: decade.toString(), isPredefined: false })
                      }
                      selectedYear={compositionData.selectedYear ? parseInt(compositionData.selectedYear) : 2024}
                      setSelectedYear={(year: number) =>
                        updateFormData({ selectedYear: year.toString(), isPredefined: false })
                      }
                      hierarchy={`Top ${compositionData.hierarchy}`}
                      setHierarchy={(hierarchy: string) =>
                        updateFormData({ hierarchy: parseInt(hierarchy.replace("Top ", "")), isPredefined: false })
                      }
                      customName={compositionData.title || ""}
                      setCustomName={(name) => updateFormData({ title: name, isPredefined: false })}
                      color={compositionData.color}
                    />

                    {/* Center - Create Button */}
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
                      <ListCreateButton
                        compositionData={compositionData}
                        createListMutation={createListMutation}
                        onClose={handleClose}
                        onSuccess={onSuccess}
                      />
                    </div>

                    {/* Right - Preview */}
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
      )}
    </AnimatePresence>
  );
}