"use client";

import { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Crown, Star, Gamepad2, Trophy, ChevronRight, BarChart3, Settings } from "lucide-react";
import { FeedbackModal, FeedbackEmptyState } from "@/lib/feedback-pipeline";
import type { ComparisonModalProps } from "@/types/modal-props";
import { isComparisonModalOpen } from "@/types/modal-props";
import { useCriteriaStore } from "@/stores/criteria-store";
import { CriteriaProfileSelector, InputModeSelector } from "./components/CriteriaProfileSelector";
import { BulkCriteriaScoreInput } from "./components/CriteriaScoreInput";
import type { CriterionScore } from "@/lib/criteria/types";
import { cn } from "@/lib/utils";

const getItemIcon = (title: string) => {
  const lower = title.toLowerCase();
  if (lower.includes('game') || lower.includes('gta') || lower.includes('mario')) {
    return Gamepad2;
  }
  if (lower.includes('jordan') || lower.includes('lebron') || lower.includes('sport')) {
    return Trophy;
  }
  return Star;
};

type ViewMode = 'grid' | 'scoring';

export function ComparisonModal(props: ComparisonModalProps) {
  const { isOpen, onClose } = props;

  // Use type guard to safely access items when modal is open
  const items = isComparisonModalOpen(props) ? props.items : [];

  // Local state
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  // Criteria store
  const {
    activeProfileId,
    getActiveProfile,
    setItemScore,
    getItemScores,
    scoreInputMode,
    setScoreInputMode,
    getRankingSuggestions,
  } = useCriteriaStore();

  const activeProfile = getActiveProfile();

  // Get category from first item
  const category = items.length > 0 ? items[0].category : undefined;

  // Get scores for selected item
  const selectedItemScores = useMemo(() => {
    if (!selectedItemId) return {};
    const scores = getItemScores(selectedItemId);
    if (!scores) return {};
    return scores.scores.reduce((acc, s) => {
      acc[s.criterionId] = s;
      return acc;
    }, {} as Record<string, CriterionScore>);
  }, [selectedItemId, getItemScores]);

  // Get weighted scores for all items
  const itemWeightedScores = useMemo(() => {
    const scores: Record<string, number> = {};
    for (const item of items) {
      const itemScore = getItemScores(item.id);
      scores[item.id] = itemScore?.weightedScore ?? 0;
    }
    return scores;
  }, [items, getItemScores]);

  // Get ranking suggestions
  const suggestions = useMemo(() => {
    if (!activeProfileId || items.length === 0) return [];
    return getRankingSuggestions(items.map((i) => i.id));
  }, [activeProfileId, items, getRankingSuggestions]);

  // Handle score change
  const handleScoreChange = useCallback(
    (criterionId: string, score: number, note?: string) => {
      if (!selectedItemId) return;
      setItemScore(selectedItemId, criterionId, score, note);
    },
    [selectedItemId, setItemScore]
  );

  // Handle item selection for scoring
  const handleItemSelect = useCallback((itemId: string) => {
    setSelectedItemId(itemId);
    setViewMode('scoring');
  }, []);

  // Get selected item
  const selectedItem = useMemo(() => {
    if (!selectedItemId) return null;
    return items.find((i) => i.id === selectedItemId) ?? null;
  }, [selectedItemId, items]);

  return (
    <FeedbackModal
      isOpen={isOpen}
      onClose={onClose}
      title="Compare Legends"
      subtitle={`Side-by-side comparison of ${items.length} legendary items`}
      headerIcon={<Crown className="w-5 h-5 text-white" />}
      size="xl"
      data-testid="comparison-modal"
    >
      {items.length === 0 ? (
        <FeedbackEmptyState
          title="No Items to Compare"
          description="Right-click on items in the backlog and select 'Add to compare' to start comparing legends"
          icon="crown"
          size="lg"
          data-testid="comparison-empty-state"
        />
      ) : (
        <div className="space-y-4">
          {/* Toolbar */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            {/* View Mode Toggle */}
            <div className="flex items-center gap-2" role="group" aria-label="View mode">
              <button
                className={cn(
                  "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                  viewMode === 'grid'
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted hover:bg-muted/80"
                )}
                onClick={() => setViewMode('grid')}
                aria-pressed={viewMode === 'grid'}
              >
                Grid View
              </button>
              <button
                className={cn(
                  "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                  viewMode === 'scoring'
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted hover:bg-muted/80"
                )}
                onClick={() => setViewMode('scoring')}
                disabled={!activeProfile}
                aria-pressed={viewMode === 'scoring'}
              >
                <span className="flex items-center gap-1">
                  <BarChart3 className="w-4 h-4" />
                  Score Items
                </span>
              </button>
            </div>

            {/* Profile Selector */}
            <div className="flex-1 max-w-xs">
              <CriteriaProfileSelector
                category={category}
                showActions={true}
              />
            </div>

            {/* Settings */}
            <button
              className="p-2 rounded-lg hover:bg-muted transition-colors"
              onClick={() => setShowSettings(!showSettings)}
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>

          {/* Settings Panel */}
          <AnimatePresence>
            {showSettings && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
                  <span className="text-sm text-muted-foreground">Input Mode:</span>
                  <InputModeSelector
                    value={scoreInputMode}
                    onChange={setScoreInputMode}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Content */}
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" data-testid="comparison-items-grid">
              {items.map((item, index) => {
                const IconComponent = getItemIcon(item.title);
                const weightedScore = itemWeightedScores[item.id] ?? 0;
                const suggestion = suggestions.find((s) => s.itemId === item.id);

                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="relative cursor-pointer"
                    data-testid={`comparison-item-${index}`}
                    onClick={() => handleItemSelect(item.id)}
                  >
                    <div
                      className="aspect-[3/4] rounded-2xl border-2 overflow-hidden transition-all duration-300 group hover:scale-[1.02]"
                      style={{
                        background: `
                          linear-gradient(135deg,
                            rgba(30, 41, 59, 0.9) 0%,
                            rgba(51, 65, 85, 0.95) 100%
                          )
                        `,
                        border: '2px solid rgba(71, 85, 105, 0.3)',
                        boxShadow: '0 8px 25px rgba(0, 0, 0, 0.3)'
                      }}
                    >
                      {/* Content */}
                      <div className="h-full flex flex-col p-6">
                        {/* Icon */}
                        <div className="flex-1 flex items-center justify-center">
                          <div
                            className="w-20 h-20 rounded-full flex items-center justify-center mb-4"
                            style={{
                              background: `
                                linear-gradient(135deg,
                                  #4c1d95 0%,
                                  #7c3aed 50%,
                                  #3b82f6 100%
                                )
                              `,
                              boxShadow: '0 8px 25px rgba(124, 58, 237, 0.4)'
                            }}
                          >
                            <IconComponent className="w-10 h-10 text-white" />
                          </div>
                        </div>

                        {/* Title */}
                        <div className="text-center">
                          <h3 className="text-lg font-bold text-slate-200 leading-tight">
                            {item.title}
                          </h3>
                          {item.tags && item.tags.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-2 justify-center">
                              {item.tags.slice(0, 3).map((tag, tagIndex) => (
                                <span
                                  key={tagIndex}
                                  className="px-2 py-1 text-xs font-medium rounded-lg text-blue-300"
                                  style={{
                                    background: 'rgba(59, 130, 246, 0.2)',
                                    border: '1px solid rgba(59, 130, 246, 0.3)'
                                  }}
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Weighted Score (if profile selected) */}
                          {activeProfile && weightedScore > 0 && (
                            <div className="mt-3">
                              <div className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-green-500/20">
                                <BarChart3 className="w-3 h-3 text-green-400" />
                                <span className="text-sm font-bold text-green-400">
                                  {weightedScore.toFixed(1)}
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Suggested Rank */}
                          {suggestion && suggestion.confidence > 0.5 && (
                            <div className="mt-2 text-xs text-muted-foreground">
                              Suggested: #{suggestion.suggestedPosition}
                            </div>
                          )}
                        </div>

                        {/* Score Button */}
                        {activeProfile && (
                          <button
                            className="mt-4 flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-primary/20 text-primary hover:bg-primary/30 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleItemSelect(item.id);
                            }}
                          >
                            <span className="text-sm font-medium">Score</span>
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      {/* Position indicator */}
                      <div
                        className="absolute top-4 left-4 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                        style={{
                          background: 'rgba(59, 130, 246, 0.8)',
                          color: 'white'
                        }}
                      >
                        {index + 1}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            /* Scoring View */
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Item List */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground mb-2">
                  Select an item to score
                </h3>
                {items.map((item, index) => {
                  const isSelected = selectedItemId === item.id;
                  const weightedScore = itemWeightedScores[item.id] ?? 0;

                  return (
                    <button
                      key={item.id}
                      className={cn(
                        "w-full flex items-center justify-between px-4 py-3 rounded-lg",
                        "border transition-colors",
                        isSelected
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/50"
                      )}
                      onClick={() => setSelectedItemId(item.id)}
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-sm font-bold flex items-center justify-center">
                          {index + 1}
                        </span>
                        <span className="font-medium">{item.title}</span>
                      </div>
                      {weightedScore > 0 && (
                        <span className="text-sm font-bold text-green-500">
                          {weightedScore.toFixed(1)}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Scoring Panel */}
              <div>
                {selectedItem && activeProfile ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">
                        Scoring: {selectedItem.title}
                      </h3>
                      {itemWeightedScores[selectedItem.id] > 0 && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">
                            Weighted Score:
                          </span>
                          <span className="text-lg font-bold text-green-500">
                            {itemWeightedScores[selectedItem.id].toFixed(1)}
                          </span>
                        </div>
                      )}
                    </div>

                    <BulkCriteriaScoreInput
                      criteria={activeProfile.criteria}
                      scores={selectedItemScores}
                      inputMode={scoreInputMode}
                      onScoreChange={handleScoreChange}
                      compact={false}
                    />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full py-12 text-center">
                    {!activeProfile ? (
                      <>
                        <BarChart3 className="w-12 h-12 text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">
                          Select a criteria profile above to start scoring items
                        </p>
                      </>
                    ) : (
                      <>
                        <ChevronRight className="w-12 h-12 text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">
                          Select an item from the list to score it
                        </p>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Ranking Suggestions Summary */}
          {activeProfile && suggestions.length > 0 && suggestions.some(s => s.confidence > 0.5) && (
            <div className="mt-6 p-4 rounded-lg bg-muted/50 border border-border">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Suggested Rankings (based on criteria scores)
              </h4>
              <div className="flex flex-wrap gap-2">
                {suggestions
                  .filter(s => s.confidence > 0.5)
                  .sort((a, b) => a.suggestedPosition - b.suggestedPosition)
                  .map((suggestion, index) => {
                    const item = items.find(i => i.id === suggestion.itemId);
                    if (!item) return null;
                    return (
                      <span
                        key={suggestion.itemId}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-background border border-border text-sm"
                      >
                        <span className="font-bold text-primary">#{suggestion.suggestedPosition}</span>
                        <span>{item.title}</span>
                        <span className="text-muted-foreground">({suggestion.weightedScore.toFixed(1)})</span>
                      </span>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      )}
    </FeedbackModal>
  );
}
