# Custom Particle Theme Packs

## Overview

The Custom Particle Theme Packs feature allows users to personalize their swipe animation experience by selecting from various particle themes with different colors, shapes, and sound effects. The system includes both free and premium theme packs, creating a revenue stream through in-app purchases.

## Features

- **11 Predefined Themes**: Organized into 5 theme packs (1 free, 4 premium)
- **6 Particle Shapes**: Circle, square, triangle, star, heart, and sparkle
- **Customizable Effects**: Colors, particle count, size, burst radius, animation duration
- **Sound Effects**: Per-theme audio files for enhanced feedback
- **Haptic Feedback**: Mobile device vibration support
- **Theme Preview**: Visual preview with color swatches in settings panel
- **Persistent Preferences**: User selections saved via Zustand store
- **Graceful Degradation**: System works even if sound files are missing

## Architecture

### Components

1. **SwipeableCard** (`src/app/features/matching/components/SwipeableCard.tsx`)
   - Enhanced swipeable card with theme-aware particle effects
   - Supports 6 different particle shapes
   - Integrates sound effects and haptic feedback
   - Uses Framer Motion for smooth animations

2. **ParticleThemeSettings** (`src/app/features/matching/components/ParticleThemeSettings.tsx`)
   - Full-featured settings panel modal
   - Theme pack browsing and selection
   - Sound and haptic toggle controls
   - Purchase flow for premium packs
   - Visual theme preview with color swatches

### State Management

**Store**: `src/stores/particle-theme-store.ts`
- Zustand store with persist middleware
- Manages active theme, owned packs, and user preferences
- Storage key: `goat-particle-theme-storage`

**State Structure**:
```typescript
{
  activeThemeId: string;        // Currently selected theme
  ownedPackIds: string[];       // Purchased premium packs
  soundEnabled: boolean;        // Sound effects toggle
  hapticEnabled: boolean;       // Haptic feedback toggle
}
```

### Theme Configuration

**Location**: `src/lib/particle-themes/theme-configs.ts`

**Theme Packs**:
1. **Free Pack** ($0.00)
   - Classic (default green/red)
   - Minimal (gray tones)
   - Ocean Wave (blue/aqua)

2. **Neon Collection** ($2.99)
   - Neon Glow (pink/cyan)
   - Retro Wave (purple/orange synthwave)

3. **Nature Collection** ($2.99)
   - Sakura Bloom (pink petals)
   - Forest Mystic (green sparkles)

4. **Fire & Ice Collection** ($2.99)
   - Blaze (orange/red flames)
   - Frostbite (light blue crystals)

5. **Luxury Collection** ($4.99)
   - Gold Rush (golden sparkle)
   - Diamond Shine (white brilliance)

## Usage

### Using SwipeableCard

```tsx
import { SwipeableCard } from '@/app/features/matching/components';

function MyComponent() {
  const handleSwipe = (direction, data) => {
    console.log('Swiped', direction);
  };

  return (
    <SwipeableCard
      id="card-1"
      onSwipeLeft={handleSwipe}
      onSwipeRight={handleSwipe}
      showIndicators={true}
    >
      <div className="w-80 h-96 bg-gray-800 rounded-2xl p-6">
        Your card content here
      </div>
    </SwipeableCard>
  );
}
```

### Opening Theme Settings

```tsx
import { ParticleThemeSettings } from '@/app/features/matching/components';
import { useState } from 'react';

function MyApp() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button onClick={() => setIsOpen(true)}>
        Theme Settings
      </button>

      <ParticleThemeSettings
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
}
```

### Accessing Theme Store

```tsx
import { useParticleThemeStore } from '@/stores/particle-theme-store';

function ThemeInfo() {
  const {
    getActiveTheme,
    soundEnabled,
    toggleSound
  } = useParticleThemeStore();

  const theme = getActiveTheme();

  return (
    <div>
      <p>Active: {theme.name}</p>
      <button onClick={toggleSound}>
        Sound: {soundEnabled ? 'On' : 'Off'}
      </button>
    </div>
  );
}
```

## Sound Effects

### Setup

Sound files should be placed in `/public/sounds/` directory. See `/public/sounds/README.md` for detailed specifications.

**Required Files**:
- `neon-right.mp3`, `neon-left.mp3`
- `retro-right.mp3`, `retro-left.mp3`
- `nature-right.mp3`, `nature-left.mp3`
- `fire-right.mp3`, `fire-left.mp3`
- `ice-right.mp3`, `ice-left.mp3`
- `gold-right.mp3`, `gold-left.mp3`
- `diamond-right.mp3`, `diamond-left.mp3`

