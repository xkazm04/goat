# Compact UI Design Skill

**Purpose**: Design and implement space-efficient, visually appealing UI components for the Vibeman project using established patterns and best practices.

---

## Core Design Principles

### 1. Space Efficiency
- **Compact layouts**: Single-row designs where possible
- **Absolute positioning**: Use for fixed elements (like numbering) to free horizontal space
- **Smart spacing**: Balance density with readability
- **Responsive widths**: Combine fixed-width + flexible elements (`flex-1`)

### 2. Visual Hierarchy
- **Size variations**: Use subtle size differences (text-xs, text-sm, text-base)
- **Color contrast**: Important elements in white/cyan, secondary in gray-400
- **Borders and backgrounds**: Layered depth with `/10`, `/20`, `/30`, `/40`, `/50` opacity variations

### 3. Consistent Typography Scale
```
- Headers: text-base (16px) or text-sm (14px)
- Body text: text-xs (12px)
- Labels: text-xs (12px)
- Micro text: text-xs with text-gray-500
```

### 4. Icon Sizing
```
- Large icons (headers): w-5 h-5 or w-4 h-4
- Standard icons: w-3.5 h-3.5
- Small icons: w-3 h-3
```

---

## Color Palette

### Primary Colors (Cyan/Blue Accent)
```tsx
// Gradients
bg-gradient-to-r from-cyan-500 to-blue-500
hover:from-cyan-400 hover:to-blue-400

// Borders
border-cyan-500/30  // 30% opacity
border-cyan-500/50  // 50% opacity

// Backgrounds
bg-cyan-500/10     // Very subtle
bg-cyan-500/20     // Subtle

// Text
text-cyan-400      // Primary cyan text
```

### Neutral Grays
```tsx
// Backgrounds (darkest to lightest)
bg-gray-900        // Deepest background
bg-gray-800        // Secondary background
bg-gray-700        // Tertiary background

// With opacity for layering
bg-gray-900/50     // 50% transparent
bg-gray-800/40     // 40% transparent
bg-gray-700/50     // 50% transparent

// Borders
border-gray-700/50
border-gray-600/50

// Text
text-white         // Primary text
text-gray-300      // Secondary text
text-gray-400      // Tertiary text
text-gray-500      // Subtle text
```

### Semantic Colors
```tsx
// Success
text-green-400
bg-green-500/10
border-green-500/30

// Error/Danger
text-red-400
bg-red-500/10
border-red-500/30
hover:bg-red-500/10

// Warning
text-yellow-400
bg-yellow-500/10
```

---

## Component Patterns

### Modal Structure
```tsx
// Full-screen overlay
<div className="fixed inset-0 z-50 flex items-center justify-center">
  {/* Backdrop */}
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    onClick={onClose}
    className="absolute inset-0 bg-black/70 backdrop-blur-sm"
  />

  {/* Modal Container */}
  <motion.div
    initial={{ scale: 0.9, opacity: 0, y: 20 }}
    animate={{ scale: 1, opacity: 1, y: 0 }}
    exit={{ scale: 0.9, opacity: 0, y: 20 }}
    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
    className="relative w-full max-w-7xl max-h-[90vh] bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border-2 border-cyan-500/30 rounded-xl shadow-2xl shadow-cyan-500/20 flex flex-col"
  >
    {/* Header */}
    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700/50">
      {/* ... */}
    </div>

    {/* Content - Scrollable */}
    <div className="flex-1 overflow-y-auto p-4">
      {/* ... */}
    </div>

    {/* Footer */}
    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-700/50 bg-gray-800/50">
      {/* ... */}
    </div>
  </motion.div>
</div>
```

