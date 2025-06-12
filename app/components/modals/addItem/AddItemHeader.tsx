"use client";

import { X, Search } from "lucide-react";

interface AddItemHeaderProps {
  groupTitle: string;
  category: string;
  subcategory: string;
  step: 'input' | 'validating' | 'results' | 'creating';
  onClose: () => void;
}

export function AddItemHeader({ 
  groupTitle, 
  category, 
  subcategory, 
  step, 
  onClose 
}: AddItemHeaderProps) {
  return (
    <div
      className="px-6 py-4 border-b flex items-center justify-between"
      style={{
        borderColor: 'rgba(71, 85, 105, 0.4)',
        background: `linear-gradient(135deg, 
          rgba(30, 41, 59, 0.8) 0%,
          rgba(51, 65, 85, 0.9) 100%
        )`
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{
            background: `linear-gradient(135deg, 
              #059669 0%, 
              #10b981 50%,
              #34d399 100%
            )`
          }}
        >
          <Search className="w-4 h-4 text-white" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-200">
            Research & Add Item
          </h2>
          <p className="text-sm text-slate-400">
            to {groupTitle} • {category}/{subcategory}
          </p>
        </div>
      </div>
      <button
        onClick={onClose}
        disabled={step === 'creating'}
        className="p-2 rounded-lg transition-colors hover:bg-slate-700/50 disabled:opacity-50"
      >
        <X className="w-5 h-5 text-slate-400" />
      </button>
    </div>
  );
}