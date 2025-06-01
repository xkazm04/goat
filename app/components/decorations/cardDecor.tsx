{/* Animated Border Gradient */ }
export const BorderGradient = () => {
    return <div
        className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700"
        style={{
            background: `
            linear-gradient(45deg, 
              #3b82f6, #8b5cf6, #06b6d4, #10b981, #f59e0b, #ef4444, #3b82f6
            )
          `,
            backgroundSize: '300% 300%',
            animation: 'gradientShift 6s ease infinite',
            zIndex: -1
        }}
    />
}

{/* Subtle Pattern Overlay */ }
export const PatternOverlay = () => {
    return <div
        className="absolute inset-0 opacity-[0.08] pointer-events-none"
        style={{
            backgroundImage: `
            radial-gradient(circle at 25% 25%, #60a5fa 2px, transparent 2px),
            radial-gradient(circle at 75% 75%, #a78bfa 1px, transparent 1px)
          `,
            backgroundSize: '24px 24px'
        }}
    />
}