### Single-Row Compact Form Layout
```tsx
<div className="relative bg-gray-800/40 border border-gray-700/50 rounded-lg overflow-hidden pl-10">
  {/* Absolute Positioned Number/Icon */}
  <div className="absolute left-2 top-3 w-6 h-6 bg-cyan-500/10 border border-cyan-500/30 rounded flex items-center justify-center text-xs font-mono text-cyan-400">
    {index + 1}
  </div>

  {/* Main Content Row */}
  <div className="py-2.5 pr-3">
    <div className="flex items-center gap-2">
      {/* Expand/Collapse Button */}
      <button className="p-0.5 hover:bg-gray-700/50 rounded transition-colors flex-shrink-0">
        <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
      </button>

      {/* Fixed Width Input */}
      <input
        type="text"
        className="w-64 px-2 py-1.5 bg-gray-900/50 border border-gray-600/50 rounded text-xs text-white placeholder-gray-500 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 outline-none transition-all font-mono"
      />

      {/* Flexible Width Input */}
      <input
        type="text"
        className="flex-1 min-w-0 px-2 py-1.5 bg-gray-900/50 border border-gray-600/50 rounded text-xs text-gray-300 placeholder-gray-500 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 outline-none transition-all"
      />

      {/* Checkbox with Label */}
      <label className="flex items-center gap-1.5 cursor-pointer flex-shrink-0 px-2">
        <input
          type="checkbox"
          className="w-3.5 h-3.5 rounded border-gray-600 bg-gray-900/50 text-cyan-500 focus:ring-cyan-500/50 focus:ring-offset-0"
        />
        <span className="text-xs text-gray-400 whitespace-nowrap">Label</span>
      </label>

      {/* Badge/Count */}
      <div className="flex-shrink-0 px-2 py-1 bg-gray-900/50 border border-gray-600/50 rounded text-xs text-gray-500 min-w-[60px] text-center">
        Count
      </div>

      {/* Action Button */}
      <button className="p-1 hover:bg-red-500/10 rounded transition-colors text-gray-400 hover:text-red-400 flex-shrink-0">
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  </div>
</div>
```

### Button Patterns
```tsx
// Primary Action Button
<motion.button
  whileHover={{ scale: 1.05 }}
  whileTap={{ scale: 0.95 }}
  className="px-4 py-1.5 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white rounded-lg text-xs font-medium transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
>
  <Icon className="w-3.5 h-3.5" />
  <span>Action</span>
</motion.button>

// Secondary/Ghost Button
<button className="px-3 py-1.5 text-xs font-medium text-gray-400 hover:text-white transition-colors">
  Cancel
</button>

// Icon Button
<button className="p-1.5 hover:bg-gray-700/50 rounded-lg transition-colors">
  <Icon className="w-4 h-4 text-gray-400" />
</button>

// Danger Button
<button className="p-1 hover:bg-red-500/10 rounded transition-colors text-gray-400 hover:text-red-400">
  <Trash2 className="w-3.5 h-3.5" />
</button>

// Dashed Add Button
<motion.button
  whileHover={{ scale: 1.01 }}
  whileTap={{ scale: 0.99 }}
  className="w-full p-3 border-2 border-dashed border-gray-600/50 hover:border-cyan-500/50 rounded-lg text-gray-400 hover:text-cyan-400 transition-all flex items-center justify-center gap-2"
>
  <Plus className="w-3.5 h-3.5" />
  <span className="text-xs font-medium">Add New</span>
</motion.button>
```

### Input Fields
```tsx
// Text Input
<input
  type="text"
  className="w-full px-2 py-1.5 bg-gray-900/50 border border-gray-600/50 rounded text-xs text-white placeholder-gray-500 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 outline-none transition-all"
/>

// Monospace Input (for paths, code)
<input
  type="text"
  className="w-full px-2 py-1.5 bg-gray-900/50 border border-gray-600/50 rounded text-xs text-white placeholder-gray-500 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 outline-none transition-all font-mono"
/>

// Checkbox
<input
  type="checkbox"
  className="w-3.5 h-3.5 rounded border-gray-600 bg-gray-900/50 text-cyan-500 focus:ring-cyan-500/50 focus:ring-offset-0"
/>
```

---

## Animation Patterns (Framer Motion)

### Modal Animations
```tsx
// Backdrop
<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  exit={{ opacity: 0 }}
/>

// Modal Container
<motion.div
  initial={{ scale: 0.9, opacity: 0, y: 20 }}
  animate={{ scale: 1, opacity: 1, y: 0 }}
  exit={{ scale: 0.9, opacity: 0, y: 20 }}
  transition={{ type: 'spring', damping: 25, stiffness: 300 }}
/>
```

