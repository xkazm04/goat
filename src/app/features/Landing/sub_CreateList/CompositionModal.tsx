"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { Copy, ArrowLeft, Share2, Check, Loader2 } from "lucide-react";
import { CompositionModalHeader } from "@/components/app/modals/composition/CompositionModalHeader";
import { CompositionModalLeftContent } from "@/components/app/modals/composition/CompositionModalLeftContent";
import { CompositionModalRightContent } from "@/components/app/modals/composition/CompositionModalRightContent";
import { useCreateListWithUser } from "@/hooks/use-top-lists";
import { useTempUser } from "@/hooks/use-temp-user";
import { useListStore } from "@/stores/use-list-store";
import { toast } from "@/hooks/use-toast";
import ListCreateButton from "../ListCreateButton";
import { useComposition } from "@/hooks/use-composition";
import { modalBackdropVariants, modalContentVariants } from "../shared/animations";
import { getInitialSubcategory } from "@/lib/config/category-config";
import { CreationStep } from "./components/CreationProgressIndicator";
import { TemplateGallery } from "./components/TemplateGallery";
import { CriteriaTemplateSection } from "./components/CriteriaTemplateSection";
import { ListTemplate } from "@/types/templates";
import { useCreateBlueprint, copyBlueprintShareUrl } from "@/hooks/use-blueprints";
import { CompositionResult } from "@/types/composition-to-api";
import {
  listIntentToMetadata,
  listIntentToBlueprintRequest,
} from "@/types/list-intent-transformers";
import { ListIntent } from "@/types/list-intent";
import { listCreationService, CreationStep as ServiceCreationStep } from "@/services/list-creation-service";

interface CompositionModalProps {
  initialAuthor?: string;
  initialComment?: string;
  onSuccess?: (result: CompositionResult) => void;
}

// Re-export for backwards compatibility - prefer importing ListIntent from @/types/list-intent
export type { ListIntent as CompositionData } from "@/types/list-intent";

