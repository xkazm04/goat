"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Play } from "lucide-react";
import { useRouter } from "next/navigation";
import { useChallengeStore } from "@/stores/challenge-store";
import { useListStore } from "@/stores/use-list-store";
import { useChallengeEntries } from "@/hooks/use-challenges";
import { ChallengeModalHeader } from "./components/ChallengeModalHeader";
import { ChallengeModalStats } from "./components/ChallengeModalStats";
import { ChallengeModalEntries } from "./components/ChallengeModalEntries";
import { modalBackdropVariants, modalContentVariants } from "./shared/animations";

export function ChallengeModal() {
  const router = useRouter();
  const { selectedChallenge, isChallengeModalOpen, closeChallengeModal } = useChallengeStore();
  const { setCurrentList } = useListStore();

  const { data: entries = [] } = useChallengeEntries(selectedChallenge?.id || "", { limit: 10 });

  const handleStartChallenge = () => {
    if (!selectedChallenge) return;

    setCurrentList({
      id: selectedChallenge.list_id,
      title: selectedChallenge.title,
      category: selectedChallenge.category,
      subcategory: undefined,
      user_id: "",
      predefined: true,
      size: 10,
      time_period: undefined,
      created_at: selectedChallenge.created_at,
    });

    router.push(`/match-test?list=${selectedChallenge.list_id}&challenge=${selectedChallenge.id}`);
    closeChallengeModal();
  };

  if (!selectedChallenge) return null;

  const isActive = selectedChallenge.status === "active";
  const isScheduled = selectedChallenge.status === "scheduled";
  const hasEnded = selectedChallenge.end_date && new Date(selectedChallenge.end_date) < new Date();

  return (
    <AnimatePresence>
      {isChallengeModalOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            variants={modalBackdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={closeChallengeModal}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
            data-testid="challenge-modal-backdrop"
          />

          {/* Modal */}
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4 pointer-events-none">
            <motion.div
              variants={modalContentVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="relative w-full max-w-2xl pointer-events-auto overflow-hidden rounded-3xl"
              style={{
                background: `
                  linear-gradient(135deg,
                    rgba(15, 20, 35, 0.98) 0%,
                    rgba(25, 35, 55, 0.98) 50%,
                    rgba(15, 20, 35, 0.98) 100%
                  )
                `,
                boxShadow: `
                  0 25px 80px rgba(0, 0, 0, 0.6),
                  0 0 100px rgba(139, 92, 246, 0.08),
                  inset 0 1px 0 rgba(255, 255, 255, 0.05)
                `,
              }}
              data-testid="challenge-modal"
            >
              {/* Header */}
              <ChallengeModalHeader challenge={selectedChallenge} onClose={closeChallengeModal} />

              {/* Content */}
              <div className="p-6 space-y-6">
                <ChallengeModalStats challenge={selectedChallenge} />
                <ChallengeModalEntries entries={entries} />
              </div>

              {/* Footer */}
              <div
                className="p-6"
                style={{
                  background: "rgba(15, 20, 35, 0.5)",
                }}
              >
                <div
                  className="h-px mb-6"
                  style={{
                    background: "linear-gradient(90deg, transparent, rgba(139, 92, 246, 0.2), transparent)",
                  }}
                />

                <div className="flex items-center justify-between gap-4">
                  <button
                    onClick={closeChallengeModal}
                    className="px-5 py-2.5 text-sm font-medium text-slate-400 hover:text-white transition-colors"
                    data-testid="challenge-modal-cancel"
                  >
                    Cancel
                  </button>

                  <motion.button
                    onClick={handleStartChallenge}
                    disabled={!isActive || hasEnded}
                    className={`
                      flex items-center gap-2 px-6 py-3 text-sm font-semibold rounded-xl transition-all
                      ${
                        isActive && !hasEnded
                          ? "text-white"
                          : "text-slate-500 cursor-not-allowed"
                      }
                    `}
                    style={
                      isActive && !hasEnded
                        ? {
                            background: `linear-gradient(135deg, rgba(6, 182, 212, 0.9), rgba(59, 130, 246, 0.9))`,
                            boxShadow: `0 8px 30px rgba(6, 182, 212, 0.3)`,
                          }
                        : {
                            background: "rgba(51, 65, 85, 0.5)",
                          }
                    }
                    whileHover={isActive && !hasEnded ? { scale: 1.02, y: -2 } : {}}
                    whileTap={isActive && !hasEnded ? { scale: 0.98 } : {}}
                    data-testid="challenge-modal-start"
                  >
                    <Play className="w-4 h-4" />
                    {hasEnded ? "Challenge Ended" : isScheduled ? "Not Started Yet" : "Start Challenge"}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