### List Item Animations
```tsx
<motion.div
  initial={{ opacity: 0, y: -10 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, x: -20 }}
/>
```

### Expand/Collapse
```tsx
<motion.div
  initial={{ height: 0, opacity: 0 }}
  animate={{ height: 'auto', opacity: 1 }}
  exit={{ height: 0, opacity: 0 }}
/>
```

### Button Interactions
```tsx
<motion.button
  whileHover={{ scale: 1.05 }}
  whileTap={{ scale: 0.95 }}
/>

// Subtle for large buttons
<motion.button
  whileHover={{ scale: 1.01 }}
  whileTap={{ scale: 0.99 }}
/>
```

### Radiating Glow Effect
```tsx
<motion.div className="absolute inset-0 rounded-lg pointer-events-none overflow-hidden" style={{ zIndex: -1 }}>
  {/* Wave 1 - Inner */}
  <motion.div
    className="absolute inset-0"
    style={{
      background: 'radial-gradient(circle at center, rgba(34, 211, 238, 0.4) 0%, rgba(59, 130, 246, 0.2) 30%, transparent 70%)',
    }}
    animate={{ scale: [0.5, 1.4], opacity: [0.8, 0] }}
    transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
  />
  {/* Wave 2 - Middle (delay: 0.3s) */}
  <motion.div
    className="absolute inset-0"
    style={{
      background: 'radial-gradient(circle at center, rgba(34, 211, 238, 0.3) 0%, rgba(59, 130, 246, 0.15) 30%, transparent 70%)',
    }}
    animate={{ scale: [0.5, 1.4], opacity: [0.6, 0] }}
    transition={{ duration: 2, repeat: Infinity, ease: 'easeOut', delay: 0.3 }}
  />
  {/* Wave 3 - Outer (delay: 0.6s) */}
  <motion.div
    className="absolute inset-0"
    style={{
      background: 'radial-gradient(circle at center, rgba(34, 211, 238, 0.2) 0%, rgba(59, 130, 246, 0.1) 30%, transparent 70%)',
    }}
    animate={{ scale: [0.5, 1.4], opacity: [0.4, 0] }}
    transition={{ duration: 2, repeat: Infinity, ease: 'easeOut', delay: 0.6 }}
  />
</motion.div>
```

---

## Spacing Scale

### Padding
```
py-1     = 4px   (tight)
py-1.5   = 6px   (very compact)
py-2     = 8px   (compact)
py-2.5   = 10px  (compact+)
py-3     = 12px  (standard)
py-4     = 16px  (comfortable)
```

### Gap
```
gap-1    = 4px   (tight)
gap-1.5  = 6px   (compact)
gap-2    = 8px   (standard)
gap-2.5  = 10px  (comfortable)
gap-3    = 12px  (spacious)
```

### Space Between Elements
```
space-y-1    = 4px   (very tight list)
space-y-1.5  = 6px   (tight list)
space-y-2    = 8px   (compact list)
space-y-3    = 12px  (standard list)
```

---

## Layout Patterns

### Absolute Positioning for Fixed Elements
```tsx
// Use for numbering, status indicators, etc.
<div className="relative pl-10">
  <div className="absolute left-2 top-3 w-6 h-6 ...">
    {index}
  </div>
  <div className="py-2.5 pr-3">
    {/* Main content */}
  </div>
</div>
```

### Flex Layouts
```tsx
// Standard horizontal layout
<div className="flex items-center gap-2">
  <div className="flex-shrink-0">{/* Fixed width */}</div>
  <div className="flex-1 min-w-0">{/* Flexible width */}</div>
  <div className="flex-shrink-0">{/* Fixed width */}</div>
</div>

// Space between with alignment
<div className="flex items-center justify-between">
  <div>{/* Left */}</div>
  <div>{/* Right */}</div>
</div>
```

### Modal Sizing
```tsx
// Small modal
max-w-2xl

// Medium modal
max-w-4xl

// Large modal
max-w-5xl

// Extra large modal (for dense content)
max-w-7xl

// Always pair with max height
max-h-[90vh]
```

