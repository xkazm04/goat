"use client";

import { motion } from "framer-motion";
import { Plus } from "lucide-react";

interface AddItemPlaceholderProps {
  onClick: () => void;
}

export function AddItemPlaceholder({ onClick }: AddItemPlaceholderProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <button
        onClick={onClick}
        className="relative aspect-square w-full rounded-xl border-2 border-dashed overflow-hidden transition-all duration-300 group cursor-pointer"
        style={{
          background: `
            linear-gradient(135deg, 
              rgba(59, 130, 246, 0.05) 0%,
              rgba(147, 51, 234, 0.05) 100%
            )
          `,
          border: '2px dashed rgba(59, 130, 246, 0.3)',
          boxShadow: '0 2px 8px rgba(59, 130, 246, 0.1)'
        }}
      >
        {/* Icon */}
        <div className="absolute inset-0 flex flex-col items-center justify-center p-3">
          <div 
            className="w-12 h-12 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform"
            style={{
              background: `
                linear-gradient(135deg, 
                  rgba(59, 130, 246, 0.2) 0%,
                  rgba(147, 51, 234, 0.2) 100%
                )
              `,
              border: '1px solid rgba(59, 130, 246, 0.3)'
            }}
          >
            <Plus className="w-6 h-6 text-blue-400" />
          </div>
          
          {/* Text */}
          <span className="text-xs font-semibold text-center leading-tight text-blue-400">
            Add Item
          </span>
        </div>

        {/* Hover Overlay */}
        <div 
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center bg-blue-500/10"
        >
          <div 
            className="text-xs font-medium px-2 py-1 rounded text-blue-200"
            style={{
              background: 'rgba(59, 130, 246, 0.8)',
              backdropFilter: 'blur(4px)'
            }}
          >
            Click to add
          </div>
        </div>
      </button>
    </motion.div>
  );
}