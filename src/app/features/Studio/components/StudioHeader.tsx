'use client';

/**
 * StudioHeader
 * Premium sticky header for the List Creation Studio
 * Features gradient accents, glow effects, and smooth transitions
 */

import Link from 'next/link';
import { ArrowLeft, Sparkles } from 'lucide-react';

export interface StudioHeaderProps {
  /** Optional custom title override */
  title?: string;
  /** Optional custom subtitle override */
  subtitle?: string;
}

/**
 * StudioHeader Component
 * Provides navigation and page context with premium visual design
 */
export function StudioHeader({
  title = 'List Creation Studio',
  subtitle = 'Create custom ranking lists with AI-powered generation',
}: StudioHeaderProps) {
  return (
    <header className="border-b border-gray-800/50 bg-gray-950/80 backdrop-blur-xl sticky top-0 z-sticky">
      {/* Subtle top gradient line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />

      <div className="max-w-7xl mx-auto px-6 py-5">
        <div className="flex items-center gap-5">
          {/* Back navigation */}
          <Link
            href="/"
            className="group flex items-center justify-center w-11 h-11 rounded-xl
              bg-gray-800/30 border border-gray-700/50
              hover:bg-gray-800/50 hover:border-cyan-500/30
              text-gray-400 hover:text-cyan-400
              transition-all duration-300"
            aria-label="Back to home"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
          </Link>

          {/* Title section */}
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl
                bg-gradient-to-br from-cyan-500/20 to-purple-500/20
                border border-cyan-500/20">
                <Sparkles className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight">
                  {title}
                </h1>
                <p className="text-sm text-gray-400 mt-0.5">{subtitle}</p>
              </div>
            </div>
          </div>

          {/* Right section - visual accent */}
          <div className="hidden sm:flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full
              bg-gradient-to-r from-cyan-500/10 to-purple-500/10
              border border-gray-700/50">
              <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span className="text-xs font-medium text-gray-400">AI Powered</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