export function CompositionModal({
  initialAuthor = "You",
  initialComment = "Build your ultimate ranking",
  onSuccess,
}: CompositionModalProps) {
  const router = useRouter();
  const { isLoaded, tempUserId } = useTempUser();
  const { setCurrentList } = useListStore();
  const createListMutation = useCreateListWithUser();
  const createBlueprintMutation = useCreateBlueprint();
  const [creationStep, setCreationStep] = useState<CreationStep | null>(null);
  const [shareUrlCopied, setShareUrlCopied] = useState(false);

  const {
    isOpen,
    isExpanded,
    intent,
    mode,
    templateData,
    showTemplateGallery,
    closeComposition,
    toggleExpanded,
    updateIntent,
    setShowTemplateGallery,
    openWithTemplate,
    clearTemplateData,
  } = useComposition();

  const handleCategoryChange = (category: string) => {
    updateIntent({
      category,
      subcategory: getInitialSubcategory(category),
      criteriaProfileId: undefined, // Reset criteria when category changes
      isPredefined: false,
    });
  };

  const handleCriteriaProfileSelect = (profileId: string | null) => {
    updateIntent({
      criteriaProfileId: profileId || undefined,
      isPredefined: false,
    });
  };

  const handleClose = () => {
    if (!createListMutation.isPending && creationStep === null) {
      closeComposition();
    }
  };

  const handleSelectTemplate = (template: ListTemplate) => {
    openWithTemplate(template);
  };

  const handleBackFromTemplates = () => {
    setShowTemplateGallery(false);
  };

  const handleCreatePredefined = async () => {
    if (!isLoaded || !tempUserId) {
      toast({ title: "Not Ready", description: "Please wait while we prepare your session..." });
      return;
    }

    // Progress handler that maps service steps to component steps
    const onProgress = (step: ServiceCreationStep) => {
      setCreationStep(step === 'idle' ? null : step as CreationStep);
    };

    // Use the unified service for list creation
    const result = await listCreationService.createList(intent, {
      userId: tempUserId,
      onProgress,
    });

    if (result.success && result.list) {
      // Update store with enhanced list data
      const enhancedListData = {
        ...result.list,
        metadata: listIntentToMetadata(intent),
      };

      setCurrentList(enhancedListData);

      // Brief pause to show completion before navigating
      await new Promise(resolve => setTimeout(resolve, 300));

      toast({ title: "List Created!", description: `"${result.list.title}" is ready for ranking!` });

      const compositionResult: CompositionResult = {
        success: true,
        listId: result.listId,
        message: `Successfully created "${result.list.title}"!`,
        redirectUrl: `/match-test?list=${result.listId}`,
      };

      onSuccess?.(compositionResult);
      closeComposition();
      router.push(`/match-test?list=${result.listId}`);
    } else {
      setCreationStep(null);
      const errorMessage = result.error || "Failed to create list";
      toast({ title: "Creation Failed", description: errorMessage });
    }
  };

  const handleShareAsBlueprint = async () => {
    try {
      // Use ListIntent transformation pipeline
      const blueprintRequest = listIntentToBlueprintRequest(intent);
      const result = await createBlueprintMutation.mutateAsync(blueprintRequest);

      // Copy to clipboard
      const copied = await copyBlueprintShareUrl(result.blueprint);
      if (copied) {
        setShareUrlCopied(true);
        setTimeout(() => setShareUrlCopied(false), 3000);
        toast({
          title: "Blueprint Created!",
          description: "Share URL copied to clipboard. Anyone with this link can start with this configuration!",
        });
      } else {
        toast({
          title: "Blueprint Created!",
          description: `Share URL: ${result.shareUrl}`,
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to create blueprint";
      toast({ title: "Share Failed", description: errorMessage });
    }
  };

  // Determine modal title based on mode
  const getModalTitle = () => {
    if (showTemplateGallery) return "Start from Template";
    if (mode === 'template') return "Create from Template";
    if (mode === 'clone') return "Clone List";
    if (mode === 'blueprint') return "Create from Blueprint";
    return "Create Your Ranking";
  };

  // Determine comment based on mode
  const getComment = () => {
    if (mode === 'template' && templateData.template) {
      return `Based on "${templateData.template.title}"`;
    }
    if (mode === 'clone' && templateData.sourceList) {
      return `Cloning "${templateData.sourceList.title}"`;
    }
    return initialComment;
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
            className={`w-full max-h-[90vh] overflow-hidden ${isExpanded || showTemplateGallery ? "max-w-6xl" : "max-w-4xl"}`}
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
                  0 0 100px ${intent.color.primary}15,
                  inset 0 1px 0 rgba(255, 255, 255, 0.05)
                `,
              }}
            >
              {/* Header */}
              <CompositionModalHeader
                setIsExpanded={toggleExpanded}
                onClose={handleClose}
                intent={intent}
                title={getModalTitle()}
                author={initialAuthor}
                comment={getComment()}
                hierarchy={`Top ${intent.size}`}
                color={intent.color}
                isExpanded={isExpanded}
                onCreatePredefined={handleCreatePredefined}
                isCreating={createListMutation.isPending}
                creationStep={creationStep}
              />

              {/* Template Gallery Mode */}
              <AnimatePresence mode="wait">
                {showTemplateGallery && !isExpanded && (
                  <motion.div
                    key="template-gallery"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="p-6 max-h-[60vh] overflow-y-auto"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <motion.button
                        onClick={handleBackFromTemplates}
                        className="p-2 rounded-lg bg-slate-800/50 hover:bg-slate-700/50 transition-colors"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        data-testid="back-from-templates-btn"
                      >
                        <ArrowLeft className="w-4 h-4 text-slate-400" />
                      </motion.button>
                      <span className="text-sm text-slate-400">Back to quick create</span>
                    </div>
                    <TemplateGallery
                      onSelectTemplate={handleSelectTemplate}
                      onClose={() => setShowTemplateGallery(false)}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Quick Actions when not expanded and not in template gallery */}
              <AnimatePresence>
                {!isExpanded && !showTemplateGallery && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="px-8 py-6 border-t"
                    style={{ borderColor: `${intent.color.primary}20` }}
                  >
                    {/* Template/Clone/Blueprint mode indicator */}
                    {(mode === 'template' || mode === 'clone' || mode === 'blueprint') && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-4 p-3 rounded-xl flex items-center justify-between"
                        style={{
                          background: mode === 'blueprint'
                            ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(168, 85, 247, 0.05))'
                            : 'linear-gradient(135deg, rgba(6, 182, 212, 0.1), rgba(34, 211, 238, 0.05))',
                          border: mode === 'blueprint'
                            ? '1px solid rgba(139, 92, 246, 0.2)'
                            : '1px solid rgba(6, 182, 212, 0.2)',
                        }}
                        data-testid="template-mode-indicator"
                      >
                        <div className="flex items-center gap-3">
                          {mode === 'blueprint' ? (
                            <Share2 className="w-4 h-4 text-purple-400" />
                          ) : (
                            <Copy className="w-4 h-4 text-cyan-400" />
                          )}
                          <div>
                            <p className="text-sm font-medium text-white">
                              {mode === 'template' ? 'Using Template' : mode === 'clone' ? 'Cloning List' : 'From Blueprint'}
                            </p>
                            <p className="text-xs text-slate-400">
                              {templateData.template?.title || templateData.sourceList?.title || templateData.blueprint?.title}
                            </p>
                          </div>
                        </div>
                        <motion.button
                          onClick={clearTemplateData}
                          className="text-xs text-slate-400 hover:text-white transition-colors px-2 py-1"
                          whileHover={{ scale: 1.05 }}
                          data-testid="clear-template-btn"
                        >
                          Clear
                        </motion.button>
                      </motion.div>
                    )}

                    {/* Start from Template button */}
                    {mode === 'create' && (
                      <div className="flex flex-col gap-3">
                        <motion.button
                          onClick={() => setShowTemplateGallery(true)}
                          className="w-full flex items-center justify-center gap-3 py-4 rounded-xl transition-all duration-200"
                          style={{
                            background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.1), rgba(34, 211, 238, 0.05))',
                            border: '1px solid rgba(6, 182, 212, 0.2)',
                          }}
                          whileHover={{
                            scale: 1.01,
                            boxShadow: '0 4px 20px rgba(6, 182, 212, 0.2)'
                          }}
                          whileTap={{ scale: 0.99 }}
                          data-testid="start-from-template-btn"
                        >
                          <Copy className="w-5 h-5 text-cyan-400" />
                          <span className="text-sm font-medium text-white">Start from Template</span>
                          <span className="text-xs text-slate-400 ml-2">
                            Clone popular lists or use presets
                          </span>
                        </motion.button>

                        {/* Share as Blueprint button */}
                        <motion.button
                          onClick={handleShareAsBlueprint}
                          disabled={createBlueprintMutation.isPending}
                          className="w-full flex items-center justify-center gap-3 py-3 rounded-xl transition-all duration-200 disabled:opacity-50"
                          style={{
                            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(168, 85, 247, 0.05))',
                            border: '1px solid rgba(139, 92, 246, 0.2)',
                          }}
                          whileHover={{
                            scale: createBlueprintMutation.isPending ? 1 : 1.01,
                            boxShadow: '0 4px 20px rgba(139, 92, 246, 0.2)'
                          }}
                          whileTap={{ scale: 0.99 }}
                          data-testid="share-as-blueprint-btn"
                        >
                          {createBlueprintMutation.isPending ? (
                            <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
                          ) : shareUrlCopied ? (
                            <Check className="w-4 h-4 text-green-400" />
                          ) : (
                            <Share2 className="w-4 h-4 text-purple-400" />
                          )}
                          <span className="text-sm font-medium text-white">
                            {shareUrlCopied ? "Link Copied!" : "Share as Blueprint"}
                          </span>
                          <span className="text-xs text-slate-400 ml-2">
                            Create a shareable link
                          </span>
                        </motion.button>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Expanded content for custom mode */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="relative"
                  >
                    {/* Configuration Grid */}
                    <div className="relative grid grid-cols-1 lg:grid-cols-2 min-h-[600px]">
                      {/* Left - Configuration */}
                      <CompositionModalLeftContent
                        selectedCategory={intent.category}
                        setSelectedCategory={handleCategoryChange}
                        selectedSubcategory={intent.subcategory}
                        setSelectedSubcategory={(subcategory) =>
                          updateIntent({ subcategory, isPredefined: false })
                        }
                        timePeriod={intent.timePeriod}
                        setTimePeriod={(period) => updateIntent({ timePeriod: period, isPredefined: false })}
                        selectedDecade={intent.selectedDecade ? parseInt(intent.selectedDecade) : 2020}
                        setSelectedDecade={(decade: number) =>
                          updateIntent({ selectedDecade: decade.toString(), isPredefined: false })
                        }
                        selectedYear={intent.selectedYear ? parseInt(intent.selectedYear) : 2024}
                        setSelectedYear={(year: number) =>
                          updateIntent({ selectedYear: year.toString(), isPredefined: false })
                        }
                        hierarchy={`Top ${intent.size}`}
                        setHierarchy={(hierarchy: string) =>
                          updateIntent({ size: parseInt(hierarchy.replace("Top ", "")), isPredefined: false })
                        }
                        customName={intent.title || ""}
                        setCustomName={(name) => updateIntent({ title: name, isPredefined: false })}
                        color={intent.color}
                      />

                      {/* Center - Create Button */}
                      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
                        <ListCreateButton
                          intent={intent}
                          createListMutation={createListMutation}
                          onClose={handleClose}
                          onSuccess={onSuccess}
                        />
                      </div>

                      {/* Right - Preview */}
                      <CompositionModalRightContent
                        selectedCategory={intent.category}
                        selectedSubcategory={intent.subcategory}
                        timePeriod={intent.timePeriod}
                        selectedDecade={intent.selectedDecade ? parseInt(intent.selectedDecade) : 2020}
                        selectedYear={intent.selectedYear ? parseInt(intent.selectedYear) : 2024}
                        hierarchy={`Top ${intent.size}`}
                        customName={intent.title || ""}
                        color={intent.color}
                      />
                    </div>

                    {/* Criteria Template Section - Full width below grid */}
                    <div className="px-6 pb-6 border-t border-slate-700/50">
                      <div className="pt-4">
                        <CriteriaTemplateSection
                          category={intent.category}
                          selectedProfileId={intent.criteriaProfileId ?? null}
                          onProfileSelect={handleCriteriaProfileSelect}
                        />
                      </div>
                    </div>
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
