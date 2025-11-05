"use client";

import { motion } from "framer-motion";

interface CompletionData {
  totalItems: number;
  timeTaken: string;
  category: string;
}

interface CompletionModalContentProps {
  listTitle: string;
  completionData: CompletionData;
}

export function CompletionModalContent({ listTitle, completionData }: CompletionModalContentProps) {

  return (
    <div className="p-8">

      <motion.div
        className="grid grid-cols-2 gap-4 mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
      </motion.div>
    </div>
  );
}