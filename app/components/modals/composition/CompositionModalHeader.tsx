"use client";

import { X, Sparkles } from "lucide-react";

interface CompositionModalHeaderProps {
  onClose: () => void;
  color: {
    primary: string;
    secondary: string;
    accent: string;
  };
}

export function CompositionModalHeader({ onClose, color }: CompositionModalHeaderProps) {
  return (
    <div 
      className="px-8 py-6 border-b flex items-center justify-between"
      style={{
        borderColor: `${color.primary}30`,
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
            background: `linear-gradient(135deg, ${color.primary}, ${color.secondary})`,
            boxShadow: `0 4px 14px ${color.primary}40`
          }}
        >
          <Sparkles className="w-6 h-6 text-white" />
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
            Create Your Ranking
          </h2>
          <p className="text-slate-400 font-medium">
            Build the ultimate G.O.A.T. list in your chosen category
          </p>
        </div>
      </div>
      
      <button
        onClick={onClose}
        className="p-3 rounded-xl transition-colors hover:bg-slate-700/50"
      >
        <X className="w-6 h-6 text-slate-400" />
      </button>
    </div>
  );
}