"use client";

import { cn } from "@/lib/utils";

interface GoatMascotProps {
  variant: "searching" | "relaxing" | "waving" | "confused";
  className?: string;
  size?: number;
}

/**
 * GoatMascot — Branded SVG illustrations of a stylized goat character.
 *
 * Variants:
 * - searching: goat with binoculars (no search results)
 * - relaxing: goat lounging (empty categories)
 * - waving: goat waving hello (no rankings / first-time)
 * - confused: goat with tilted head and question mark (validation errors)
 *
 * Uses the amber/gold brand palette (#fbbf24, #f59e0b, #d97706).
 */
export function GoatMascot({ variant, className, size = 120 }: GoatMascotProps) {
  return (
    <div className={cn("inline-flex items-center justify-center", className)}>
      {variant === "searching" && <SearchingGoat size={size} />}
      {variant === "relaxing" && <RelaxingGoat size={size} />}
      {variant === "waving" && <WavingGoat size={size} />}
      {variant === "confused" && <ConfusedGoat size={size} />}
    </div>
  );
}

/** Goat looking through binoculars — "no search results" */
function SearchingGoat({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="goat-gold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fcd34d" />
          <stop offset="50%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
        <radialGradient id="goat-glow">
          <stop offset="0%" stopColor="rgba(251,191,36,0.3)" />
          <stop offset="100%" stopColor="rgba(251,191,36,0)" />
        </radialGradient>
      </defs>
      {/* Ambient glow */}
      <circle cx="60" cy="65" r="45" fill="url(#goat-glow)" />
      {/* Body */}
      <ellipse cx="60" cy="78" rx="22" ry="18" fill="#1e1b18" stroke="url(#goat-gold)" strokeWidth="1.5" />
      {/* Legs */}
      <rect x="44" y="90" width="4" height="14" rx="2" fill="#1e1b18" stroke="#d97706" strokeWidth="1" />
      <rect x="72" y="90" width="4" height="14" rx="2" fill="#1e1b18" stroke="#d97706" strokeWidth="1" />
      {/* Head */}
      <circle cx="60" cy="52" r="16" fill="#1e1b18" stroke="url(#goat-gold)" strokeWidth="1.5" />
      {/* Horns */}
      <path d="M48 42 C44 30, 40 28, 38 32" stroke="#fbbf24" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <path d="M72 42 C76 30, 80 28, 82 32" stroke="#fbbf24" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      {/* Ears */}
      <ellipse cx="44" cy="48" rx="5" ry="3" transform="rotate(-20 44 48)" fill="#1e1b18" stroke="#d97706" strokeWidth="1" />
      <ellipse cx="76" cy="48" rx="5" ry="3" transform="rotate(20 76 48)" fill="#1e1b18" stroke="#d97706" strokeWidth="1" />
      {/* Goatee */}
      <path d="M60 66 C58 72, 60 76, 62 72 Z" fill="#d97706" opacity="0.6" />
      {/* Binoculars */}
      <rect x="48" y="48" width="24" height="10" rx="2" fill="#292524" stroke="#f59e0b" strokeWidth="1" />
      <circle cx="52" cy="53" r="6" fill="#0c0a09" stroke="#fbbf24" strokeWidth="1.5" />
      <circle cx="68" cy="53" r="6" fill="#0c0a09" stroke="#fbbf24" strokeWidth="1.5" />
      {/* Lens glint */}
      <circle cx="50" cy="51" r="1.5" fill="rgba(252,211,77,0.6)" />
      <circle cx="66" cy="51" r="1.5" fill="rgba(252,211,77,0.6)" />
      {/* Arms holding binoculars */}
      <path d="M42 68 C44 60, 46 54, 48 53" stroke="#d97706" strokeWidth="2" strokeLinecap="round" fill="none" />
      <path d="M78 68 C76 60, 74 54, 72 53" stroke="#d97706" strokeWidth="2" strokeLinecap="round" fill="none" />
    </svg>
  );
}

