'use client';

import { cn } from '@/lib/utils';

interface IllustrationProps {
  className?: string;
  width?: number;
  height?: number;
}

/**
 * Confused goat tangled in ethernet cables - for network errors
 * 120x120px, flat geometric style, red-500 accent
 */
export function GoatNetworkError({ className, width = 120, height = 120 }: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      width={width}
      height={height}
      className={cn('opacity-85', className)}
    >
      <defs>
        <radialGradient id="net-err-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ef4444" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="cable-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ef4444" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#ef4444" stopOpacity="0.2" />
        </linearGradient>
      </defs>

      <circle cx="60" cy="60" r="55" fill="url(#net-err-glow)" />

      {/* Goat body */}
      <ellipse cx="60" cy="72" rx="18" ry="14" stroke="#a1a1aa" strokeWidth="1.5" fill="none" strokeOpacity="0.35" />

      {/* Goat head */}
      <circle cx="60" cy="48" r="12" stroke="#a1a1aa" strokeWidth="1.5" fill="none" strokeOpacity="0.35" />

      {/* Horns */}
      <path d="M50 42c-3-6-2-12 1-14" stroke="#a1a1aa" strokeWidth="1.5" strokeOpacity="0.3" strokeLinecap="round" fill="none" />
      <path d="M70 42c3-6 2-12-1-14" stroke="#a1a1aa" strokeWidth="1.5" strokeOpacity="0.3" strokeLinecap="round" fill="none" />

      {/* Confused eyes - X shapes */}
      <g strokeWidth="1.5" stroke="#ef4444" strokeOpacity="0.6" strokeLinecap="round">
        <line x1="54" y1="45" x2="57" y2="48" />
        <line x1="57" y1="45" x2="54" y2="48" />
        <line x1="63" y1="45" x2="66" y2="48" />
        <line x1="66" y1="45" x2="63" y2="48" />
      </g>

      {/* Mouth - wavy confused line */}
      <path d="M56 54c1 1 3 1 4 0s3-1 4 0" stroke="#a1a1aa" strokeWidth="1" strokeOpacity="0.25" strokeLinecap="round" fill="none" />

      {/* Goat beard */}
      <path d="M60 56v5" stroke="#a1a1aa" strokeWidth="1" strokeOpacity="0.2" strokeLinecap="round" />

      {/* Legs */}
      <line x1="48" y1="82" x2="46" y2="96" stroke="#a1a1aa" strokeWidth="1.5" strokeOpacity="0.25" strokeLinecap="round" />
      <line x1="54" y1="84" x2="53" y2="96" stroke="#a1a1aa" strokeWidth="1.5" strokeOpacity="0.25" strokeLinecap="round" />
      <line x1="66" y1="84" x2="67" y2="96" stroke="#a1a1aa" strokeWidth="1.5" strokeOpacity="0.25" strokeLinecap="round" />
      <line x1="72" y1="82" x2="74" y2="96" stroke="#a1a1aa" strokeWidth="1.5" strokeOpacity="0.25" strokeLinecap="round" />

      {/* Ethernet cables tangled around body */}
      <path d="M20 30c15 5 10 25 40 30s15 20 35 25" stroke="url(#cable-grad)" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <path d="M95 25c-10 10-20 15-30 25s-25 10-40 20" stroke="url(#cable-grad)" strokeWidth="2" strokeLinecap="round" fill="none" strokeDasharray="6 4" />

      {/* Cable connector plugs */}
      <rect x="14" y="27" width="8" height="6" rx="1" stroke="#ef4444" strokeOpacity="0.4" strokeWidth="1" fill="none" />
      <rect x="92" y="22" width="8" height="6" rx="1" stroke="#ef4444" strokeOpacity="0.35" strokeWidth="1" fill="none" />

      {/* Disconnect spark */}
      <circle cx="35" cy="45" r="2" fill="#ef4444" opacity="0.4">
        <animate attributeName="opacity" values="0.4;0.15;0.4" dur="1.5s" repeatCount="indefinite" />
      </circle>
      <circle cx="85" cy="50" r="1.5" fill="#ef4444" opacity="0.3">
        <animate attributeName="opacity" values="0.3;0.1;0.3" dur="2s" repeatCount="indefinite" />
      </circle>

      {/* Question marks floating */}
      <text x="82" y="38" fill="#ef4444" fillOpacity="0.25" fontSize="10" fontFamily="sans-serif" fontWeight="600">?</text>
      <text x="30" y="92" fill="#ef4444" fillOpacity="0.2" fontSize="8" fontFamily="sans-serif" fontWeight="600">?</text>
    </svg>
  );
}

