"use client";

import { ListIntent } from "@/types/list-intent";
import { X, Sparkles, User, MessageCircle, Settings } from "lucide-react";
import { ShimmerBtn } from "@/components/app/button/AnimButtons";
import { CreationProgressIndicator, CreationStep } from "@/app/features/Landing/sub_CreateList/components/CreationProgressIndicator";

interface CompositionModalHeaderProps {
  onClose: () => void;
  title: string;
  author: string;
  comment: string;
  hierarchy: string;
  intent: ListIntent;
  color: {
    primary: string;
    secondary: string;
    accent: string;
  };
  setIsExpanded: (isExpanded: boolean) => void;
  isExpanded: boolean;
  onCreatePredefined: () => void;
  isCreating: boolean;
  creationStep?: CreationStep | null;
}

export function CompositionModalHeader({
  onClose,
  title,
  author,
  comment,
  intent,
  setIsExpanded,
  isExpanded,
  onCreatePredefined,
  isCreating,
  creationStep
}: CompositionModalHeaderProps) {
  return (
    <div
      className="px-8 py-6 border-b flex items-center justify-between"
      style={{
        borderColor: `${intent.color.primary}30`,
        background: `
          linear-gradient(135deg,
            rgba(30, 41, 59, 0.8) 0%,
            rgba(51, 65, 85, 0.9) 100%
          )
        `
      }}
    >
      <div className="flex items-center gap-4 flex-1">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center"
          style={{
            background: `linear-gradient(135deg, ${intent.color.primary}, ${intent.color.secondary})`,
            boxShadow: `0 4px 14px ${intent.color.primary}40`
          }}
        >
          <Sparkles className="w-6 h-6 text-white" />
        </div>

        <div className="flex-1 px-5">
          {/* Main Title */}
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
            {title}
          </h2>

          {/* Subtitle with hierarchy */}
          <div className="flex items-center gap-2 mt-1">
            <span className="text-slate-400 font-medium">
              Top {intent.size} ranking
            </span>
            <span className="text-slate-600">•</span>
            <span className="text-slate-500 text-sm">
              {intent.category}
              {intent.subcategory && ` • ${intent.subcategory}`}
            </span>
          </div>

          {/* Author and Comment Section */}
          <div className="flex items-center gap-4 mt-3">
            {/* Author */}
            <div className="flex items-center gap-2">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center"
                style={{
                  background: `linear-gradient(135deg, ${intent.color.primary}80, ${intent.color.secondary}80)`
                }}
              >
                <User className="w-3 h-3 text-white" />
              </div>
              <span
                className="text-sm font-semibold"
                style={{ color: intent.color.accent }}
              >
                {author}
              </span>
            </div>

            {/* Comment */}
            <div className="flex items-center gap-2 max-w-md">
              <MessageCircle className="w-4 h-4 text-slate-500" />
              <p className="text-sm text-slate-400 italic truncate">
                "{comment}"
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons - Only show when NOT expanded */}
      <div className="flex items-center gap-3">
        {!isExpanded && intent.isPredefined && (
          <>
            {/* Customize Button */}
            <button
              onClick={() => setIsExpanded(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-200 hover:scale-105 text-sm font-medium backdrop-blur-sm"
              style={{
                background: `linear-gradient(135deg, ${intent.color.primary}20, ${intent.color.secondary}20)`,
                border: `1px solid ${intent.color.primary}40`,
                color: intent.color.accent,
                boxShadow: `0 4px 15px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.1)`
              }}
              data-testid="composition-customize-btn"
            >
              <Settings className="w-4 h-4" />
              Customize
            </button>

            {/* ShimmerBtn for Start Ranking */}
            <div className="flex flex-col items-center gap-2" data-testid="quick-create-container">
              <div
                className={`scale-75 transition-opacity duration-300 ${creationStep !== null ? 'opacity-50 pointer-events-none' : ''}`}
                data-testid="quick-create-btn"
              >
                <ShimmerBtn
                  label={creationStep !== null ? "" : "START"}
                  onClick={isCreating || creationStep !== null ? undefined : onCreatePredefined}
                />
              </div>
              <CreationProgressIndicator
                currentStep={creationStep ?? "validating"}
                isVisible={creationStep !== null}
              />
            </div>
          </>
        )}

        {/* Close Button */}
        <button
          onClick={onClose}
          className="p-3 rounded-xl transition-all duration-200 hover:bg-slate-700/50 backdrop-blur-sm"
          disabled={isCreating}
          style={{
            boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.1)'
          }}
          data-testid="composition-modal-close-btn"
        >
          <X className="w-6 h-6 text-slate-400" />
        </button>
      </div>
    </div>
  );
}