---

## Best Practices

### 1. Always Use Framer Motion for Interactivity
- Modals: scale + opacity + y translation
- Lists: staggered fade-in
- Buttons: scale on hover/tap
- Sections: height animation for expand/collapse

### 2. Consistent Border Radius
```
rounded      = 4px   (small elements)
rounded-lg   = 8px   (standard)
rounded-xl   = 12px  (cards, modals)
```

### 3. Shadow Layering
```tsx
// Standard elevation
shadow-lg

// With colored glow (for primary elements)
shadow-2xl shadow-cyan-500/20

// Subtle elevation
shadow-md
```

### 4. Loading States
```tsx
<div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
```

### 5. Disabled States
```tsx
disabled:opacity-50
disabled:cursor-not-allowed
```

### 6. Focus States (Always Include)
```tsx
focus:border-cyan-500/50
focus:ring-1
focus:ring-cyan-500/50
focus:ring-offset-0
outline-none
```

### 7. Hover Transitions (Always Smooth)
```tsx
transition-all        // For multiple properties
transition-colors     // For color changes only
```

---

## Component Structure Template

```tsx
'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Icon1, Icon2 } from 'lucide-react';

interface ComponentProps {
  // Props here
}

export default function CompactComponent({
  // Destructure props
}: ComponentProps) {
  const [state, setState] = useState();

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        />

        {/* Main Container */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-7xl max-h-[90vh] bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border-2 border-cyan-500/30 rounded-xl shadow-2xl shadow-cyan-500/20 flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700/50">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-cyan-500/10 rounded-lg border border-cyan-500/30">
                <Icon1 className="w-4 h-4 text-cyan-400" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-white">Title</h2>
                <p className="text-xs text-gray-400 mt-0.5">Subtitle</p>
              </div>
            </div>
            <button className="p-1.5 hover:bg-gray-700/50 rounded-lg transition-colors">
              <Icon2 className="w-4 h-4 text-gray-400" />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-2">
              {/* Content here */}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-700/50 bg-gray-800/50">
            <button className="px-3 py-1.5 text-xs font-medium text-gray-400 hover:text-white transition-colors">
              Secondary Action
            </button>
            <div className="flex items-center gap-2">
              <button className="px-3 py-1.5 text-xs font-medium text-gray-400 hover:text-white transition-colors">
                Cancel
              </button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-4 py-1.5 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white rounded-lg text-xs font-medium transition-all shadow-lg shadow-cyan-500/20 flex items-center gap-1.5"
              >
                <Icon1 className="w-3.5 h-3.5" />
                <span>Primary Action</span>
              </motion.button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
```

---

## Usage Instructions

When designing new UI components:

1. **Start with the template** above and adapt
2. **Prioritize space efficiency** - use single-row layouts where possible
3. **Use absolute positioning** for fixed elements like numbering
4. **Apply consistent spacing** from the scale (prefer smaller values)
5. **Use the color palette** exactly as specified
6. **Add Framer Motion** animations for all interactive elements
7. **Ensure all inputs have focus states**
8. **Test with varying content lengths** to ensure layout holds
9. **Use flex-shrink-0** for elements that shouldn't compress
10. **Use flex-1 min-w-0** for elements that should expand

---

---

## Blueprint Design System

### Overview
The Blueprint system represents a high-quality, videogame-inspired design pattern used for control panels and scan orchestration interfaces.

### Core Characteristics
- **Technical/Industrial Aesthetic**: Blueprint grid patterns, cyan/blue accent colors
- **Hand-Written Typography**: Caveat font for labels with rotation transforms
- **Illuminated Buttons**: Circular cockpit-style buttons with glass effects
- **Scan Status Tracking**: Real-time progress with visual feedback
- **Layered Backgrounds**: Multiple grid sizes, animated scan lines, vignette effects

