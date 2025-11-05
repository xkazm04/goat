"use client";

import { motion } from "framer-motion";
import { Share2, Download, Save } from "lucide-react";
import { useTwitterShare } from "@/hooks/useTwitterShare";
import { useScreenCapture } from "@/hooks/useScreenCapture";
import CompletionModalActionButton from "./CompletionModalActionButton";

interface CompletionModalActionsProps {
  onClose: () => void;
  listTitle: string;
}

export function CompletionModalActions({ 
  onClose, 
  listTitle 
}: CompletionModalActionsProps) {
  const { shareOnTwitter } = useTwitterShare();
  const { captureAndDownload, isCapturing } = useScreenCapture();

  const handleTwitterShare = () => {
    shareOnTwitter({
      text: `🏆 Just completed my "${listTitle}" ranking! Check out my results and create your own ranking list.`,
      hashtags: ['ranking', 'goat'],
      via: 'G.O.A.T' 
    });
  };

  const handleExportImage = async () => {
    try {
      await captureAndDownload({
        filename: `${listTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_ranking.png`,
        excludeSelectors: [
          '[data-modal="completion"]', 
          '.modal-overlay',
          '[data-exclude-capture="true"]'
        ]
      });
    } catch (error) {
      console.error('Failed to export image:', error);
      // TODO: Show user-friendly error message
    }
  };

  const handleSave = () => {
    // TODO: Implement save functionality
    console.log("Save ranking clicked for:", listTitle);
    // This will save the ranking to user's collection/favorites
  };

  const actions: Array<{
    icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
    label: string;
    description: string;
    onClick: () => void;
    color: string;
    special?: 'twitter';
    disabled?: boolean;
  }> = [
    {
      icon: Share2,
      label: "Tweet",
      description: "Share on Twitter",
      onClick: handleTwitterShare,
      color: "#1da1f2", // Twitter blue
      special: "twitter" as const
    },
    {
      icon: Download, // data-exclude-capture="true"
      label: "Export",
      description: isCapturing ? "Capturing..." : "Download as image",
      onClick: handleExportImage,
      color: "#f59e0b",
      disabled: isCapturing
    },
    {
      icon: Save,
      label: "Save",
      description: "Save to collection",
      onClick: handleSave,
      color: "#10b981"
    }
  ];

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
      <div className="space-y-4">

        {/* Secondary Actions */}
        <motion.div 
          className="grid grid-cols-3 gap-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.6 }}
        >
          {actions.map((action, index) => (
            <CompletionModalActionButton 
              key={action.label}
              action={action}
              index={index}
              />
          ))}
        </motion.div>

        {/* Close Button */}
        <motion.button
          className="w-full py-3 rounded-xl text-slate-400 font-medium transition-all duration-200 hover:text-slate-200"
          style={{
            background: 'rgba(51, 65, 85, 0.3)',
            border: '1px solid rgba(71, 85, 105, 0.4)'
          }}
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2 }}
        >
          Close
        </motion.button>
      </div>
    </div>
  );
}