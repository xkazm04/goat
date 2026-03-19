'use client';

/**
 * useFilterBuilderSync
 *
 * Bridge hook that establishes the unidirectional data flow:
 *
 *   FilterBuilderStore.toFilterConfig()  →  FilterIntegrationProvider.setFilterConfig()
 *
 * Mount this hook in any component that renders the visual FilterBuilder
 * inside a FilterIntegrationProvider. It subscribes to the builder store's
 * node tree and pushes the derived FilterConfig into the integration
 * provider whenever the tree changes.
 *
 * If no FilterIntegrationProvider is present in the tree, the hook is a
 * no-op so it is safe to call unconditionally.
 */

import { useEffect, useRef } from 'react';
import { useFilterBuilderStore } from '@/stores/filter-builder-store';
import { useFilterIntegrationOptional } from './CollectionFilterIntegration';
import type { FilterConfig } from './types';

/**
 * Options for the sync hook
 */
interface FilterBuilderSyncOptions {
  /** Sync on every builder change (default: true). Set false to only sync on explicit apply. */
  syncOnChange?: boolean;
}

/**
 * Syncs the FilterBuilder store's output into the FilterIntegrationProvider.
 *
 * @returns An `applyNow` function that can be called to push the current
 *          builder config into the provider on demand (e.g. on "Apply" click).
 */
export function useFilterBuilderSync(
  options: FilterBuilderSyncOptions = {}
): { applyNow: () => void } {
  const { syncOnChange = true } = options;

  const integration = useFilterIntegrationOptional();
  const toFilterConfig = useFilterBuilderStore((s) => s.toFilterConfig);
  const nodes = useFilterBuilderStore((s) => s.nodes);
  const rootNodeIds = useFilterBuilderStore((s) => s.rootNodeIds);
  const rootCombinator = useFilterBuilderStore((s) => s.rootCombinator);

  // Keep a ref to the latest config to avoid stale closures in applyNow
  const latestConfigRef = useRef<FilterConfig | null>(null);

  // Push config to integration provider whenever the builder tree changes
  useEffect(() => {
    if (!syncOnChange || !integration) return;

    const config = toFilterConfig();
    latestConfigRef.current = config;
    integration.setFilterConfig(config);
  }, [syncOnChange, integration, toFilterConfig, nodes, rootNodeIds, rootCombinator]);

  const applyNow = () => {
    if (!integration) return;
    const config = toFilterConfig();
    latestConfigRef.current = config;
    integration.setFilterConfig(config);
  };

  return { applyNow };
}
