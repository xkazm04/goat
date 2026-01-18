
## Collection Feature

### Components to Integrate (kept for future use)

| Component | Path | Purpose |
|-----------|------|---------|
| AverageRankingBadge | `components/AverageRankingBadge.tsx` | Display average ranking badge (consolidate with RankingDistribution) |
| FocusRingOverlay | `components/FocusRingOverlay.tsx` | Accessibility focus indicator |
| ItemInspector | `components/ItemInspector.tsx` | Rich item detail panel |
| ItemInspectorProvider | `components/ItemInspectorProvider.tsx` | Context provider for inspector |
| MetadataGrid | `components/MetadataGrid.tsx` | Grid display for item metadata |
| SpotlightTooltip | `components/SpotlightTooltip.tsx` | Tooltip for spotlighted items |
| RankingDistribution | `components/RankingDistribution.tsx` | Community ranking visualization |

### Hooks (kept for future use)

| Hook | Path | Purpose |
|------|------|---------|
| useQuickSelect | `hooks/useQuickSelect.ts` | Quick selection keyboard shortcuts |

### Lib/Utils (kept for future use)

| File | Path | Purpose |
|------|------|---------|
| adaptiveLoader | `lib/adaptiveLoader.ts` | Adaptive loading strategies |

---

## Match Feature

### Components (unused but kept)

| Component | Path | Purpose | Notes |
|-----------|------|---------|-------|
| ComparisonModal | `ComparisonModal.tsx` | Item comparison interface | Lazy-loaded, never triggered |
| TierPanel | `TierPanel.tsx` | Tier configuration panel | Alternative tier UI |
| AIStyleSelector | `components/AIStyleSelector.tsx` | AI image style picker | AI feature disabled |
| ImageEditor | `components/ImageEditor.tsx` | Image editing modal | Not enabled |
| LongPressPreview | `components/LongPressPreview.tsx` | Mobile long-press preview | Touch feature |
| MagneticVisualizer | `components/MagneticVisualizer.tsx` | Physics debug visualization | Physics disabled |
| ResultImageDownload | `components/ResultImageDownload.tsx` | Download result images | Share flow only |
| ResultImageGenerator | `components/ResultImageGenerator.tsx` | Generate shareable images | Used by ShareModal |
| SyncStatusIndicator | `components/SyncStatusIndicator.tsx` | Offline sync status | Offline feature |

### Hooks (unused but kept)

| Hook | Path | Purpose |
|------|------|---------|
| useTierIntegration | `hooks/useTierIntegration.ts` | Tier system integration |
| useTouchGestures | `hooks/useTouchGestures.ts` | Mobile touch gestures |

### Lib/Utils (unused but kept)