### Sound Specifications
- Format: MP3 or WAV
- Duration: 0.2-0.5 seconds
- Sample Rate: 44.1 kHz
- Normalized to -6dB

## Payment Integration

The current implementation includes a **simulated purchase flow**. To integrate with a real payment system:

1. **Update `purchasePack` in store** (`src/stores/particle-theme-store.ts`)
   - Add API call to payment processor (Stripe, Apple Pay, Google Pay)
   - Verify purchase on server-side
   - Update user's owned packs in database

2. **Add database table**:
```sql
CREATE TABLE user_theme_purchases (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  pack_id VARCHAR(50),
  purchase_date TIMESTAMP,
  price_cents INTEGER,
  payment_provider VARCHAR(50)
);
```

3. **Server-side verification**:
```typescript
// src/app/api/themes/purchase/route.ts
export async function POST(req: Request) {
  const { packId, paymentToken } = await req.json();

  // Verify payment with processor
  const verified = await verifyPayment(paymentToken);

  if (verified) {
    // Record purchase in database
    await db.userThemePurchases.create({
      user_id: userId,
      pack_id: packId,
      // ...
    });

    return Response.json({ success: true });
  }
}
```

## Testing

All interactive components include `data-testid` attributes:

**SwipeableCard**:
- `swipeable-card` - Main card element
- `swipe-left-indicator` - Left swipe indicator
- `swipe-right-indicator` - Right swipe indicator

**ParticleThemeSettings**:
- `particle-theme-settings-backdrop` - Modal backdrop
- `close-theme-settings-btn` - Close button
- `toggle-sound-btn` - Sound toggle
- `toggle-haptic-btn` - Haptic toggle
- `theme-pack-{id}` - Theme pack buttons
- `purchase-pack-btn-{id}` - Purchase buttons
- `theme-option-{id}` - Individual theme options

### Test Example

```typescript
import { render, fireEvent } from '@testing-library/react';
import { SwipeableCard } from './SwipeableCard';

test('shows indicators on swipe', () => {
  const { getByTestId } = render(
    <SwipeableCard id="test">
      <div>Content</div>
    </SwipeableCard>
  );

  const card = getByTestId('swipeable-card');
  // Simulate touch swipe...

  expect(getByTestId('swipe-right-indicator')).toBeVisible();
});
```

## Future Enhancements

1. **Custom Theme Creator**: Allow users to create and save their own themes
2. **Theme Import/Export**: Share themes with other users
3. **Seasonal Themes**: Limited-time holiday themes
4. **Animation Presets**: Different particle movement patterns (spiral, wave, etc.)
5. **Theme Marketplace**: User-created themes for sale/download
6. **Analytics Integration**: Track most popular themes and purchase patterns

## Files Created

```
src/
  types/
    particle-theme.types.ts         # TypeScript types
  lib/
    particle-themes/
      theme-configs.ts              # Theme definitions
  stores/
    particle-theme-store.ts         # State management
  app/
    features/
      matching/
        components/
          SwipeableCard.tsx         # Enhanced swipeable card
          ParticleThemeSettings.tsx # Settings UI panel
          index.ts                  # Updated exports
        lib/
          demo-content.tsx          # Demo cards (optional)
    db/
      repositories/
        implementation-log.repository.ts  # Log repository
public/
  sounds/
    README.md                       # Sound file guide
docs/
  features/
    PARTICLE_THEME_SYSTEM.md        # This file
```

## Troubleshooting

**Theme not changing?**
- Check browser console for errors
- Verify theme is unlocked via `isThemeUnlocked()`
- Clear localStorage and re-select theme

**Sound not playing?**
- Verify sound files exist in `/public/sounds/`
- Check sound is enabled in settings
- Browser may block autoplay on some devices
- Check browser console for audio errors

**Particles not showing?**
- Verify Framer Motion is installed
- Check particle colors are valid hex/rgb values
- Ensure AnimatePresence wraps particle elements

**Purchase not persisting?**
- Check localStorage persistence is working
- Verify Zustand persist middleware is configured
- Check browser storage quota hasn't been exceeded

## Support

For issues or questions about the particle theme system:
1. Check this documentation
2. Review implementation log in `.claude/logs/`
3. Check TypeScript types in `src/types/particle-theme.types.ts`
4. Review store logic in `src/stores/particle-theme-store.ts`
