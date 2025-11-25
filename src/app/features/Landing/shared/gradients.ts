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