| File | Path | Purpose |
|------|------|---------|
| PhysicsConfig | `lib/PhysicsConfig.ts` | Physics engine constants |
| aiImageGenerator | `lib/aiImageGenerator.ts` | AI image generation orchestration |
| magneticPhysics | `lib/magneticPhysics.ts` | Magnetic snap physics |
| promptBuilder | `lib/promptBuilder.ts` | AI prompt construction |
| rankConfig | `lib/rankConfig.ts` | Rank display configuration |
| resultCache | `lib/resultCache.ts` | Result caching utilities |
| resultImagePrompt | `lib/resultImagePrompt.ts` | Result image prompts |
| seedingEngine | `lib/seedingEngine.ts` | Tournament seeding logic |
| socialShareIntegration | `lib/socialShareIntegration.ts` | Social sharing utilities |
| spatialHash | `lib/spatialHash.ts` | Spatial hashing for physics |
| tierPresets | `lib/tierPresets.ts` | Tier list preset configurations |
| tierListExporter | `lib/tierListExporter.ts` | Export tier lists as images |
| bracketGenerator | `lib/bracketGenerator.ts` | Tournament bracket generation |
| ai/* | `lib/ai/` | AI style presets and configs |

### Sub-Components (unused but kept)

| Component | Path | Purpose |
|-----------|------|---------|
| AnimationController | `sub_MatchGrid/components/AnimationController.tsx` | Animation orchestration |
| DragStateManager | `sub_MatchGrid/components/DragStateManager.tsx` | Drag state management |
| GridOrchestrator | `sub_MatchGrid/components/GridOrchestrator.tsx` | Grid layout orchestration |
| GridRenderer | `sub_MatchGrid/components/GridRenderer.tsx` | Grid rendering logic |
| InertiaDraggable | `sub_MatchGrid/components/InertiaDraggable.tsx` | Inertia-based dragging |
| MagneticPhysicsProvider | `sub_MatchGrid/components/MagneticPhysicsProvider.tsx` | Physics context provider |
| PhysicsGridSlot | `sub_MatchGrid/components/PhysicsGridSlot.tsx` | Physics-enabled grid slot |

### Sub-Hooks (unused but kept)

| Hook | Path | Purpose |
|------|------|---------|
| useTierLayout | `sub_MatchGrid/hooks/useTierLayout.ts` | Tier layout calculations |
| useMagneticDrag | `sub_MatchGrid/hooks/useMagneticDrag.ts` | Magnetic drag behavior |

### Sub-Lib (unused but kept)

| File | Path | Purpose |
|------|------|---------|
| autoArrangeEngine | `sub_MatchGrid/lib/autoArrangeEngine.ts` | Auto-arrange items |
| physicsEngine | `sub_MatchGrid/lib/physicsEngine.ts` | Physics simulation |
| smartGridLayout | `sub_MatchGrid/lib/smartGridLayout.ts` | Smart grid positioning |
| snapToGrid | `sub_MatchGrid/lib/snapToGrid.ts` | Grid snapping utilities |
| tierConfig | `sub_MatchGrid/lib/tierConfig.ts` | Tier configuration |

---

## Feature Categories

### AI Image Generation (disabled)
- `AIStyleSelector`
- `aiImageGenerator`
- `promptBuilder`
- `lib/ai/*`

### Magnetic Physics (disabled)
- `MagneticVisualizer`
- `MagneticPhysicsProvider`
- `magneticPhysics`
- `spatialHash`
- `useMagneticDrag`
- `PhysicsGridSlot`

### Tier System (partial use)
- `TierPanel`
- `useTierIntegration`
- `useTierLayout`
- `tierPresets` (used)
- `tierListExporter` (used)
- `tierConfig`

### Tournament/Bracket (partial use)
- `seedingEngine`
- `bracketGenerator` (used by BracketView)

### Offline/Sync (disabled)
- `SyncStatusIndicator`
- Related offline infrastructure

### Touch/Mobile (not implemented)
- `useTouchGestures`
- `LongPressPreview`

---

## Recommendations

### Consider Deleting
- Components with broken dependencies that can't compile
- Duplicate implementations (e.g., multiple tutorial components)
- Debug/visualization components not needed in production

### Consider Completing
- AI image generation feature (has full infrastructure)
- Magnetic physics (adds polish to drag interactions)
- Tier system (partially working, needs integration)

### Consider Refactoring
- Consolidate `AverageRankingBadge` with `RankingDistribution`
- Unify tutorial components into single implementation
- Merge physics utilities into single module

---

## Related Files Deleted (2026-01-18)

### Collection Feature
- `RelatedItemsCarousel.tsx`
- `SkeletonFactory.tsx`
- `SortableCollectionItem.tsx`
- `VirtualizedGrid.tsx`
- `VirtualizedList.tsx`
- `useDragAnnouncements.tsx`
- `useCollectionReorder.ts`
- `SimpleCollectionPanel.tsx`
- `virtualizationEngine.ts`

### Match Feature
- `MatchGrid.tsx` (legacy)
- `MatchGridHeader.tsx`
- `MatchGridSlot.tsx`
- `MatchGridToolbar.tsx`
- `MatchPodium.tsx`
- `TierEnabledMatchGrid.tsx`
- `MatchGrid/` folder
- `ConflictResolutionModal.tsx`
- `GestureTutorial.tsx`
- `MatchContainerContent.tsx`
- `MatchContainerHeader.tsx`
- `MatchGridControls.tsx`
- `OptimisticDragPreview.tsx`
- `QuickAssignModal.tsx`
- `useMatchGridState.ts`
- `useGridPresenter.ts`
- `UndoRedoControls.tsx`
- `SnapPreviewGrid` (from DragComponents.tsx)
