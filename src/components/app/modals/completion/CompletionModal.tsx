"use client";

import { motion, AnimatePresence } from "framer-motion";
import { SURFACE_ELEVATION, ELEVATION, INSET } from "@/components/visual/depth/depth-tokens";
import { useModalAccessibility } from "@/hooks/use-modal-accessibility";
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
  onKeepEditing: () => void;
  listTitle: string;
  completionData: CompletionData;
}

export function CompletionModal({
  isOpen,
  onClose,
  onKeepEditing,
  listTitle,
  completionData
}: CompletionModalProps) {
  const { modalRef, modalProps, handleKeyDown } = useModalAccessibility({
    isOpen,
    onClose,
  });

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-modal flex items-center justify-center p-4 modal-overlay"
        onClick={onClose}
        data-exclude-capture="true"
      >
        <motion.div
          ref={modalRef}
          {...modalProps}
          onKeyDown={handleKeyDown}
          initial={{ scale: 0.8, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.8, opacity: 0, y: 20 }}
          className="w-full max-w-2xl max-h-[90vh] rounded-container overflow-hidden border border-gray-700/50"
          style={{
            backgroundColor: SURFACE_ELEVATION.overlay,
            boxShadow: `${ELEVATION.modal}, ${INSET.glassHighlight}`,
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
            onKeepEditing={onKeepEditing}
            listTitle={listTitle}
          />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}