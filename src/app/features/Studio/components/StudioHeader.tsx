'use client';

/**
 * StudioHeader
 * Clean sticky header for the studio with subtle G.O.A.T. branding
 */

import Link from 'next/link';
import { ArrowLeft, Crown, Wand2 } from 'lucide-react';

export interface StudioHeaderProps {
  /** Optional custom title override */
  title?: string;
  /** Optional custom subtitle override */
  subtitle?: string;
}

/**
 * StudioHeader Component
 * G.O.A.T. branded header with landing page inspired theming
 */
export function StudioHeader({
  title = 'Creation Studio',
  subtitle = 'AI-powered list generation',
}: StudioHeaderProps) {
  return (
    <header className="relative border-b border-gray-800/80 backdrop-blur-xl sticky top-0 z-sticky bg-black/80">
      {/* Subtle top line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-gray-600/30 to-transparent" />

      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center gap-4">
          {/* Back navigation */}
          <Link
            href="/"
            className="group flex items-center justify-center w-10 h-10 rounded-xl
              bg-gray-800/60 border border-gray-700/50
              hover:bg-gray-700/60 hover:border-gray-600/50
              text-gray-400 hover:text-gray-300
              transition-all duration-300"
            aria-label="Back to home"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          </Link>

          {/* Title section with crown */}
          <div className="flex-1 flex items-center gap-3">
            {/* Crown icon */}
            <Crown className="w-5 h-5 text-amber-500/70" />

            {/* G.O.A.T. mini brand + title */}
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
              <span className="text-white/40">|</span>
              <h1 className="text-lg font-semibold text-white/90 tracking-tight">
                {title}
              </h1>
            </div>
          </div>

          {/* Right section - AI badge */}
          <div className="hidden sm:flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full
              bg-gray-800/60 border border-gray-700/50">
              <Wand2 className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-xs font-medium text-gray-400">{subtitle}</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