/** Goat lounging — "empty category" */
function RelaxingGoat({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="goat-gold-r" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fcd34d" />
          <stop offset="50%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
        <radialGradient id="goat-glow-r">
          <stop offset="0%" stopColor="rgba(251,191,36,0.25)" />
          <stop offset="100%" stopColor="rgba(251,191,36,0)" />
        </radialGradient>
      </defs>
      {/* Ambient glow */}
      <circle cx="60" cy="70" r="42" fill="url(#goat-glow-r)" />
      {/* Ground line */}
      <line x1="20" y1="98" x2="100" y2="98" stroke="#d97706" strokeWidth="1" opacity="0.3" />
      {/* Body — laying down */}
      <ellipse cx="58" cy="86" rx="28" ry="12" fill="#1e1b18" stroke="url(#goat-gold-r)" strokeWidth="1.5" />
      {/* Front legs tucked */}
      <path d="M36 88 C34 94, 36 98, 38 98" stroke="#d97706" strokeWidth="2" strokeLinecap="round" fill="none" />
      {/* Back legs tucked */}
      <path d="M80 88 C82 94, 82 98, 80 98" stroke="#d97706" strokeWidth="2" strokeLinecap="round" fill="none" />
      {/* Head — tilted, resting */}
      <circle cx="36" cy="68" r="14" fill="#1e1b18" stroke="url(#goat-gold-r)" strokeWidth="1.5" />
      {/* Horns */}
      <path d="M26 58 C22 46, 18 44, 16 48" stroke="#fbbf24" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <path d="M44 56 C46 44, 50 42, 50 46" stroke="#fbbf24" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      {/* Ears */}
      <ellipse cx="24" cy="62" rx="5" ry="3" transform="rotate(-30 24 62)" fill="#1e1b18" stroke="#d97706" strokeWidth="1" />
      <ellipse cx="48" cy="60" rx="5" ry="3" transform="rotate(10 48 60)" fill="#1e1b18" stroke="#d97706" strokeWidth="1" />
      {/* Closed happy eyes */}
      <path d="M30 67 C32 65, 34 65, 36 67" stroke="#fbbf24" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      <path d="M38 66 C40 64, 42 64, 44 66" stroke="#fbbf24" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      {/* Content smile */}
      <path d="M32 73 C34 76, 38 76, 40 73" stroke="#f59e0b" strokeWidth="1" strokeLinecap="round" fill="none" />
      {/* Goatee */}
      <path d="M36 80 C34 84, 36 86, 38 84 Z" fill="#d97706" opacity="0.5" />
      {/* Z z z — sleeping */}
      <text x="52" y="52" fill="#fbbf24" fontSize="10" fontWeight="bold" opacity="0.7">z</text>
      <text x="60" y="44" fill="#fbbf24" fontSize="8" fontWeight="bold" opacity="0.5">z</text>
      <text x="66" y="38" fill="#fbbf24" fontSize="6" fontWeight="bold" opacity="0.3">z</text>
    </svg>
  );
}

/** Goat waving — "no rankings yet / first time" */
function WavingGoat({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="goat-gold-w" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fcd34d" />
          <stop offset="50%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
        <radialGradient id="goat-glow-w">
          <stop offset="0%" stopColor="rgba(251,191,36,0.3)" />
          <stop offset="100%" stopColor="rgba(251,191,36,0)" />
        </radialGradient>
      </defs>
      {/* Ambient glow */}
      <circle cx="60" cy="65" r="45" fill="url(#goat-glow-w)" />
      {/* Body */}
      <ellipse cx="60" cy="80" rx="22" ry="18" fill="#1e1b18" stroke="url(#goat-gold-w)" strokeWidth="1.5" />
      {/* Legs */}
      <rect x="44" y="92" width="4" height="14" rx="2" fill="#1e1b18" stroke="#d97706" strokeWidth="1" />
      <rect x="72" y="92" width="4" height="14" rx="2" fill="#1e1b18" stroke="#d97706" strokeWidth="1" />
      {/* Head */}
      <circle cx="60" cy="52" r="16" fill="#1e1b18" stroke="url(#goat-gold-w)" strokeWidth="1.5" />
      {/* Horns */}
      <path d="M48 42 C44 30, 40 28, 38 32" stroke="#fbbf24" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <path d="M72 42 C76 30, 80 28, 82 32" stroke="#fbbf24" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      {/* Ears */}
      <ellipse cx="44" cy="48" rx="5" ry="3" transform="rotate(-20 44 48)" fill="#1e1b18" stroke="#d97706" strokeWidth="1" />
      <ellipse cx="76" cy="48" rx="5" ry="3" transform="rotate(20 76 48)" fill="#1e1b18" stroke="#d97706" strokeWidth="1" />
      {/* Eyes — friendly */}
      <circle cx="54" cy="50" r="2.5" fill="#fbbf24" />
      <circle cx="66" cy="50" r="2.5" fill="#fbbf24" />
      <circle cx="54.5" cy="49.5" r="1" fill="#0c0a09" />
      <circle cx="66.5" cy="49.5" r="1" fill="#0c0a09" />
      {/* Happy mouth */}
      <path d="M54 58 C56 62, 64 62, 66 58" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      {/* Goatee */}
      <path d="M60 66 C58 72, 60 76, 62 72 Z" fill="#d97706" opacity="0.6" />
      {/* Waving arm — raised */}
      <path d="M82 72 C86 64, 90 52, 92 44" stroke="#d97706" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      {/* Hoof/hand */}
      <circle cx="92" cy="42" r="3.5" fill="#1e1b18" stroke="#fbbf24" strokeWidth="1.5" />
      {/* Other arm */}
      <path d="M38 72 C36 78, 34 82, 36 84" stroke="#d97706" strokeWidth="2" strokeLinecap="round" fill="none" />
      {/* Sparkle near waving hand */}
      <path d="M98 36 L100 32 L102 36 L106 38 L102 40 L100 44 L98 40 L94 38 Z" fill="#fbbf24" opacity="0.6" />
      <path d="M86 30 L87 28 L88 30 L90 31 L88 32 L87 34 L86 32 L84 31 Z" fill="#fcd34d" opacity="0.4" />
    </svg>
  );
}

