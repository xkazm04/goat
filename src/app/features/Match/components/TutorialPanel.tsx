"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ChevronRight,
  ChevronLeft,
  Hand,
  Grip,
  PlusCircle,
  ArrowLeftRight,
  CheckCircle2,
  HelpCircle,
} from "lucide-react";

/**
 * Tutorial step data
 */
interface TutorialStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  animation: "drag-drop" | "swap" | "assign";
}

/**
 * Consolidated tutorial steps combining essential info from both tutorials
 */
const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: "drag-drop",
    title: "Drag & Drop",
    description: "Drag items from the collection panel at the bottom and drop them into any grid position.",
    icon: <Hand className="w-5 h-5" />,
    animation: "drag-drop",
  },
  {
    id: "assign",
    title: "Quick Assign",
    description: "Click on any item and drop it directly onto a numbered position to rank it.",
    icon: <PlusCircle className="w-5 h-5" />,
    animation: "assign",
  },
  {
    id: "swap",
    title: "Swap Positions",
    description: "Drag one ranked item onto another to swap their positions instantly.",
    icon: <ArrowLeftRight className="w-5 h-5" />,
    animation: "swap",
  },
];

/**
 * Visual demo for each tutorial step
 */
function StepDemo({ animation }: { animation: TutorialStep["animation"] }) {
  return (
    <div className="flex items-center gap-3 py-2">
      {animation === "drag-drop" && (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center">
            <div className="w-4 h-4 rounded-sm bg-cyan-400/60" />
          </div>
          <motion.div
            animate={{ x: [0, 20, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <ChevronRight className="w-4 h-4 text-cyan-400" />
          </motion.div>
          <div className="w-8 h-8 rounded border-2 border-dashed border-slate-500/40 flex items-center justify-center text-[8px] text-slate-500 font-bold">
            #1
          </div>
        </div>
      )}

      {animation === "assign" && (
        <div className="flex items-center gap-2">
          <motion.div
            className="w-8 h-8 rounded bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center"
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          >
            <div className="w-4 h-4 rounded-sm bg-emerald-400/60" />
          </motion.div>
          <ChevronRight className="w-4 h-4 text-emerald-400" />
          <div className="w-8 h-8 rounded bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-[8px] text-emerald-400 font-bold">
            #1
          </div>
        </div>
      )}

      {animation === "swap" && (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-[8px] text-white font-bold">
            A
          </div>
          <motion.div
            animate={{ x: [0, 3, 0, -3, 0] }}
            transition={{ duration: 1.2, repeat: Infinity }}
          >
            <ArrowLeftRight className="w-4 h-4 text-purple-400" />
          </motion.div>
          <div className="w-8 h-8 rounded bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-[8px] text-white font-bold">
            B
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Progress indicator
 */
function ProgressIndicator({
  current,
  total,
}: {
  current: number;
  total: number;
}) {
  return (
    <div className="flex gap-1.5">
      {Array.from({ length: total }).map((_, index) => (
        <div
          key={index}
          className={`h-1 rounded-full transition-all duration-300 ${
            index === current
              ? "w-4 bg-cyan-400"
              : index < current
              ? "w-1.5 bg-cyan-400/50"
              : "w-1.5 bg-white/20"
          }`}
        />
      ))}
    </div>
  );
}

interface TutorialPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * TutorialPanel Component
 * Consolidated tutorial that appears at top center, triggered by help icon
 */
export function TutorialPanel({ isOpen, onClose }: TutorialPanelProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const currentStepData = TUTORIAL_STEPS[currentStep];
  const isLastStep = currentStep === TUTORIAL_STEPS.length - 1;
  const isFirstStep = currentStep === 0;

  const handleNext = useCallback(() => {
    if (isLastStep) {
      onClose();
      setCurrentStep(0);
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  }, [isLastStep, onClose]);

  const handlePrevious = useCallback(() => {
    if (!isFirstStep) {
      setCurrentStep((prev) => prev - 1);
    }
  }, [isFirstStep]);

  const handleClose = useCallback(() => {
    onClose();
    setCurrentStep(0);
  }, [onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] w-[90vw] max-w-md"
          data-testid="tutorial-panel"
        >
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              background: "linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.95))",
              backdropFilter: "blur(16px)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              boxShadow: "0 20px 50px rgba(0, 0, 0, 0.5), 0 0 30px rgba(34, 211, 238, 0.1)",
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-cyan-400" />
                <span className="text-sm font-semibold text-white">Quick Guide</span>
              </div>
              <div className="flex items-center gap-3">
                <ProgressIndicator current={currentStep} total={TUTORIAL_STEPS.length} />
                <button
                  onClick={handleClose}
                  className="p-1 text-white/50 hover:text-white transition-colors"
                  aria-label="Close tutorial"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="px-4 py-4">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-start gap-3"
                >
                  {/* Icon */}
                  <div
                    className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{
                      background: "linear-gradient(135deg, rgba(34, 211, 238, 0.2), rgba(6, 182, 212, 0.15))",
                      border: "1px solid rgba(34, 211, 238, 0.3)",
                    }}
                  >
                    <div className="text-cyan-400">{currentStepData.icon}</div>
                  </div>

                  {/* Text content */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-bold text-white mb-1">
                      {currentStepData.title}
                    </h3>
                    <p className="text-sm text-white/70 leading-relaxed">
                      {currentStepData.description}
                    </p>
                    <StepDemo animation={currentStepData.animation} />
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-white/10">
              <button
                onClick={handlePrevious}
                disabled={isFirstStep}
                className={`flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  isFirstStep
                    ? "text-white/30 cursor-not-allowed"
                    : "text-white/70 hover:text-white hover:bg-white/10"
                }`}
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Back
              </button>

              <button
                onClick={handleNext}
                className="flex items-center gap-1 px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-white text-sm font-semibold transition-colors"
              >
                {isLastStep ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Got it
                  </>
                ) : (
                  <>
                    Next
                    <ChevronRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Help button trigger for the tutorial
 */
interface HelpButtonProps {
  onClick: () => void;
  className?: string;
}

export function HelpButton({ onClick, className = "" }: HelpButtonProps) {
  return (
    <motion.button
      onClick={onClick}
      className={`p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10
        text-white/60 hover:text-cyan-400 transition-colors ${className}`}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      title="How to use"
      data-testid="tutorial-help-button"
    >
      <HelpCircle className="w-5 h-5" />
    </motion.button>
  );
}

/**
 * Hook for managing tutorial panel state
 */
export function useTutorialPanel() {
  const [isOpen, setIsOpen] = useState(false);

  const showTutorial = useCallback(() => {
    setIsOpen(true);
  }, []);

  const hideTutorial = useCallback(() => {
    setIsOpen(false);
  }, []);

  return {
    isOpen,
    showTutorial,
    hideTutorial,
  };
}

export default TutorialPanel;