### Blueprint Grid Background Pattern
```tsx
{/* Fine grid lines */}
<div
  className="absolute inset-0"
  style={{
    backgroundImage: `
      linear-gradient(rgba(59, 130, 246, 0.05) 1px, transparent 1px),
      linear-gradient(90deg, rgba(59, 130, 246, 0.05) 1px, transparent 1px)
    `,
    backgroundSize: '40px 40px',
  }}
/>

{/* Major grid lines */}
<div
  className="absolute inset-0"
  style={{
    backgroundImage: `
      linear-gradient(rgba(59, 130, 246, 0.1) 2px, transparent 2px),
      linear-gradient(90deg, rgba(59, 130, 246, 0.1) 2px, transparent 2px)
    `,
    backgroundSize: '200px 200px',
  }}
/>

{/* Animated scan lines */}
<motion.div
  className="absolute inset-0 pointer-events-none"
  animate={{ backgroundPosition: ['0% 0%', '100% 100%'] }}
  transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
  style={{
    backgroundImage: `linear-gradient(135deg, transparent 0%, rgba(59, 130, 246, 0.03) 50%, transparent 100%)`,
    backgroundSize: '200% 200%',
  }}
/>

{/* Vignette effect */}
<div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-gray-950/50 via-transparent to-gray-950/50" />
<div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-gray-950/50 via-transparent to-gray-950/50" />
```

### Illuminated Button Component Pattern
```tsx
// Circular cockpit-style button with progress tracking
<div className="relative inline-flex items-center gap-3">
  {/* Main circular button */}
  <motion.button
    whileHover={{ scale: 1.1, y: -2 }}
    whileTap={{ scale: 0.95 }}
    className="group relative w-20 h-20 rounded-full"
  >
    {/* Background gradient */}
    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-cyan-600/40 to-cyan-400/40 border-2 border-cyan-400/60" />

    {/* Glass shine effect */}
    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-cyan-400/30 via-transparent to-transparent opacity-60 group-hover:opacity-80" />

    {/* Icon */}
    <div className="absolute inset-0 flex items-center justify-center">
      <Icon className="w-7 h-7 text-cyan-300 drop-shadow-lg" />
    </div>

    {/* Outer glow on hover */}
    <motion.div
      className="absolute inset-0 rounded-full bg-gradient-to-br from-cyan-600/40 to-cyan-400/40 blur-md shadow-cyan-500/50 opacity-0 group-hover:opacity-100 -z-10"
    />

    {/* Scanning animation (rotating line) */}
    {isScanning && (
      <motion.div
        className="absolute inset-0 rounded-full overflow-hidden"
        animate={{ rotate: 360 }}
        transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
      >
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0.5 h-full bg-gradient-to-b from-transparent via-white to-transparent opacity-30" />
      </motion.div>
    )}
  </motion.button>

  {/* Days ago indicator (left) */}
  {daysAgo !== null && daysAgo > 0 && (
    <div className="absolute -left-8 top-1/2 -translate-y-1/2">
      <span className="text-xs text-gray-500 font-mono">{daysAgo}d</span>
    </div>
  )}

  {/* Hand-written label (below button) */}
  <motion.div className="absolute top-24 left-1/2 -translate-x-1/2">
    <span
      className={`${caveat.className} text-base text-cyan-300 font-semibold`}
      style={{
        textShadow: '0 0 10px rgba(255, 255, 255, 0.3)',
        transform: `rotate(${Math.random() * 6 - 3}deg)`,
      }}
    >
      Label
    </span>
  </motion.div>

  {/* Progress bars (right) - 5 vertical bars */}
  {isScanning && (
    <div className="flex gap-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ scaleY: 0 }}
          animate={{ scaleY: i < progressBarsFilled ? 1 : 0 }}
          transition={{ duration: 0.3, delay: i * 0.1 }}
          className="w-1 h-16 rounded-full bg-gradient-to-b from-cyan-600/40 to-cyan-400/40"
          style={{ originY: 1 }}
        />
      ))}
    </div>
  )}
</div>
```