/** Goat with tilted head and question mark — "validation / something went wrong" */
function ConfusedGoat({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="goat-gold-c" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fcd34d" />
          <stop offset="50%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
        <radialGradient id="goat-glow-c">
          <stop offset="0%" stopColor="rgba(251,191,36,0.3)" />
          <stop offset="100%" stopColor="rgba(251,191,36,0)" />
        </radialGradient>
      </defs>
      {/* Ambient glow */}
      <circle cx="60" cy="65" r="45" fill="url(#goat-glow-c)" />
      {/* Body */}
      <ellipse cx="60" cy="80" rx="22" ry="18" fill="#1e1b18" stroke="url(#goat-gold-c)" strokeWidth="1.5" />
      {/* Legs */}
      <rect x="44" y="92" width="4" height="14" rx="2" fill="#1e1b18" stroke="#d97706" strokeWidth="1" />
      <rect x="72" y="92" width="4" height="14" rx="2" fill="#1e1b18" stroke="#d97706" strokeWidth="1" />
      {/* Head — tilted */}
      <g transform="rotate(-12 60 52)">
        <circle cx="60" cy="52" r="16" fill="#1e1b18" stroke="url(#goat-gold-c)" strokeWidth="1.5" />
        {/* Horns */}
        <path d="M48 42 C44 30, 40 28, 38 32" stroke="#fbbf24" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        <path d="M72 42 C76 30, 80 28, 82 32" stroke="#fbbf24" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        {/* Ears */}
        <ellipse cx="44" cy="48" rx="5" ry="3" transform="rotate(-20 44 48)" fill="#1e1b18" stroke="#d97706" strokeWidth="1" />
        <ellipse cx="76" cy="48" rx="5" ry="3" transform="rotate(20 76 48)" fill="#1e1b18" stroke="#d97706" strokeWidth="1" />
        {/* Eyes — one raised brow */}
        <circle cx="54" cy="50" r="2.5" fill="#fbbf24" />
        <circle cx="66" cy="50" r="2.5" fill="#fbbf24" />
        <circle cx="54.5" cy="49.5" r="1" fill="#0c0a09" />
        <circle cx="66.5" cy="49.5" r="1" fill="#0c0a09" />
        {/* Raised eyebrow */}
        <path d="M62 45 C64 43, 68 43, 70 45" stroke="#fbbf24" strokeWidth="1.5" strokeLinecap="round" fill="none" />
        {/* Confused wavy mouth */}
        <path d="M53 58 C55 60, 57 56, 59 58 C61 60, 63 56, 65 58" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" fill="none" />
        {/* Goatee */}
        <path d="M60 66 C58 72, 60 76, 62 72 Z" fill="#d97706" opacity="0.6" />
      </g>
      {/* Arms — shrug pose */}
      <path d="M38 72 C32 64, 26 62, 22 66" stroke="#d97706" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <path d="M82 72 C88 64, 94 62, 98 66" stroke="#d97706" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      {/* Hooves */}
      <circle cx="22" cy="66" r="3" fill="#1e1b18" stroke="#fbbf24" strokeWidth="1.5" />
      <circle cx="98" cy="66" r="3" fill="#1e1b18" stroke="#fbbf24" strokeWidth="1.5" />
      {/* Question mark */}
      <text x="96" y="40" fill="#fbbf24" fontSize="18" fontWeight="bold" opacity="0.7" fontFamily="'Space Grotesk', sans-serif">?</text>
    </svg>
  );
}
