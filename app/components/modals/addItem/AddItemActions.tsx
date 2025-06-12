"use client";

import { Search, CheckCircle } from "lucide-react";

interface AddItemActionsProps {
  step: 'input' | 'validating' | 'results' | 'creating';
  itemName: string;
  isLoading: boolean;
  currentResult: any;
  onValidate: () => void;
  onTryAgain: () => void;
  onAddItem: () => void;
  onClose: () => void;
}

export function AddItemActions({ 
  step, 
  itemName, 
  isLoading, 
  currentResult, 
  onValidate, 
  onTryAgain, 
  onAddItem, 
  onClose 
}: AddItemActionsProps) {
  return (
    <div className="px-6 pb-6">
      <div className="flex gap-3">
        {step === 'input' && (
          <>
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 text-slate-300 hover:text-slate-200"
              style={{
                background: 'rgba(51, 65, 85, 0.5)',
                border: '1px solid rgba(71, 85, 105, 0.4)'
              }}
            >
              Cancel
            </button>
            <button
              onClick={onValidate}
              disabled={!itemName.trim() || isLoading}
              className="flex-1 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 text-white flex items-center justify-center gap-2"
              style={{
                background: !itemName.trim() || isLoading
                  ? 'rgba(71, 85, 105, 0.5)'
                  : `linear-gradient(135deg, 
                      rgba(34, 197, 94, 0.8) 0%,
                      rgba(16, 185, 129, 0.8) 100%
                    )`,
                boxShadow: !itemName.trim() || isLoading
                  ? 'none'
                  : '0 2px 8px rgba(34, 197, 94, 0.3)'
              }}
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Researching...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  Research Item
                </>
              )}
            </button>
          </>
        )}

        {step === 'results' && currentResult && (
          <>
            <button
              onClick={onTryAgain}
              className="flex-1 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 text-slate-300 hover:text-slate-200"
              style={{
                background: 'rgba(51, 65, 85, 0.5)',
                border: '1px solid rgba(71, 85, 105, 0.4)'
              }}
            >
              Try Again
            </button>
            {currentResult.is_valid && !currentResult.duplicate_info?.exact_match && (
              <button
                onClick={onAddItem}
                className="flex-1 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 text-white flex items-center justify-center gap-2"
                style={{
                  background: `linear-gradient(135deg, 
                    rgba(34, 197, 94, 0.8) 0%,
                    rgba(16, 185, 129, 0.8) 100%
                  )`,
                  boxShadow: '0 2px 8px rgba(34, 197, 94, 0.3)'
                }}
              >
                <CheckCircle className="w-4 h-4" />
                Add Item
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}