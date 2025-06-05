"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import AddItemActions from "@/app/components/modals/addItem/AddItemActions";
import AddItemHeader from "@/app/components/modals/addItem/AddItemHeader";
import AddItemContent from "@/app/components/modals/addItem/AddItemContent";

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
                <AddItemHeader
                  groupTitle={groupTitle}
                  handleClose={handleClose}
                  isSubmitting={isSubmitting}
                />
                {/* Content */}
                <AddItemContent
                  title={title}
                  setTitle={setTitle}
                  isSubmitting={isSubmitting}
                  handleSubmit={handleSubmit}
                  />
                <AddItemActions
                  handleClose={handleClose}
                  isSubmitting={isSubmitting}
                  title={title}
                />
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}