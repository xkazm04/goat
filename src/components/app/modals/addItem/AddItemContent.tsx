"use client";

import { motion } from "framer-motion";
import { Clock, CheckCircle, AlertCircle, Image as ImageIcon } from "lucide-react";

interface AddItemContentProps {
  step: 'input' | 'validating' | 'results' | 'creating';
  itemName: string;
  setItemName: (name: string) => void;
  currentResult: any;
  onValidate: () => void;
}

export function AddItemContent({ 
  step, 
  itemName, 
  setItemName, 
  currentResult, 
  onValidate 
}: AddItemContentProps) {
  return (
    <div className="p-6">
      {/* Step 1: Input */}
      {step === 'input' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Item Name
            </label>
            <input
              type="text"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              placeholder="Enter item name to research..."
              autoFocus
              className="w-full px-4 py-3 rounded-xl text-slate-200 placeholder-slate-500 transition-all duration-200 focus:outline-none"
              style={{
                background: `linear-gradient(135deg, 
                  rgba(30, 41, 59, 0.9) 0%,
                  rgba(51, 65, 85, 0.95) 100%
                )`,
                border: '2px solid rgba(71, 85, 105, 0.4)',
                boxShadow: `
                  0 2px 4px rgba(0, 0, 0, 0.2),
                  inset 0 1px 0 rgba(148, 163, 184, 0.1)
                `
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && itemName.trim()) {
                  onValidate();
                }
              }}
            />
          </div>
        </motion.div>
      )}

      {/* Step 2: Validating */}
      {step === 'validating' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-8"
        >
          <div className="flex items-center justify-center gap-3 text-blue-400 mb-4">
            <Clock className="w-6 h-6 animate-pulse" />
            <span className="text-lg font-medium">Researching item...</span>
          </div>
          <div className="text-sm text-slate-400">
            Validating name and gathering metadata
          </div>
        </motion.div>
      )}

      {/* Step 3: Results */}
      {step === 'results' && currentResult && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* Validation Status */}
          <div className="flex items-start gap-3 p-3 rounded-lg" style={{
            background: currentResult.is_valid 
              ? 'rgba(34, 197, 94, 0.1)' 
              : 'rgba(239, 68, 68, 0.1)'
          }}>
            {currentResult.is_valid ? (
              <CheckCircle className="w-5 h-5 text-green-400 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-400 mt-0.5" />
            )}
            <div className="flex-1">
              <div className="font-medium text-slate-200 mb-1">
                {currentResult.is_valid ? 'Valid Item' : 'Validation Issues'}
              </div>
              {currentResult.validation_errors?.length > 0 && (
                <div className="text-sm text-slate-400">
                  {currentResult.validation_errors.join(', ')}
                </div>
              )}
            </div>
          </div>

          {/* Duplicate Warning */}
          {currentResult.duplicate_info?.is_duplicate && (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-yellow-500/10">
              <AlertCircle className="w-5 h-5 text-yellow-400 mt-0.5" />
              <div className="flex-1">
                <div className="font-medium text-yellow-200 mb-1">
                  Similar Items Found
                </div>
                <div className="text-sm text-slate-400">
                  {currentResult.duplicate_info.duplicate_count} similar items exist in the database
                </div>
              </div>
            </div>
          )}

          {/* Research Results */}
          {currentResult.research_performed && (
            <div className="space-y-3">
              <h3 className="font-medium text-slate-200">Research Results</h3>
              
              <div className="grid grid-cols-1 gap-3">
                {/* Item Image */}
                {currentResult.image_url && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-700/30">
                    <ImageIcon className="w-4 h-4 text-slate-400" />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-slate-300">Image Found</div>
                      <img 
                        src={currentResult.image_url} 
                        alt={currentResult.name}
                        className="w-16 h-16 object-cover rounded-lg mt-2"
                      />
                    </div>
                  </div>
                )}

                {/* Description */}
                {currentResult.description && (
                  <div className="p-3 rounded-lg bg-slate-700/30">
                    <div className="text-sm font-medium text-slate-300 mb-1">Description</div>
                    <div className="text-sm text-slate-400">{currentResult.description}</div>
                  </div>
                )}

                {/* Group */}
                {currentResult.group && (
                  <div className="p-3 rounded-lg bg-slate-700/30">
                    <div className="text-sm font-medium text-slate-300 mb-1">Group</div>
                    <div className="text-sm text-slate-400">{currentResult.group}</div>
                  </div>
                )}

                {/* Year */}
                {currentResult.item_year && (
                  <div className="p-3 rounded-lg bg-slate-700/30">
                    <div className="text-sm font-medium text-slate-300 mb-1">Year</div>
                    <div className="text-sm text-slate-400">
                      {currentResult.item_year}
                      {currentResult.item_year_to && ` - ${currentResult.item_year_to}`}
                    </div>
                  </div>
                )}
              </div>

              {/* Research Confidence */}
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Research Confidence: {currentResult.llm_confidence}%</span>
                <span>Sources: {currentResult.web_sources_found}</span>
              </div>
            </div>
          )}

          {/* Research Errors */}
          {currentResult.research_errors?.length > 0 && (
            <div className="text-sm text-red-400">
              {currentResult.research_errors.join(', ')}
            </div>
          )}
        </motion.div>
      )}

      {/* Step 4: Creating */}
      {step === 'creating' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-8"
        >
          <div className="flex items-center justify-center gap-3 text-green-400 mb-4">
            <div className="w-6 h-6 border-2 border-green-400/30 border-t-green-400 rounded-full animate-spin" />
            <span className="text-lg font-medium">Adding item...</span>
          </div>
          <div className="text-sm text-slate-400">
            Creating item and adding to group
          </div>
        </motion.div>
      )}
    </div>
  );
}