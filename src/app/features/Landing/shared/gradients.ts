// Premium gradient utilities for the Landing module
// These provide consistent, beautiful gradients matching the MatchGrid "Neon Arena" theme

export const gradients = {
  // Main background gradients - matching MatchGrid dark theme
  dark: `
    linear-gradient(135deg,
      rgba(5, 5, 5, 1) 0%,
      rgba(8, 12, 18, 1) 25%,
      rgba(5, 5, 5, 1) 50%,
      rgba(8, 12, 18, 1) 75%,
      rgba(5, 5, 5, 1) 100%
    )
  `,
  
  // Glassmorphism base
  glass: `
    linear-gradient(135deg,
      rgba(255, 255, 255, 0.08) 0%,
      rgba(255, 255, 255, 0.02) 50%,
      rgba(255, 255, 255, 0.05) 100%
    )
  `,
  
  glassDark: `
    linear-gradient(135deg,
      rgba(5, 5, 5, 0.9) 0%,
      rgba(8, 12, 18, 0.8) 50%,
      rgba(5, 5, 5, 0.9) 100%
    )
  `,

  // Aurora effect gradients - cyan-focused like MatchGrid
  aurora: `
    radial-gradient(ellipse 150% 80% at 50% 0%, 
      rgba(6, 182, 212, 0.12) 0%, 
      transparent 50%
    ),
    radial-gradient(ellipse 100% 60% at 80% 50%, 
      rgba(34, 211, 238, 0.08) 0%, 
      transparent 40%
    ),
    radial-gradient(ellipse 80% 50% at 20% 80%, 
      rgba(6, 182, 212, 0.06) 0%, 
      transparent 40%
    )
  `,
  
  // Mesh gradient for depth - cyan accent
  mesh: `
    radial-gradient(at 40% 20%, rgba(6, 182, 212, 0.08) 0px, transparent 50%),
    radial-gradient(at 80% 0%, rgba(34, 211, 238, 0.05) 0px, transparent 50%),
    radial-gradient(at 0% 50%, rgba(6, 182, 212, 0.04) 0px, transparent 50%),
    radial-gradient(at 80% 50%, rgba(34, 211, 238, 0.03) 0px, transparent 50%),
    radial-gradient(at 0% 100%, rgba(6, 182, 212, 0.05) 0px, transparent 50%),
    radial-gradient(at 80% 100%, rgba(34, 211, 238, 0.04) 0px, transparent 50%)
  `,
  
  // Card shimmer overlay
  shimmer: `
    linear-gradient(
      105deg,
      transparent 20%,
      rgba(255, 255, 255, 0.03) 40%,
      rgba(255, 255, 255, 0.05) 50%,
      rgba(255, 255, 255, 0.03) 60%,
      transparent 80%
    )
  `,

  // MatchGrid-style grid pattern
  neonGrid: `
    linear-gradient(0deg, transparent 24%, #22d3ee 25%, #22d3ee 26%, transparent 27%, transparent 74%, #22d3ee 75%, #22d3ee 76%, transparent 77%, transparent),
    linear-gradient(90deg, transparent 24%, #22d3ee 25%, #22d3ee 26%, transparent 27%, transparent 74%, #22d3ee 75%, #22d3ee 76%, transparent 77%, transparent)
  `,

  // Center radial glow - cyan
  centerGlow: `
    radial-gradient(circle_at_center, rgba(6, 182, 212, 0.15) 0%, rgba(5, 5, 5, 0) 50%, rgba(5, 5, 5, 0) 100%)
  `,

  // Surface gradients — card/panel/dropdown backgrounds
  cardSurface: `rgba(10, 10, 16, 0.8)`,
  featuredCardSurface: `rgba(15, 23, 42, 0.6)`,
  userCardSurface: `linear-gradient(135deg, rgba(20, 28, 48, 0.9), rgba(30, 40, 60, 0.8))`,
  panelSurface: `
    linear-gradient(135deg,
      rgba(15, 23, 42, 0.8) 0%,
      rgba(30, 41, 59, 0.6) 50%,
      rgba(15, 23, 42, 0.8) 100%
    )
  `,
  inputSurface: `
    linear-gradient(135deg,
      rgba(30, 41, 59, 0.8) 0%,
      rgba(51, 65, 85, 0.9) 100%
    )
  `,
  dropdownSurface: `
    linear-gradient(135deg,
      rgba(15, 23, 42, 0.98) 0%,
      rgba(30, 41, 59, 0.98) 100%
    )
  `,
  modalSurface: `linear-gradient(135deg, rgba(15, 20, 35, 0.98), rgba(25, 35, 55, 0.98))`,

  // Amber/brand gradients — G.O.A.T. title and accents
  amberTitle: `
    linear-gradient(180deg,
      #fff9e6 0%,
      #fcd34d 15%,
      #fbbf24 30%,
      #f59e0b 50%,
      #d97706 70%,
      #b45309 85%,
      #92400e 100%
    )
  `,
  amberDot: `linear-gradient(180deg, #fcd34d 0%, #f59e0b 100%)`,
  amberAccent: `linear-gradient(135deg, #fcd34d 0%, #f59e0b 100%)`,
  amberGlow: `radial-gradient(circle, rgba(251, 191, 36, 0.4) 0%, transparent 60%)`,
  amberBgGlow: `radial-gradient(ellipse at center, rgba(251, 191, 36, 0.2) 0%, rgba(245, 158, 11, 0.1) 30%, transparent 60%)`,
  amberSubtitle: `linear-gradient(90deg, rgba(251, 191, 36, 0.6), #fbbf24, rgba(251, 191, 36, 0.6))`,
  amberSubtitleGlow: `radial-gradient(ellipse at center, rgba(251, 191, 36, 0.1) 0%, transparent 70%)`,
  amberRay: `linear-gradient(to bottom, rgba(251, 191, 36, 0.3), transparent)`,
  amberLineLeft: `linear-gradient(90deg, transparent, rgba(251, 191, 36, 0.8))`,
  amberLineRight: `linear-gradient(90deg, rgba(251, 191, 36, 0.8), transparent)`,
  amberButton: `linear-gradient(135deg, rgba(251, 191, 36, 0.15), rgba(245, 158, 11, 0.12))`,

  // Action button gradients
  actionPlay: `linear-gradient(135deg, rgba(59, 130, 246, 0.9), rgba(139, 92, 246, 0.9))`,
  actionDelete: `linear-gradient(135deg, rgba(220, 38, 38, 0.9), rgba(185, 28, 28, 0.9))`,
} as const;

// Dynamic gradient generators
export const createGlowGradient = (color: string, intensity: number = 0.15) => `
  radial-gradient(ellipse 60% 40% at 50% 0%, 
    ${color}${Math.round(intensity * 255).toString(16).padStart(2, '0')} 0%, 
    transparent 70%
  )
`;

export const createCardGradient = (primary: string, secondary: string) => `
  linear-gradient(135deg,
    ${primary}08 0%,
    transparent 40%,
    ${secondary}05 100%
  )
`;

export const createBorderGlow = (color: string) => `
  0 0 40px ${color}15,
  0 0 80px ${color}08,
  inset 0 1px 0 rgba(255, 255, 255, 0.05)
`;
