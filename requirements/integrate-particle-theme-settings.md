# Integrate ParticleThemeSettings into Application Settings

## Component Overview
**File:** `src/app/features/matching/components/ParticleThemeSettings.tsx`
**Exports:** ParticleThemeSettings
**Purpose:** Full-featured settings modal for managing particle theme customizations, including theme pack purchases, sound/haptic toggles, and theme selection

## Why Integrate
The ParticleThemeSettings component is a complete theme management interface:
- Browse and select particle themes from multiple theme packs
- Purchase premium theme packs (monetization opportunity)
- Toggle sound and haptic feedback settings
- Preview theme colors before applying
- Persisted preferences via `particle-theme-store`

The store (`particle-theme-store.ts`) is fully implemented with:
- `activeThemeId` - Current theme selection
- `ownedPackIds` - Purchased theme packs
- `soundEnabled` / `hapticEnabled` - User preferences
- Theme unlock checking and purchase functionality

## Integration Plan

### 1. Pre-Integration Updates
- [x] Component has data-testid attributes on key elements
- [x] Store with persistence is fully implemented
- [x] Uses `ALL_THEME_PACKS` from theme-configs
- [ ] Verify theme-configs exports exist and have themes defined
- [ ] Ensure SwipeableCard (consumer) is also integrated

### 2. Integration Points

**Primary Usage - Match Settings Menu:**
- File: Create `src/app/features/Match/components/MatchSettingsButton.tsx` OR add to existing toolbar
- Location: Match page header/toolbar area
- Trigger: Settings icon button opens the modal

```tsx
// Example usage:
import { ParticleThemeSettings } from '@/app/features/matching/components/ParticleThemeSettings';

const [isSettingsOpen, setIsSettingsOpen] = useState(false);

<button onClick={() => setIsSettingsOpen(true)} data-testid="theme-settings-btn">
  <Sparkles className="w-5 h-5" />
</button>

<ParticleThemeSettings
  isOpen={isSettingsOpen}
  onClose={() => setIsSettingsOpen(false)}
/>
```

**Alternative - User Profile Settings:**
- File: Create/update user settings page
- Location: Account settings section
- Provides persistent access to theme customization

### 3. Dependency Check
Before integration, verify these files exist and are properly exported:
- `src/lib/particle-themes/theme-configs.ts` - Must export `ALL_THEME_PACKS` and `ALL_THEMES`
- `src/types/particle-theme.types.ts` - Type definitions
- `src/stores/particle-theme-store.ts` - Store implementation

### 4. Testing Requirements
- [ ] Modal opens/closes correctly
- [ ] Theme packs display in sidebar
- [ ] Themes display in main grid
- [ ] Theme selection updates store
- [ ] Sound toggle works
- [ ] Haptic toggle works
- [ ] Pack purchase flow works (simulated)
- [ ] Locked themes show lock indicator
- [ ] Owned themes are selectable

### 5. Cleanup Tasks
- [ ] Remove duplicate theme settings if any exist elsewhere
- [ ] Consolidate settings access points

## Dependencies on Other Components
This component works with:
- **SwipeableCard**: Consumes theme config for particle effects
- **particle-theme-store**: Manages all theme state
- **theme-configs**: Defines available themes

## Success Criteria
- Settings modal accessible from match interface
- Users can browse and select themes
- Sound/haptic preferences persist
- Premium themes locked until purchased
- Theme changes reflect in SwipeableCard animations

## Estimated Impact
- **Code Quality:** Medium - Part of particle theme system
- **User Experience:** High - Enables customization and premium features
- **Maintainability:** Medium - Depends on theme configuration files
- **Performance:** Neutral - Modal only renders when open

## Priority Assessment
**Priority: LOW-MEDIUM**

**Reasoning:**
- SwipeableCard must be integrated first to see theme effects
- Premium purchase flow needs backend integration
- Good for monetization but not core feature
