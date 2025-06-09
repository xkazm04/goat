"use client";

import { motion } from "framer-motion";


export function CompletionModalContent() {

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