### Hand-Written Typography Pattern (Caveat Font)
```tsx
import { Caveat } from 'next/font/google';

const caveat = Caveat({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  display: 'swap',
});

// Large hand-written title
<motion.h2
  className={`${caveat.className} text-6xl font-bold text-cyan-300/80`}
  style={{
    textShadow: '0 0 20px rgba(34, 211, 238, 0.3)',
    transform: 'rotate(-2deg)',
  }}
  whileHover={{
    textShadow: '0 0 30px rgba(34, 211, 238, 0.6)',
    letterSpacing: '0.05em',
  }}
>
  BLUEPRINT
</motion.h2>

// Underline accent
<motion.div
  initial={{ scaleX: 0 }}
  animate={{ scaleX: 1 }}
  transition={{ delay: 0.3, duration: 0.6 }}
  className="absolute -bottom-2 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent origin-left"
  style={{ transform: 'rotate(-1deg)' }}
/>
```

### Drawer with Blueprint Background
```tsx
// Drawer sliding from left
<motion.div
  initial={{ x: '-100%', opacity: 0 }}
  animate={{ x: 0, opacity: 1 }}
  exit={{ x: '-100%', opacity: 0 }}
  transition={{
    type: 'spring',
    damping: 30,
    stiffness: 250,
    mass: 0.8,
  }}
  className="fixed left-0 top-0 bottom-0 z-50 w-full max-w-md"
>
  <div className="relative h-full bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border-r-2 border-cyan-500/30 shadow-2xl shadow-cyan-500/20 overflow-y-auto">
    {/* Blueprint pattern background at 2% opacity */}
    <div
      className="absolute inset-0 opacity-[0.02] pointer-events-none"
      style={{
        backgroundImage: 'url(/patterns/bg_blueprint.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    />

    {/* Content */}
    <div className="relative p-8">
      {/* Drawer content here */}
    </div>
  </div>
</motion.div>
```

### Scan Status Bar
```tsx
// Real-time status display in header
<AnimatePresence mode="wait">
  {currentScan ? (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.9, opacity: 0 }}
      className="flex items-center gap-3 px-4 py-2 bg-gray-900/80 backdrop-blur-xl border border-cyan-500/30 rounded-xl"
    >
      <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
      <div className="flex flex-col">
        <span className="text-xs text-cyan-300 font-medium">
          Scanning: {scanName}
        </span>
        <span className="text-xs text-gray-500">
          {progress}% complete
        </span>
      </div>
      <div className="w-32 h-1 bg-gray-700/50 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-cyan-400 to-blue-400"
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>
    </motion.div>
  ) : (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="flex items-center gap-2 px-4 py-2 bg-gray-900/80 backdrop-blur-xl border border-green-500/30 rounded-xl"
    >
      <CheckCircle2 className="w-4 h-4 text-green-400" />
      <span className="text-xs text-green-300 font-medium">System Ready</span>
    </motion.div>
  )}
</AnimatePresence>
```

### Color Scheme Variations for Scan Buttons
```tsx
const colorMap = {
  cyan: { bg: 'from-cyan-600/40 to-cyan-400/40', border: 'border-cyan-400/60', text: 'text-cyan-300', glow: 'shadow-cyan-500/50' },
  blue: { bg: 'from-blue-600/40 to-blue-400/40', border: 'border-blue-400/60', text: 'text-blue-300', glow: 'shadow-blue-500/50' },
  purple: { bg: 'from-purple-600/40 to-purple-400/40', border: 'border-purple-400/60', text: 'text-purple-300', glow: 'shadow-purple-500/50' },
  amber: { bg: 'from-amber-600/40 to-amber-400/40', border: 'border-amber-400/60', text: 'text-amber-300', glow: 'shadow-amber-500/50' },
  green: { bg: 'from-green-600/40 to-green-400/40', border: 'border-green-400/60', text: 'text-green-300', glow: 'shadow-green-500/50' },
  red: { bg: 'from-red-600/40 to-red-400/40', border: 'border-red-400/60', text: 'text-red-300', glow: 'shadow-red-500/50' },
  indigo: { bg: 'from-indigo-600/40 to-indigo-400/40', border: 'border-indigo-400/60', text: 'text-indigo-300', glow: 'shadow-indigo-500/50' },
  gray: { bg: 'from-gray-700/20 to-gray-600/20', border: 'border-gray-600/30', text: 'text-gray-500', glow: 'shadow-gray-700/30' }, // Never-run state
};
```

