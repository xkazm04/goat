'use client';

import React, { Suspense, lazy, ComponentType, ReactNode, useMemo, useState, useEffect } from 'react';

// Loading skeleton component for DnD initialization
function DndLoadingSkeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse ${className}`}
      data-testid="dnd-loading-skeleton"
      role="status"
      aria-label="Loading drag and drop functionality"
    >
      <div className="flex items-center justify-center h-full min-h-[100px]">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gray-700/50 animate-pulse" />
          <div className="text-xs text-gray-500">Loading...</div>
        </div>
      </div>
    </div>
  );
}

// Type definitions for lazy-loaded components
interface LazyDndContextProps {
  children: ReactNode;
  sensors?: any;
  collisionDetection?: any;
  modifiers?: any[];
  onDragStart?: (event: any) => void;
  onDragMove?: (event: any) => void;
  onDragOver?: (event: any) => void;
  onDragEnd?: (event: any) => void;
  onDragCancel?: (event: any) => void;
  accessibility?: any;
}

interface LazyDragOverlayProps {
  children?: ReactNode;
  modifiers?: any[];
  dropAnimation?: any;
  className?: string;
  style?: React.CSSProperties;
  wrapperElement?: keyof React.JSX.IntrinsicElements;
  zIndex?: number;
}

interface LazySortableContextProps {
  children: ReactNode;
  items: (string | { id: string })[];
  strategy?: any;
  id?: string;
  disabled?: boolean;
}

// Lazy-loaded DndContext wrapper
const LazyDndContextImpl = lazy(() =>
  import('@dnd-kit/core').then(module => ({
    default: ({ children, ...props }: LazyDndContextProps) => (
      <module.DndContext {...props}>
        {children}
      </module.DndContext>
    )
  }))
);

// Lazy-loaded DragOverlay wrapper
const LazyDragOverlayImpl = lazy(() =>
  import('@dnd-kit/core').then(module => ({
    default: (props: LazyDragOverlayProps) => (
      <module.DragOverlay {...props} />
    )
  }))
);

// Lazy-loaded SortableContext wrapper
const LazySortableContextImpl = lazy(() =>
  import('@dnd-kit/sortable').then(module => ({
    default: ({ children, ...props }: LazySortableContextProps) => (
      <module.SortableContext {...props}>
        {children}
      </module.SortableContext>
    )
  }))
);

/**
 * LazyDndContext - Lazy-loaded version of DndContext from @dnd-kit/core
 *
 * Reduces initial bundle size by ~25KB gzipped by deferring the load
 * of @dnd-kit until the component is actually rendered.
 */
export function LazyDndContext({
  children,
  fallback,
  ...props
}: LazyDndContextProps & { fallback?: ReactNode }) {
  return (
    <Suspense fallback={fallback ?? <DndLoadingSkeleton />}>
      <LazyDndContextImpl {...props}>
        {children}
      </LazyDndContextImpl>
    </Suspense>
  );
}

/**
 * LazyDragOverlay - Lazy-loaded version of DragOverlay from @dnd-kit/core
 */
export function LazyDragOverlay({
  fallback,
  ...props
}: LazyDragOverlayProps & { fallback?: ReactNode }) {
  return (
    <Suspense fallback={fallback ?? null}>
      <LazyDragOverlayImpl {...props} />
    </Suspense>
  );
}

/**
 * LazySortableContext - Lazy-loaded version of SortableContext from @dnd-kit/sortable
 */
export function LazySortableContext({
  children,
  fallback,
  ...props
}: LazySortableContextProps & { fallback?: ReactNode }) {
  return (
    <Suspense fallback={fallback ?? <DndLoadingSkeleton />}>
      <LazySortableContextImpl {...props}>
        {children}
      </LazySortableContextImpl>
    </Suspense>
  );
}

// ============================================================================
// Hook-based lazy loading utilities
// ============================================================================

// Cache for lazy-loaded hooks/utilities
let dndCoreCache: typeof import('@dnd-kit/core') | null = null;
let dndSortableCache: typeof import('@dnd-kit/sortable') | null = null;
let dndModifiersCache: typeof import('@dnd-kit/modifiers') | null = null;
let dndUtilitiesCache: typeof import('@dnd-kit/utilities') | null = null;

/**
 * Preload @dnd-kit modules to warm the cache
 * Call this when user is about to enter match mode (e.g., on hover/focus of match link)
 */
export async function preloadDndKit(): Promise<void> {
  const promises: Promise<any>[] = [];

  if (!dndCoreCache) {
    promises.push(
      import('@dnd-kit/core').then(m => { dndCoreCache = m; })
    );
  }

  if (!dndSortableCache) {
    promises.push(
      import('@dnd-kit/sortable').then(m => { dndSortableCache = m; })
    );
  }

  if (!dndModifiersCache) {
    promises.push(
      import('@dnd-kit/modifiers').then(m => { dndModifiersCache = m; })
    );
  }

  if (!dndUtilitiesCache) {
    promises.push(
      import('@dnd-kit/utilities').then(m => { dndUtilitiesCache = m; })
    );
  }

  await Promise.all(promises);
}

/**
 * Check if DnD kit modules are already loaded
 */
export function isDndKitLoaded(): boolean {
  return dndCoreCache !== null;
}

/**
 * Get cached DnD core module (throws if not loaded)
 */
export function getDndCore(): typeof import('@dnd-kit/core') {
  if (!dndCoreCache) {
    throw new Error('DnD core not loaded. Call preloadDndKit() first or use LazyDndContext.');
  }
  return dndCoreCache;
}

/**
 * Get cached DnD sortable module (throws if not loaded)
 */
export function getDndSortable(): typeof import('@dnd-kit/sortable') {
  if (!dndSortableCache) {
    throw new Error('DnD sortable not loaded. Call preloadDndKit() first or use LazySortableContext.');
  }
  return dndSortableCache;
}

/**
 * Get cached DnD modifiers module (throws if not loaded)
 */
export function getDndModifiers(): typeof import('@dnd-kit/modifiers') {
  if (!dndModifiersCache) {
    throw new Error('DnD modifiers not loaded. Call preloadDndKit() first.');
  }
  return dndModifiersCache;
}

/**
 * Get cached DnD utilities module (throws if not loaded)
 */
export function getDndUtilities(): typeof import('@dnd-kit/utilities') {
  if (!dndUtilitiesCache) {
    throw new Error('DnD utilities not loaded. Call preloadDndKit() first.');
  }
  return dndUtilitiesCache;
}

// Re-export the loading skeleton for external use
export { DndLoadingSkeleton };
