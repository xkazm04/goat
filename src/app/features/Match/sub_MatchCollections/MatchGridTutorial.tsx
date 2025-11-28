"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowDown, Sparkles, CheckCircle2 } from "lucide-react";
import { BacklogItem } from "@/types/backlog-groups";
import { GridItemType } from "@/types/match";
import { DEMO_BACKLOG_ITEMS, createDemoGridItems, getRankColor } from "./tutorial/tutorialData";
import { TUTORIAL_STEPS } from "./tutorial/tutorialSteps";

interface MatchGridTutorialProps {
  isOpen: boolean;
  onComplete: () => void;
  onDemoDataReady: (demoItems: BacklogItem[], demoGridItems: GridItemType[]) => void;
}

export function MatchGridTutorial({ isOpen, onComplete, onDemoDataReady }: MatchGridTutorialProps) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (isOpen && step === 0) {
      onDemoDataReady(DEMO_BACKLOG_ITEMS, createDemoGridItems());
    }
  }, [isOpen, step, onDemoDataReady]);

  const handleNext = () => {
    if (step < TUTORIAL_STEPS.length - 1) {
      setStep(step + 1);
    } else {
      onComplete();
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  const currentStep = TUTORIAL_STEPS[step];
  const IconComponent = currentStep.icon;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4"
            data-testid="tutorial-backdrop"
          >
            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="w-full max-w-3xl"
              onClick={(e) => e.stopPropagation()}
              data-testid="match-grid-tutorial-modal"
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
                  border: '2px solid rgba(71, 85, 105, 0.4)',
                  boxShadow: `
                    0 25px 50px -12px rgba(0, 0, 0, 0.8),
                    0 0 0 1px rgba(148, 163, 184, 0.1)
                  `
                }}
              >
                {/* Header */}
                <div
                  className="px-8 py-6 border-b flex items-center justify-between"
                  style={{
                    borderColor: 'rgba(71, 85, 105, 0.4)',
                    background: `
                      linear-gradient(135deg,
                        rgba(30, 41, 59, 0.8) 0%,
                        rgba(51, 65, 85, 0.9) 100%
                      )
                    `
                  }}
                >
                  <div className="flex items-center gap-4">
                    <motion.div
                      key={step}
                      initial={{ scale: 0.8, rotate: -10 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: "spring", stiffness: 300 }}
                      className="w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{
                        background: `
                          linear-gradient(135deg,
                            #4c1d95 0%,
                            #7c3aed 50%,
                            #3b82f6 100%
                          )
                        `,
                        boxShadow: `
                          0 4px 14px 0 rgba(124, 58, 237, 0.4),
                          inset 0 1px 0 rgba(255, 255, 255, 0.2)
                        `
                      }}
                    >
                      <IconComponent className="w-6 h-6 text-white" />
                    </motion.div>
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h2
                          className="text-2xl font-black tracking-tight"
                          style={{
                            background: `
                              linear-gradient(135deg,
                                #f1f5f9 0%,
                                #cbd5e1 50%,
                                #f8fafc 100%
                              )
                            `,
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text'
                          }}
                        >
                          {currentStep.title}
                        </h2>
                      </div>
                      <p className="text-slate-400 font-medium text-sm">
                        Step {step + 1} of {TUTORIAL_STEPS.length}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleSkip}
                    className="p-3 rounded-xl transition-colors hover:bg-slate-700/50"
                    data-testid="tutorial-close-btn"
                  >
                    <X className="w-6 h-6 text-slate-400" />
                  </button>
                </div>

                {/* Content */}
                <div
                  className="p-8"
                  style={{
                    background: `
                      linear-gradient(180deg,
                        rgba(15, 23, 42, 0.7) 0%,
                        rgba(30, 41, 59, 0.8) 100%
                      )
                    `
                  }}
                >
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={step}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-6"
                    >
                      {/* Description */}
                      <p className="text-lg text-slate-300 leading-relaxed">
                        {currentStep.description}
                      </p>

                      {/* Visual Demo */}
                      <div className="py-8 flex items-center justify-center">
                        {currentStep.highlight === "drag" && (
                          <div className="space-y-4">
                            {/* Demo grid slots */}
                            <div className="flex gap-4 justify-center">
                              {[0, 1, 2].map((pos) => {
                                const demoItem = pos < 2 ? DEMO_BACKLOG_ITEMS[pos] : undefined;

                                return (
                                  <div
                                    key={pos}
                                    className="relative w-24 h-24 rounded-lg overflow-hidden border-2"
                                    style={{
                                      borderColor: pos < 2 ? 'rgba(100, 116, 139, 0.6)' : 'rgba(100, 116, 139, 0.3)',
                                      background: pos < 2
                                        ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(51, 65, 85, 0.9) 100%)'
                                        : 'rgba(15, 23, 42, 0.5)',
                                      borderStyle: pos < 2 ? 'solid' : 'dashed'
                                    }}
                                  >
                                    {/* Rank number background */}
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                      <span
                                        className="text-6xl font-black select-none"
                                        style={{
                                          color: getRankColor(pos),
                                          opacity: 0.08
                                        }}
                                      >
                                        {pos + 1}
                                      </span>
                                    </div>

                                    {/* Position label */}
                                    <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-gray-800/90 rounded text-[10px] font-semibold text-gray-400 z-10">
                                      #{pos + 1}
                                    </div>

                                    {pos < 2 && demoItem && (
                                      <div className="relative w-full h-full flex items-center justify-center p-2">
                                        <span className="text-xs text-white font-medium text-center line-clamp-2">
                                          {demoItem.title}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>

                            {/* Arrow indicator */}
                            <motion.div
                              animate={{ y: [0, 10, 0] }}
                              transition={{ repeat: Infinity, duration: 1.5 }}
                              className="flex justify-center"
                            >
                              <ArrowDown className="w-8 h-8 text-cyan-400" />
                            </motion.div>

                            {/* Collection panel hint */}
                            <div
                              className="mx-auto max-w-md p-4 rounded-xl border-2 border-dashed"
                              style={{
                                borderColor: 'rgba(34, 211, 238, 0.4)',
                                background: 'rgba(6, 182, 212, 0.1)'
                              }}
                            >
                              <p className="text-center text-sm text-cyan-300 font-medium">
                                Drag items from here
                              </p>
                            </div>
                          </div>
                        )}

                        {currentStep.highlight === "swap" && (
                          <div className="space-y-4">
                            <div className="flex gap-4 justify-center items-center">
                              {/* Item 1 */}
                              <div
                                className="relative w-24 h-24 rounded-lg overflow-hidden border-2"
                                style={{
                                  borderColor: 'rgba(100, 116, 139, 0.6)',
                                  background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(51, 65, 85, 0.9) 100%)'
                                }}
                              >
                                <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-gray-800/90 rounded text-[10px] font-semibold text-gray-400">
                                  #1
                                </div>
                                <div className="w-full h-full flex items-center justify-center">
                                  <span className="text-xs text-white font-medium">Item A</span>
                                </div>
                              </div>

                              {/* Swap arrows */}
                              <motion.div
                                animate={{ x: [0, 5, 0, -5, 0] }}
                                transition={{ repeat: Infinity, duration: 2 }}
                                className="flex gap-1"
                              >
                                <ArrowDown className="w-6 h-6 text-purple-400 rotate-90" />
                                <ArrowDown className="w-6 h-6 text-purple-400 -rotate-90" />
                              </motion.div>

                              {/* Item 2 */}
                              <div
                                className="relative w-24 h-24 rounded-lg overflow-hidden border-2"
                                style={{
                                  borderColor: 'rgba(100, 116, 139, 0.6)',
                                  background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(51, 65, 85, 0.9) 100%)'
                                }}
                              >
                                <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-gray-800/90 rounded text-[10px] font-semibold text-gray-400">
                                  #2
                                </div>
                                <div className="w-full h-full flex items-center justify-center">
                                  <span className="text-xs text-white font-medium">Item B</span>
                                </div>
                              </div>
                            </div>
                            <p className="text-center text-sm text-purple-300">
                              Drag one item onto another to swap positions
                            </p>
                          </div>
                        )}

                        {currentStep.highlight === "welcome" && (
                          <motion.div
                            initial={{ scale: 0.8 }}
                            animate={{ scale: 1 }}
                            className="w-32 h-32 rounded-2xl flex items-center justify-center"
                            style={{
                              background: `
                                linear-gradient(135deg,
                                  #4c1d95 0%,
                                  #7c3aed 50%,
                                  #3b82f6 100%
                                )
                              `,
                              boxShadow: '0 20px 40px rgba(124, 58, 237, 0.4)'
                            }}
                          >
                            <Sparkles className="w-16 h-16 text-white" />
                          </motion.div>
                        )}

                        {currentStep.highlight === "complete" && (
                          <motion.div
                            initial={{ scale: 0.8 }}
                            animate={{ scale: [1, 1.1, 1] }}
                            transition={{ repeat: Infinity, duration: 2 }}
                            className="w-32 h-32 rounded-2xl flex items-center justify-center"
                            style={{
                              background: `
                                linear-gradient(135deg,
                                  #10b981 0%,
                                  #059669 100%
                                )
                              `,
                              boxShadow: '0 20px 40px rgba(16, 185, 129, 0.4)'
                            }}
                          >
                            <CheckCircle2 className="w-16 h-16 text-white" />
                          </motion.div>
                        )}
                      </div>

                      {/* Progress indicators */}
                      <div className="flex justify-center gap-2">
                        {TUTORIAL_STEPS.map((_, index) => (
                          <div
                            key={index}
                            className="h-1.5 rounded-full transition-all duration-300"
                            style={{
                              width: index === step ? '32px' : '8px',
                              background: index === step
                                ? 'linear-gradient(90deg, #7c3aed 0%, #3b82f6 100%)'
                                : 'rgba(100, 116, 139, 0.3)'
                            }}
                          />
                        ))}
                      </div>
                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* Footer */}
                <div
                  className="px-8 py-6 border-t flex items-center justify-between"
                  style={{
                    borderColor: 'rgba(71, 85, 105, 0.4)',
                    background: 'rgba(15, 23, 42, 0.8)'
                  }}
                >
                  <button
                    onClick={handleSkip}
                    className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-slate-200 transition-colors"
                    data-testid="tutorial-skip-btn"
                  >
                    Skip Tutorial
                  </button>

                  <button
                    onClick={handleNext}
                    className="px-6 py-3 rounded-xl font-semibold text-white transition-all hover:scale-105"
                    style={{
                      background: step === TUTORIAL_STEPS.length - 1
                        ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                        : 'linear-gradient(135deg, #7c3aed 0%, #3b82f6 100%)',
                      boxShadow: step === TUTORIAL_STEPS.length - 1
                        ? '0 4px 14px rgba(16, 185, 129, 0.4)'
                        : '0 4px 14px rgba(124, 58, 237, 0.4)'
                    }}
                    data-testid="tutorial-next-btn"
                  >
                    {step === TUTORIAL_STEPS.length - 1 ? "Get Started" : "Next"}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Hook to detect when tutorial should show
export function useTutorialState() {
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialCompleted, setTutorialCompleted] = useState(false);

  useEffect(() => {
    // Check if user has completed tutorial before
    const completed = localStorage.getItem('match-grid-tutorial-completed');
    if (!completed) {
      setShowTutorial(true);
    } else {
      setTutorialCompleted(true);
    }
  }, []);

  const completeTutorial = () => {
    localStorage.setItem('match-grid-tutorial-completed', 'true');
    setShowTutorial(false);
    setTutorialCompleted(true);
  };

  const resetTutorial = () => {
    localStorage.removeItem('match-grid-tutorial-completed');
    setShowTutorial(true);
    setTutorialCompleted(false);
  };

  return {
    showTutorial,
    tutorialCompleted,
    completeTutorial,
    resetTutorial
  };
}

// Re-export tutorial steps for external use
export { TUTORIAL_STEPS } from "./tutorial/tutorialSteps";
