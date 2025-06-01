"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Check } from "lucide-react";

interface AddItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (title: string) => void;
  groupTitle: string;
}

export function AddItemModal({ isOpen, onClose, onConfirm, groupTitle }: AddItemModalProps) {
  const [title, setTitle] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    try {
      await onConfirm(title.trim());
      setTitle("");
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setTitle("");
      onClose();
    }
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
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={handleClose}
          >
            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", duration: 0.3 }}
              className="w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className="rounded-2xl border-2 overflow-hidden"
                style={{
                  background: `
                    linear-gradient(135deg, 
                      rgba(15, 23, 42, 0.98) 0%,
                      rgba(30, 41, 59, 0.98) 50%,
                      rgba(51, 65, 85, 0.98) 100%
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
                  className="px-6 py-4 border-b flex items-center justify-between"
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
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{
                        background: `
                          linear-gradient(135deg, 
                            #4c1d95 0%, 
                            #7c3aed 50%,
                            #3b82f6 100%
                          )
                        `
                      }}
                    >
                      <Plus className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-slate-200">
                        Add New Item
                      </h2>
                      <p className="text-sm text-slate-400">
                        to {groupTitle}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleClose}
                    disabled={isSubmitting}
                    className="p-2 rounded-lg transition-colors hover:bg-slate-700/50 disabled:opacity-50"
                  >
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </div>

                {/* Content */}
                <form onSubmit={handleSubmit} className="p-6">
                  <div className="mb-6">
                    <label 
                      htmlFor="item-title"
                      className="block text-sm font-medium text-slate-300 mb-2"
                    >
                      Item Name
                    </label>
                    <input
                      id="item-title"
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Enter the legendary item name..."
                      autoFocus
                      disabled={isSubmitting}
                      className="w-full px-4 py-3 rounded-xl text-slate-200 placeholder-slate-500 transition-all duration-200 focus:outline-none disabled:opacity-50"
                      style={{
                        background: `
                          linear-gradient(135deg, 
                            rgba(30, 41, 59, 0.9) 0%,
                            rgba(51, 65, 85, 0.95) 100%
                          )
                        `,
                        border: '2px solid rgba(71, 85, 105, 0.4)',
                        boxShadow: `
                          0 2px 4px rgba(0, 0, 0, 0.2),
                          inset 0 1px 0 rgba(148, 163, 184, 0.1)
                        `
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = 'rgba(59, 130, 246, 0.6)';
                        e.target.style.boxShadow = `
                          0 0 0 3px rgba(59, 130, 246, 0.2),
                          0 2px 4px rgba(0, 0, 0, 0.2),
                          inset 0 1px 0 rgba(148, 163, 184, 0.1)
                        `;
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = 'rgba(71, 85, 105, 0.4)';
                        e.target.style.boxShadow = `
                          0 2px 4px rgba(0, 0, 0, 0.2),
                          inset 0 1px 0 rgba(148, 163, 184, 0.1)
                        `;
                      }}
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={handleClose}
                      disabled={isSubmitting}
                      className="flex-1 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 disabled:opacity-50 text-slate-300 hover:text-slate-200"
                      style={{
                        background: 'rgba(51, 65, 85, 0.5)',
                        border: '1px solid rgba(71, 85, 105, 0.4)'
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={!title.trim() || isSubmitting}
                      className="flex-1 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 disabled:opacity-50 text-white flex items-center justify-center gap-2"
                      style={{
                        background: !title.trim() || isSubmitting
                          ? 'rgba(71, 85, 105, 0.5)'
                          : `linear-gradient(135deg, 
                              rgba(59, 130, 246, 0.8) 0%,
                              rgba(147, 51, 234, 0.8) 100%
                            )`,
                        boxShadow: !title.trim() || isSubmitting
                          ? 'none'
                          : '0 2px 8px rgba(59, 130, 246, 0.3)'
                      }}
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Adding...
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          Add Item
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}