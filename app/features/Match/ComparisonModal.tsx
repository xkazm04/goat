"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Crown, Star, Gamepad2, Trophy } from "lucide-react";
import { BacklogItemType } from "@/app/types/match";

interface ComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: BacklogItemType[];
}

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

export function ComparisonModal({ isOpen, onClose, items }: ComparisonModalProps) {
  const handleClose = () => {
    onClose();
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
                    <div 
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
                      <Crown className="w-6 h-6 text-white" />
                    </div>
                    <div>
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
                        Compare Legends
                      </h2>
                      <p className="text-slate-400 font-medium">
                        Side-by-side comparison of {items.length} legendary items
                      </p>
                    </div>
                  </div>
                  
                  <button
                    onClick={handleClose}
                    className="p-3 rounded-xl transition-colors hover:bg-slate-700/50"
                  >
                    <X className="w-6 h-6 text-slate-400" />
                  </button>
                </div>

                {/* Content */}
                <div 
                  className="p-8 max-h-[70vh] overflow-y-auto"
                  style={{
                    background: `
                      linear-gradient(180deg, 
                        rgba(15, 23, 42, 0.7) 0%,
                        rgba(30, 41, 59, 0.8) 100%
                      )
                    `
                  }}
                >
                  {items.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <div 
                        className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
                        style={{
                          background: `
                            linear-gradient(135deg, 
                              rgba(71, 85, 105, 0.2) 0%,
                              rgba(100, 116, 139, 0.2) 100%
                            )
                          `
                        }}
                      >
                        <Crown className="w-10 h-10 text-slate-500" />
                      </div>
                      <h3 className="text-xl font-semibold mb-2 text-slate-200">
                        No Items to Compare
                      </h3>
                      <p className="text-sm max-w-md text-slate-400">
                        Right-click on items in the backlog and select "Add to compare" to start comparing legends
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                      {items.map((item, index) => {
                        const IconComponent = getItemIcon(item.title);
                        
                        return (
                          <motion.div
                            key={item.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="relative"
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
                </div>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}