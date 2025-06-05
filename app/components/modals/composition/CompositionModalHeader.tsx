"use client";

import { CompositionData } from "@/app/features/Landing/CompositionModal";
import { X, Sparkles, User, MessageCircle } from "lucide-react";

interface CompositionModalHeaderProps {
  onClose: () => void;
  title: string;
  author: string;
  comment: string;
  hierarchy: string;
  compositionData: CompositionData
  color: {
    primary: string;
    secondary: string;
    accent: string;
  };
  setIsExpanded: (isExpanded: boolean) => void;
}

export function CompositionModalHeader({ 
  onClose, 
  title, 
  author, 
  comment, 
  compositionData, 
  setIsExpanded,
}: CompositionModalHeaderProps) {
  return (
    <div 
      className="px-8 py-6 border-b flex items-center justify-between"
      style={{
        borderColor: `${compositionData.color.primary}30`,
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
            background: `linear-gradient(135deg, ${compositionData.color.primary}, ${compositionData.color.secondary})`,
            boxShadow: `0 4px 14px ${compositionData.color.primary}40`
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
              {compositionData.hierarchy} ranking
            </span>
            <span className="text-slate-600">•</span>
            <button 
              className="text-sm italic font-semibold hover:opacity-80 transition-opacity duration-200"
              style={{ color: compositionData.color.accent }}
              onClick={()=> {setIsExpanded(true)}}
            >
              Change parameters
            </button>
          </div>
          
          {/* Author and Comment Section */}
          <div className="flex items-center gap-4 mt-3">
            {/* Author */}
            <div className="flex items-center gap-2">
              <div 
                className="w-6 h-6 rounded-full flex items-center justify-center"
                style={{
                  background: `linear-gradient(135deg, ${compositionData.color.primary}80, ${compositionData.color.secondary}80)`
                }}
              >
                <User className="w-3 h-3 text-white" />
              </div>
              <span 
                className="text-sm font-semibold"
                style={{ color: compositionData.color.accent }}
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
      
      {/* Close Button */}
      <button
        onClick={onClose}
        className="p-3 rounded-xl transition-colors hover:bg-slate-700/50 ml-4"
      >
        <X className="w-6 h-6 text-slate-400" />
      </button>
    </div>
  );
}