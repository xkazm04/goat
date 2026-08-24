"use client";

import { motion } from "framer-motion";
import { Download, Share2, Pencil, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface CompletionModalActionsProps {
  onClose: () => void;
  onKeepEditing: () => void;
  listTitle: string;
}

export function CompletionModalActions({
  onClose,
  onKeepEditing,
  listTitle
}: CompletionModalActionsProps) {
  const router = useRouter();
  const [comingSoonLabel, setComingSoonLabel] = useState<string | null>(null);

  const showComingSoon = (label: string) => {
    setComingSoonLabel(label);
    setTimeout(() => setComingSoonLabel(null), 2000);
  };

  const handleStartNew = () => {
    onClose();
    router.push('/');
  };

  return (
    <div
      className="px-8 py-6 border-t"
      style={{
        borderColor: 'rgba(16, 185, 129, 0.2)',
        background: `
          linear-gradient(135deg,
            rgba(15, 23, 42, 0.8) 0%,
            rgba(30, 41, 59, 0.9) 100%
          )
        `
      }}
      data-modal="completion"
    >
      <div className="space-y-3">
        {/* Coming soon toast */}
        {comingSoonLabel && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-center text-xs text-slate-400 py-1.5 px-3 rounded-card bg-slate-800/60 border border-slate-700/50"
          >
            {comingSoonLabel} is coming in a future update
          </motion.div>
        )}

        {/* 2x2 Action Grid */}
        <motion.div
          className="grid grid-cols-2 gap-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2 }}
        >
          {/* Download Result Image - stub */}
          <motion.button
            className="flex items-center gap-3 p-3.5 rounded-card transition-all duration-200 opacity-60 cursor-default"
            style={{
              background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.4) 0%, rgba(51, 65, 85, 0.5) 100%)',
              border: '1px solid rgba(71, 85, 105, 0.3)'
            }}
            onClick={() => showComingSoon('Download result image')}
            whileTap={{ scale: 0.97 }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 0.6, y: 0 }}
            transition={{ delay: 1.3 }}
          >
            <div className="w-8 h-8 rounded-control flex items-center justify-center bg-amber-500/10 border border-amber-500/20">
              <Download className="w-4 h-4 text-amber-500/70" />
            </div>
            <div className="text-left">
              <div className="text-xs font-semibold text-slate-400">Download Image</div>
              <div className="text-2xs text-slate-600">Coming soon</div>
            </div>
          </motion.button>

          {/* Share Link - stub */}
          <motion.button
            className="flex items-center gap-3 p-3.5 rounded-card transition-all duration-200 opacity-60 cursor-default"
            style={{
              background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.4) 0%, rgba(51, 65, 85, 0.5) 100%)',
              border: '1px solid rgba(71, 85, 105, 0.3)'
            }}
            onClick={() => showComingSoon('Share link')}
            whileTap={{ scale: 0.97 }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 0.6, y: 0 }}
            transition={{ delay: 1.4 }}
          >
            <div className="w-8 h-8 rounded-control flex items-center justify-center bg-blue-500/10 border border-blue-500/20">
              <Share2 className="w-4 h-4 text-blue-500/70" />
            </div>
            <div className="text-left">
              <div className="text-xs font-semibold text-slate-400">Share Link</div>
              <div className="text-2xs text-slate-600">Coming soon</div>
            </div>
          </motion.button>

          {/* Keep Editing - primary */}
          <motion.button
            className="flex items-center gap-3 p-3.5 rounded-card transition-all duration-200 hover:brightness-110"
            style={{
              background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.15) 0%, rgba(59, 130, 246, 0.15) 100%)',
              border: '1px solid rgba(6, 182, 212, 0.4)'
            }}
            onClick={onKeepEditing}
            whileHover={{ scale: 1.02, boxShadow: '0 4px 20px rgba(6, 182, 212, 0.2)' }}
            whileTap={{ scale: 0.97 }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.5 }}
          >
            <div className="w-8 h-8 rounded-control flex items-center justify-center bg-cyan-500/20 border border-cyan-500/30">
              <Pencil className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-left">
              <div className="text-xs font-semibold text-cyan-300">Keep Editing</div>
              <div className="text-2xs text-cyan-500/60">Return to grid</div>
            </div>
          </motion.button>

          {/* Start New Ranking - primary */}
          <motion.button
            className="flex items-center gap-3 p-3.5 rounded-card transition-all duration-200 hover:brightness-110"
            style={{
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(52, 211, 153, 0.15) 100%)',
              border: '1px solid rgba(16, 185, 129, 0.4)'
            }}
            onClick={handleStartNew}
            whileHover={{ scale: 1.02, boxShadow: '0 4px 20px rgba(16, 185, 129, 0.2)' }}
            whileTap={{ scale: 0.97 }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.6 }}
          >
            <div className="w-8 h-8 rounded-control flex items-center justify-center bg-emerald-500/20 border border-emerald-500/30">
              <Plus className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-left">
              <div className="text-xs font-semibold text-emerald-300">Start New</div>
              <div className="text-2xs text-emerald-500/60">New ranking</div>
            </div>
          </motion.button>
        </motion.div>
      </div>
    </div>
  );
}