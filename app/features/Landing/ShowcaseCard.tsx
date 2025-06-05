"use client";

import { motion } from "framer-motion";
import { LucideIcon, Star, Crown, Award } from "lucide-react";

interface ShowcaseCardProps {
  id: number;
  category: string;
  subcategory?: string;
  title: string;
  author: string;
  comment: string;
  icon: LucideIcon;
  color: {
    primary: string;
    secondary: string;
    accent: string;
  };
  timePeriod: "all-time" | "decade" | "year";
  hiearchy: string;
  onCardClick?: (cardData: {
    category: string;
    subcategory?: string;
    timePeriod: "all-time" | "decade" | "year";
    hierarchy: string;
    title: string;
    author: string;
    comment: string;
    color: any;
  }) => void;
}

export function ShowcaseCard({ 
  category,
  subcategory,
  title, 
  author, 
  comment, 
  icon: IconComponent, 
  color,
  timePeriod,
  hiearchy,
  onCardClick
}: ShowcaseCardProps) {
  
  const handleClick = () => {
    if (onCardClick) {
      onCardClick({
        category,
        subcategory,
        timePeriod,
        hierarchy: hiearchy,
        title,
        author,
        comment,
        color
      });
    }
  };

  return (
    <motion.div
      className="relative w-80 rounded-2xl overflow-hidden cursor-pointer group"
      style={{
        background: `
          linear-gradient(135deg, 
            rgba(15, 23, 42, 0.95) 0%,
            rgba(30, 41, 59, 0.98) 25%,
            rgba(51, 65, 85, 0.95) 50%,
            rgba(30, 41, 59, 0.98) 75%,
            rgba(15, 23, 42, 0.95) 100%
          )
        `,
        border: `2px solid ${color.primary}40`,
        boxShadow: `
          0 8px 32px rgba(0, 0, 0, 0.4),
          0 0 0 1px rgba(148, 163, 184, 0.1),
          0 0 20px ${color.primary}20
        `
      }}
      whileHover={{
        boxShadow: `
          0 12px 40px rgba(0, 0, 0, 0.5),
          0 0 0 1px rgba(148, 163, 184, 0.2),
          0 0 30px ${color.primary}30
        `
      }}
      onClick={handleClick}
    >
      {/* Glow effect */}
      <div 
        className="absolute inset-0 opacity-0 group-hover:opacity-90 transition-opacity duration-300"
        style={{
          background: `linear-gradient(135deg, ${color.primary}10, ${color.secondary}10)`
        }}
      />
      
      {/* Header */}
      <div 
        className="relative px-6 py-4 border-b"
        style={{
          borderColor: `${color.primary}30`,
          background: `linear-gradient(135deg, ${color.primary}20, ${color.secondary}20)`
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                background: `linear-gradient(135deg, ${color.primary}, ${color.secondary})`,
                boxShadow: `0 4px 14px ${color.primary}40`
              }}
            >
              <IconComponent className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 
                className="font-bold text-sm tracking-wide uppercase"
                style={{ color: color.accent }}
              >
                {category}
              </h3>
              <p className="text-xs text-slate-400 font-medium">
                {subcategory || "Greatest of All Time"}
              </p>
            </div>
          </div>
          
          <div className={`px-3 py-1 rounded-full text-lg font-bold text-white border border-opacity-50`}>
            {hiearchy}
          </div>
        </div>
      </div>
      
      {/* Title */}
      <div className="px-6 py-4">
        <h2 className="text-xl font-black text-slate-200 leading-tight mb-3">
          {title}
        </h2>
        
        {/* Preview boxes */}
        <div className="flex gap-2 mb-4">
          {[1, 2, 3].map((index) => (
            <motion.div
              key={index}
              className="relative flex-1 aspect-square rounded-lg overflow-hidden border"
              style={{
                background: `linear-gradient(135deg, ${color.primary}10, ${color.secondary}10)`,
                border: `1px solid ${color.primary}30`
              }}
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.2 }}
            >
              {/* Placeholder for future images */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div 
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{
                    background: `linear-gradient(135deg, ${color.primary}60, ${color.secondary}60)`
                  }}
                >
                  {index === 1 && <Crown className="w-4 h-4 text-white" />}
                  {index === 2 && <Award className="w-4 h-4 text-white" />}
                  {index === 3 && <Star className="w-4 h-4 text-white" />}
                </div>
              </div>
              
              {/* Rank number */}
              <div 
                className="absolute top-1 left-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white"
                style={{
                  background: `linear-gradient(135deg, ${color.primary}, ${color.secondary})`
                }}
              >
                {index}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
      
      {/* Footer */}
      <div 
        className="px-6 py-4 border-t"
        style={{
          borderColor: `${color.primary}20`,
          background: 'rgba(15, 23, 42, 0.8)'
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div 
              className="w-6 h-6 rounded-full"
              style={{
                background: `linear-gradient(135deg, ${color.primary}, ${color.secondary})`
              }}
            />
            <span 
              className="text-sm font-semibold"
              style={{ color: color.accent }}
            >
              {author}
            </span>
          </div>
          
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star 
                key={star}
                className="w-3 h-3"
                style={{ 
                  color: star <= 5 ? color.accent : '#64748b',
                  fill: star <= 5 ? color.accent : 'transparent'
                }}
              />
            ))}
          </div>
        </div>
        
        <p className="text-xs text-slate-400 mt-2 italic">
          "{comment}"
        </p>
        
        {/* Show time period and hierarchy */}
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-700/50">
          <span className="text-xs font-medium text-slate-300">
            {timePeriod === "all-time" ? "All Time" : timePeriod}
          </span>
          <span className="text-xs font-medium" style={{ color: color.accent }}>
            Click to customize
          </span>
        </div>
      </div>

      {/* Click to create indicator */}
      <div 
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center pointer-events-none"
        style={{
          background: `linear-gradient(135deg, ${color.primary}10, ${color.secondary}20)`
        }}
      >
        <div 
          className="px-4 py-2 rounded-xl font-bold text-white"
          style={{
            background: `linear-gradient(135deg, ${color.primary}90, ${color.secondary}90)`,
            backdropFilter: 'blur(4px)'
          }}
        >
          Build Your Own
        </div>
      </div>
      
      {/* Hover gradient overlay */}
      <div 
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{
          background: `linear-gradient(135deg, ${color.primary}05, ${color.secondary}05)`
        }}
      />
    </motion.div>
  );
}