/**
 * Goat shrugging with a broken cloud - for server errors
 * 120x120px, flat geometric style, red-500 accent
 */
export function GoatServerError({ className, width = 120, height = 120 }: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      width={width}
      height={height}
      className={cn('opacity-85', className)}
    >
      <defs>
        <radialGradient id="srv-err-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ef4444" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
        </radialGradient>
      </defs>

      <circle cx="60" cy="60" r="55" fill="url(#srv-err-glow)" />

      {/* Broken cloud - left half */}
      <path
        d="M25 42c0-8 7-14 15-14 2-6 8-10 15-10 8 0 14 5 16 12"
        stroke="#ef4444" strokeWidth="1.5" strokeOpacity="0.35" strokeLinecap="round" fill="none"
      />
      <line x1="25" y1="42" x2="55" y2="42" stroke="#ef4444" strokeWidth="1.5" strokeOpacity="0.35" strokeLinecap="round" />

      {/* Broken cloud - right half (offset with gap) */}
      <path
        d="M68 42c2-7 8-12 16-12 8 0 14 6 14 14"
        stroke="#ef4444" strokeWidth="1.5" strokeOpacity="0.35" strokeLinecap="round" fill="none"
      />
      <line x1="68" y1="42" x2="98" y2="42" stroke="#ef4444" strokeWidth="1.5" strokeOpacity="0.35" strokeLinecap="round" />

      {/* Crack/break in cloud */}
      <path d="M57 36l3 6-2 4" stroke="#ef4444" strokeWidth="1.5" strokeOpacity="0.5" strokeLinecap="round" fill="none" />
      <path d="M66 36l-3 6 2 4" stroke="#ef4444" strokeWidth="1.5" strokeOpacity="0.5" strokeLinecap="round" fill="none" />

      {/* Goat body */}
      <ellipse cx="60" cy="82" rx="16" ry="12" stroke="#a1a1aa" strokeWidth="1.5" fill="none" strokeOpacity="0.35" />

      {/* Goat head */}
      <circle cx="60" cy="60" r="10" stroke="#a1a1aa" strokeWidth="1.5" fill="none" strokeOpacity="0.35" />

      {/* Horns */}
      <path d="M52 55c-2-5-1-9 1-11" stroke="#a1a1aa" strokeWidth="1.5" strokeOpacity="0.3" strokeLinecap="round" fill="none" />
      <path d="M68 55c2-5 1-9-1-11" stroke="#a1a1aa" strokeWidth="1.5" strokeOpacity="0.3" strokeLinecap="round" fill="none" />

      {/* Eyes - raised eyebrows for shrug */}
      <circle cx="56" cy="58" r="1.5" fill="#a1a1aa" fillOpacity="0.4" />
      <circle cx="64" cy="58" r="1.5" fill="#a1a1aa" fillOpacity="0.4" />
      <path d="M53 55.5c1-1 2.5-1 3.5 0" stroke="#a1a1aa" strokeWidth="0.8" strokeOpacity="0.3" fill="none" />
      <path d="M63 55.5c1-1 2.5-1 3.5 0" stroke="#a1a1aa" strokeWidth="0.8" strokeOpacity="0.3" fill="none" />

      {/* Mouth - flat line shrug */}
      <line x1="57" y1="64" x2="63" y2="64" stroke="#a1a1aa" strokeWidth="1" strokeOpacity="0.25" strokeLinecap="round" />

      {/* Beard */}
      <path d="M60 66v4" stroke="#a1a1aa" strokeWidth="1" strokeOpacity="0.2" strokeLinecap="round" />

      {/* Shrugging arms raised */}
      <path d="M44 76c-4-3-8-8-10-14" stroke="#a1a1aa" strokeWidth="1.5" strokeOpacity="0.25" strokeLinecap="round" fill="none" />
      <path d="M76 76c4-3 8-8 10-14" stroke="#a1a1aa" strokeWidth="1.5" strokeOpacity="0.25" strokeLinecap="round" fill="none" />

      {/* Shrug hands - open palms */}
      <circle cx="32" cy="61" r="3" stroke="#a1a1aa" strokeWidth="1" strokeOpacity="0.2" fill="none" />
      <circle cx="88" cy="61" r="3" stroke="#a1a1aa" strokeWidth="1" strokeOpacity="0.2" fill="none" />

      {/* Legs */}
      <line x1="50" y1="92" x2="48" y2="104" stroke="#a1a1aa" strokeWidth="1.5" strokeOpacity="0.25" strokeLinecap="round" />
      <line x1="56" y1="93" x2="55" y2="104" stroke="#a1a1aa" strokeWidth="1.5" strokeOpacity="0.25" strokeLinecap="round" />
      <line x1="64" y1="93" x2="65" y2="104" stroke="#a1a1aa" strokeWidth="1.5" strokeOpacity="0.25" strokeLinecap="round" />
      <line x1="70" y1="92" x2="72" y2="104" stroke="#a1a1aa" strokeWidth="1.5" strokeOpacity="0.25" strokeLinecap="round" />

      {/* Falling debris from cloud */}
      <circle cx="50" cy="48" r="1" fill="#ef4444" opacity="0.3">
        <animate attributeName="opacity" values="0.3;0.1;0.3" dur="2s" repeatCount="indefinite" />
      </circle>
      <circle cx="70" cy="50" r="1.5" fill="#ef4444" opacity="0.25">
        <animate attributeName="opacity" values="0.25;0.08;0.25" dur="2.5s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

/**
 * Goat balancing two stacks of items - for quota exceeded errors
 * 120x120px, flat geometric style, amber-500 accent
 */
export function GoatQuotaExceeded({ className, width = 120, height = 120 }: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      width={width}
      height={height}
      className={cn('opacity-85', className)}
    >
      <defs>
        <radialGradient id="quota-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="stack-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.15" />
        </linearGradient>
      </defs>

      <circle cx="60" cy="60" r="55" fill="url(#quota-glow)" />

      {/* Goat body */}
      <ellipse cx="60" cy="78" rx="14" ry="11" stroke="#a1a1aa" strokeWidth="1.5" fill="none" strokeOpacity="0.35" />

      {/* Goat head */}
      <circle cx="60" cy="56" r="10" stroke="#a1a1aa" strokeWidth="1.5" fill="none" strokeOpacity="0.35" />

      {/* Horns */}
      <path d="M52 51c-2-5-1-9 1-11" stroke="#a1a1aa" strokeWidth="1.5" strokeOpacity="0.3" strokeLinecap="round" fill="none" />
      <path d="M68 51c2-5 1-9-1-11" stroke="#a1a1aa" strokeWidth="1.5" strokeOpacity="0.3" strokeLinecap="round" fill="none" />

      {/* Eyes - worried/strained */}
      <circle cx="56" cy="55" r="1.5" fill="#a1a1aa" fillOpacity="0.4" />
      <circle cx="64" cy="55" r="1.5" fill="#a1a1aa" fillOpacity="0.4" />
      {/* Sweat drop */}
      <path d="M70 52l1-3 1 3a1 1 0 0 1-2 0z" fill="#f59e0b" fillOpacity="0.35" />

      {/* Worried mouth */}
      <path d="M57 61c1 1.5 2.5 1.5 3 1s2-0.5 3-1" stroke="#a1a1aa" strokeWidth="0.8" strokeOpacity="0.25" fill="none" strokeLinecap="round" />

      {/* Beard */}
      <path d="M60 63v3" stroke="#a1a1aa" strokeWidth="1" strokeOpacity="0.2" strokeLinecap="round" />

      {/* Arms extended holding stacks */}
      <line x1="46" y1="74" x2="28" y2="55" stroke="#a1a1aa" strokeWidth="1.5" strokeOpacity="0.25" strokeLinecap="round" />
      <line x1="74" y1="74" x2="92" y2="55" stroke="#a1a1aa" strokeWidth="1.5" strokeOpacity="0.25" strokeLinecap="round" />

      {/* Left stack of items (taller, wobbling) */}
      <g>
        <rect x="18" y="42" width="16" height="6" rx="1" stroke="url(#stack-grad)" strokeWidth="1" fill="none" />
        <rect x="18" y="34" width="16" height="6" rx="1" stroke="url(#stack-grad)" strokeWidth="1" fill="none" />
        <rect x="17" y="26" width="16" height="6" rx="1" stroke="url(#stack-grad)" strokeWidth="1" fill="none" transform="rotate(-3 25 29)" />
        <rect x="16" y="18" width="16" height="6" rx="1" stroke="url(#stack-grad)" strokeWidth="1" fill="none" transform="rotate(-6 24 21)" />
        {/* Wobble lines */}
        <line x1="15" y1="16" x2="12" y2="13" stroke="#f59e0b" strokeOpacity="0.3" strokeWidth="1" strokeLinecap="round" />
        <line x1="14" y1="20" x2="11" y2="19" stroke="#f59e0b" strokeOpacity="0.2" strokeWidth="0.8" strokeLinecap="round" />
      </g>

      {/* Right stack of items */}
      <g>
        <rect x="84" y="42" width="16" height="6" rx="1" stroke="url(#stack-grad)" strokeWidth="1" fill="none" />
        <rect x="84" y="34" width="16" height="6" rx="1" stroke="url(#stack-grad)" strokeWidth="1" fill="none" />
        <rect x="85" y="26" width="16" height="6" rx="1" stroke="url(#stack-grad)" strokeWidth="1" fill="none" transform="rotate(2 93 29)" />
      </g>

      {/* Legs */}
      <line x1="52" y1="87" x2="50" y2="100" stroke="#a1a1aa" strokeWidth="1.5" strokeOpacity="0.25" strokeLinecap="round" />
      <line x1="57" y1="88" x2="56" y2="100" stroke="#a1a1aa" strokeWidth="1.5" strokeOpacity="0.25" strokeLinecap="round" />
      <line x1="63" y1="88" x2="64" y2="100" stroke="#a1a1aa" strokeWidth="1.5" strokeOpacity="0.25" strokeLinecap="round" />
      <line x1="68" y1="87" x2="70" y2="100" stroke="#a1a1aa" strokeWidth="1.5" strokeOpacity="0.25" strokeLinecap="round" />

      {/* Overflow indicator - plus sign that won't fit */}
      <text x="95" y="22" fill="#f59e0b" fillOpacity="0.35" fontSize="12" fontFamily="sans-serif" fontWeight="700">+</text>

      {/* Warning sparkles */}
      <circle cx="10" cy="35" r="1.5" fill="#f59e0b" opacity="0.3">
        <animate attributeName="opacity" values="0.3;0.1;0.3" dur="1.8s" repeatCount="indefinite" />
      </circle>
      <circle cx="110" cy="30" r="1" fill="#f59e0b" opacity="0.25">
        <animate attributeName="opacity" values="0.25;0.08;0.25" dur="2.2s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

/**
 * Determines which error illustration to show based on the error message string.
 * Falls back to GoatServerError for unrecognized errors.
 */
export type SyncErrorType = 'network' | 'server' | 'quota';

export function classifySyncError(error: string | null): SyncErrorType {
  if (!error) return 'server';
  const lower = error.toLowerCase();
  if (lower.includes('network') || lower.includes('offline') || lower.includes('fetch') || lower.includes('connect') || lower.includes('timeout') || lower.includes('dns')) {
    return 'network';
  }
  if (lower.includes('quota') || lower.includes('storage') || lower.includes('exceeded') || lower.includes('full') || lower.includes('space')) {
    return 'quota';
  }
  return 'server';
}

export function SyncErrorIllustration({
  error,
  className,
  width = 80,
  height = 80,
}: IllustrationProps & { error: string | null }) {
  const type = classifySyncError(error);

  switch (type) {
    case 'network':
      return <GoatNetworkError className={className} width={width} height={height} />;
    case 'quota':
      return <GoatQuotaExceeded className={className} width={width} height={height} />;
    case 'server':
    default:
      return <GoatServerError className={className} width={width} height={height} />;
  }
}
