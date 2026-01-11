"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Check, Loader2 } from "lucide-react";

export type CreationStep = "validating" | "creating" | "loading" | "complete";

interface CreationProgressIndicatorProps {
  currentStep: CreationStep;
  isVisible: boolean;
}

const STEPS: { id: CreationStep; label: string; description: string }[] = [
  { id: "validating", label: "Validating", description: "Checking your settings" },
  { id: "creating", label: "Creating List", description: "Setting up your ranking" },
  { id: "loading", label: "Loading Items", description: "Preparing your collection" },
  { id: "complete", label: "Complete", description: "Ready to rank!" },
];

function getStepIndex(step: CreationStep): number {
  return STEPS.findIndex((s) => s.id === step);
}

export function CreationProgressIndicator({
  currentStep,
  isVisible,
}: CreationProgressIndicatorProps) {
  const currentStepIndex = getStepIndex(currentStep);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col items-center gap-3"
          data-testid="creation-progress-indicator"
        >
          {/* Current step label */}
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="text-center"
          >
            <div className="text-sm font-semibold text-amber-400 uppercase tracking-wider">
              {STEPS[currentStepIndex]?.label}
            </div>
            <div className="text-xs text-slate-400 mt-0.5">
              {STEPS[currentStepIndex]?.description}
            </div>
          </motion.div>

          {/* Step indicators */}
          <div className="flex items-center gap-2" data-testid="creation-progress-steps">
            {STEPS.map((step, index) => {
              const isCompleted = index < currentStepIndex;
              const isCurrent = index === currentStepIndex;
              const isPending = index > currentStepIndex;

              return (
                <motion.div
                  key={step.id}
                  className="flex items-center"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: index * 0.1 }}
                >
                  {/* Step dot */}
                  <motion.div
                    className={`
                      w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                      transition-all duration-300
                      ${isCompleted
                        ? "bg-emerald-500 text-white"
                        : isCurrent
                          ? "bg-amber-500 text-white"
                          : "bg-slate-700 text-slate-500"
                      }
                    `}
                    animate={isCurrent ? { scale: [1, 1.1, 1] } : {}}
                    transition={isCurrent ? { duration: 1, repeat: Infinity } : {}}
                    data-testid={`creation-step-${step.id}`}
                  >
                    {isCompleted ? (
                      <Check className="w-3 h-3" />
                    ) : isCurrent ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <span>{index + 1}</span>
                    )}
                  </motion.div>

                  {/* Connector line (not after last step) */}
                  {index < STEPS.length - 1 && (
                    <motion.div
                      className={`
                        w-6 h-0.5 mx-1
                        ${isCompleted ? "bg-emerald-500" : "bg-slate-700"}
                      `}
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ delay: index * 0.1 + 0.05 }}
                    />
                  )}
                </motion.div>
              );
            })}
          </div>

          {/* Estimated time */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-xs text-slate-500"
          >
            ~2-3 seconds
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
