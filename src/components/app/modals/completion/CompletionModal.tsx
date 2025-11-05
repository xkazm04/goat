"use client";

import { motion, AnimatePresence } from "framer-motion";
import { CompletionModalHeader } from "./CompletionModalHeader";
import { CompletionModalContent } from "./CompletionModalContent";
import { CompletionModalActions } from "./CompletionModalActions";

interface CompletionData {
  totalItems: number;
  timeTaken: string;
  category: string;
}

interface CompletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  listTitle: string;
  completionData: CompletionData;
}

export function CompletionModal({ 
  isOpen, 
  onClose, 
  listTitle, 
  completionData 
}: CompletionModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 modal-overlay"
        onClick={onClose}
        data-exclude-capture="true"
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.8, opacity: 0, y: 20 }}
          className="w-full max-w-2xl max-h-[90vh] rounded-2xl overflow-hidden"
          style={{
            background: `
              linear-gradient(135deg, 
                rgba(15, 23, 42, 0.95) 0%,
                rgba(30, 41, 59, 0.98) 50%,
                rgba(51, 65, 85, 0.95) 100%
              )
            `,
            border: '2px solid rgba(16, 185, 129, 0.4)',
            boxShadow: `
              0 25px 50px -12px rgba(0, 0, 0, 0.8),
              0 0 40px rgba(16, 185, 129, 0.2),
              0 0 0 1px rgba(16, 185, 129, 0.3)
            `
          }}
          onClick={(e) => e.stopPropagation()}
          data-modal="completion"
        >
          {/* Header */}
          <CompletionModalHeader 
            onClose={onClose}
            listTitle={listTitle}
          />

          {/* Content */}
          <CompletionModalContent 
            listTitle={listTitle}
            completionData={completionData}
          />

          {/* Actions */}
          <CompletionModalActions 
            onClose={onClose}
            listTitle={listTitle}
          />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}