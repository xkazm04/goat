"use client";

import { motion } from "framer-motion";
import { Crown, Star, Gamepad2, Trophy } from "lucide-react";
import { FeedbackModal, FeedbackEmptyState } from "@/lib/feedback-pipeline";
import type { ComparisonModalProps } from "@/types/modal-props";
import { isComparisonModalOpen } from "@/types/modal-props";

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

export function ComparisonModal(props: ComparisonModalProps) {
  const { isOpen, onClose } = props;

  // Use type guard to safely access items when modal is open
  const items = isComparisonModalOpen(props) ? props.items : [];
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" data-testid="comparison-items-grid">
                      {items.map((item, index) => {
                        const IconComponent = getItemIcon(item.title);

                        return (
                          <motion.div
                            key={item.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="relative"
                            data-testid={`comparison-item-${index}`}
                          >
                            <div
                              className="aspect-[3/4] rounded-2xl border-2 overflow-hidden transition-all duration-300 group"
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
                                </div>
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
      )}
    </FeedbackModal>
  );
}