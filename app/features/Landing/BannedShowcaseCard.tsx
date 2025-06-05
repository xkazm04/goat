"use client";

import { motion } from "framer-motion";
import { LucideIcon, Star, Ban, AlertTriangle } from "lucide-react";

interface BannedShowcaseCardProps {
  id: number;
  category: string;
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

export function BannedShowcaseCard({ 
  category, 
  title, 
  author, 
  comment, 
  icon: IconComponent, 
  color,
  timePeriod,
  hiearchy,
  onCardClick
}: BannedShowcaseCardProps) {
  
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
        `,
        filter: 'grayscale(0.3)' // Slight desaturation for banned effect
      }}
      whileHover={{
        boxShadow: `
          0 12px 40px rgba(0, 0, 0, 0.5),
          0 0 0 1px rgba(148, 163, 184, 0.2),
          0 0 30px ${color.primary}30
        `,
        filter: 'grayscale(0.1)'
      }}
      onClick={handleClick}
    >
      {/* Glow effect */}
      <div 
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
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
              <p className="text-xs text-slate-400 font-medium">Greatest of All Time</p>
            </div>
          </div>
          
          <div 
            className="px-3 py-1 rounded-full text-xs font-bold text-white"
            style={{
              background: `linear-gradient(135deg, ${color.primary}80, ${color.secondary}80)`
            }}
          >
            Top 50
          </div>
        </div>
      </div>
      
      {/* Title */}
      <div className="px-6 py-4">
        <h2 className="text-xl font-black text-slate-200 leading-tight mb-3">
          {title}
        </h2>
        
        {/* Preview boxes with X marks over them */}
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
              {/* X mark overlay */}
              <div className="absolute inset-0 flex items-center justify-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 2 + index * 0.1, duration: 0.3 }}
                  className="w-full h-full border border-red-500/80 flex items-center justify-center"
                >
                  <Ban className="w-6 h-6 text-white" />
                </motion.div>
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
      </div>

      {/* Banned Overlay */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 2.5, duration: 0.5, type: "spring" }}
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        style={{
          background: `
            linear-gradient(135deg, 
              rgba(239, 68, 68, 0.15) 0%,
              rgba(220, 38, 38, 0.15) 100%
            )
          `
        }}
      >
        <div 
          className="px-6 py-3 rounded-xl font-bold text-white transform -rotate-12 shadow-2xl border-2"
          style={{
            background: `
              linear-gradient(135deg, 
                rgba(239, 68, 68, 0.95) 0%,
                rgba(220, 38, 38, 0.95) 100%
              )
            `,
            border: '2px solid rgba(239, 68, 68, 0.8)',
            boxShadow: `
              0 8px 25px rgba(239, 68, 68, 0.4),
              inset 0 1px 0 rgba(255, 255, 255, 0.2)
            `,
            backdropFilter: 'blur(4px)'
          }}
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            <span className="text-lg tracking-wide">BANNED BY ADMIN</span>
          </div>
        </div>
      </motion.div>

      {/* Click to create indicator (only shows on hover when not banned overlay visible) */}
      <div 
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-8 pointer-events-none"
        style={{
          background: `linear-gradient(to top, ${color.primary}30, transparent)`
        }}
      >
        <div 
          className="px-4 py-2 rounded-xl font-bold text-white"
          style={{
            background: `linear-gradient(135deg, ${color.primary}90, ${color.secondary}90)`,
            backdropFilter: 'blur(4px)'
          }}
        >
          Build your own
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