### Multi-Column Blueprint Layout
```tsx
// 4-column grid for organized scan buttons
<div className="grid grid-cols-4 gap-16">
  {/* Column 1: PROJECT */}
  <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
    <div className="mb-12">
      <div className="h-px bg-gradient-to-r from-cyan-500/50 to-transparent mb-2" />
      <h2 className="text-cyan-300 text-sm font-mono tracking-wider uppercase">
        1. PROJECT
      </h2>
    </div>
    <div className="space-y-10">
      {/* Illuminated buttons */}
    </div>
    {/* Decorative circuit line to next column */}
    <div className="absolute -right-8 top-1/2 w-16 h-px bg-gradient-to-r from-cyan-500/30 to-transparent" />
  </motion.div>

  {/* Columns 2-4 follow same pattern */}
</div>
```

### Blueprint Zustand Store Pattern
```tsx
import { create } from 'zustand';

interface ScanStatus {
  name: string;
  lastRun: number | null; // timestamp
  isRunning: boolean;
  progress: number; // 0-100
}

interface BlueprintState {
  scans: Record<string, ScanStatus>;
  currentScan: string | null;
  scanProgress: number;

  startScan: (scanName: string) => void;
  updateScanProgress: (progress: number) => void;
  completeScan: () => void;
  getScanStatus: (scanName: string) => ScanStatus;
  getDaysAgo: (scanName: string) => number | null;
}

export const useBlueprintStore = create<BlueprintState>((set, get) => ({
  scans: {
    vision: { name: 'Vision', lastRun: null, isRunning: false, progress: 0 },
    contexts: { name: 'Contexts', lastRun: Date.now() - 2*24*60*60*1000, isRunning: false, progress: 0 },
    // ... more scans
  },
  currentScan: null,
  scanProgress: 0,

  startScan: (scanName) => {
    set((state) => ({
      currentScan: scanName,
      scanProgress: 0,
      scans: {
        ...state.scans,
        [scanName]: { ...state.scans[scanName], isRunning: true, progress: 0 },
      },
    }));
  },

  updateScanProgress: (progress) => {
    const { currentScan } = get();
    if (!currentScan) return;

    set((state) => ({
      scanProgress: progress,
      scans: {
        ...state.scans,
        [currentScan]: { ...state.scans[currentScan], progress },
      },
    }));
  },

  completeScan: () => {
    const { currentScan } = get();
    if (!currentScan) return;

    set((state) => ({
      currentScan: null,
      scanProgress: 0,
      scans: {
        ...state.scans,
        [currentScan]: {
          ...state.scans[currentScan],
          isRunning: false,
          progress: 0,
          lastRun: Date.now(),
        },
      },
    }));
  },

  getScanStatus: (scanName) => {
    return get().scans[scanName] || { name: scanName, lastRun: null, isRunning: false, progress: 0 };
  },

  getDaysAgo: (scanName) => {
    const scan = get().scans[scanName];
    if (!scan?.lastRun) return null;
    return Math.floor((Date.now() - scan.lastRun) / (24*60*60*1000));
  },
}));
```

---

## Examples in Codebase

Reference these files for complete implementations:
- `src/app/Claude/sub_ClaudeStructureScan/components/StructureTemplateEditor.tsx` - Compact form layouts
- `src/app/Claude/sub_ClaudeStructureScan/components/RuleEditorRow.tsx` - Single-row compact patterns
- `src/app/features/Onboarding/components/GlowWrapper.tsx` - Radiating glow effects
- `src/app/features/Onboarding/sub_Blueprint/DarkBlueprint.tsx` - Complete Blueprint system
- `src/app/features/Onboarding/sub_Blueprint/components/IlluminatedButton.tsx` - Illuminated button with all features
- `src/app/features/Onboarding/sub_Blueprint/components/ScanStatusBar.tsx` - Real-time status tracking
- `src/app/features/Onboarding/components/ControlPanel.tsx` - Drawer with hand-written button
- `src/app/features/Onboarding/sub_Blueprint/store/blueprintStore.ts` - State management pattern
