'use client';

/**
 * StudioHeader
 * Premium sticky header with gradient accent line and G.O.A.T. branding.
 */

import { ArrowLeft, Crown, Sparkles } from 'lucide-react';
import Link from 'next/link';

export interface StudioHeaderProps {
  title?: string;
  subtitle?: string;
}

export function StudioHeader({
  title = 'Creation Studio',
  subtitle = 'AI-powered list generation',
}: StudioHeaderProps) {
  return (
    <header className="relative border-b border-gray-800/60 backdrop-blur-2xl sticky top-0 z-sticky bg-black/70" data-testid="studio-header">
      {/* Gradient accent line — amber to cyan sweep */}
      <div className="absolute top-0 left-0 right-0 h-px"
        style={{
          background: 'linear-gradient(90deg, transparent 5%, rgba(251,191,36,0.4) 30%, rgba(245,158,11,0.6) 50%, rgba(6,182,212,0.3) 70%, transparent 95%)',
        }}
      />

      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center gap-4">
          {/* Back navigation */}
          <Link
            href="/"
            className="group flex items-center justify-center w-10 h-10 rounded-card
              bg-white/[0.03] border border-white/[0.06]
              hover:bg-white/[0.06] hover:border-white/[0.1]
              text-gray-400 hover:text-gray-300
              transition-all duration-300"
            aria-label="Back to home"
            data-testid="studio-back-btn"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          </Link>

          {/* Title section */}
          <div className="flex-1 flex items-center gap-3">
            <Crown className="w-5 h-5 text-amber-500/80" />
            <div className="flex items-baseline gap-2">
              <span
                className="text-lg font-black tracking-tight"
                style={{
                  background: 'linear-gradient(180deg, #fcd34d 0%, #f59e0b 50%, #d97706 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                G.O.A.T.
              </span>
              <span className="text-white/20">|</span>
              <h1 className="text-lg font-semibold text-white/80 tracking-tight">
                {title}
              </h1>
            </div>
          </div>

          {/* AI badge */}
          <div className="hidden sm:flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-badge
              bg-white/[0.03] border border-white/[0.06]"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500/60" />
              <span className="text-xs font-medium text-gray-400">{subtitle}</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
