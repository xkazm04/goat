"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import type {
  Vector3,
  CameraState,
  TasteUniverse,
  Constellation,
  Star,
  SpatialRankingState,
  UserList,
  ConstellationCategory,
  StarConnection,
} from "../types";
import {
  CONSTELLATION_THEMES,
  CONSTELLATION_POSITIONS,
  DEFAULT_UNIVERSE_THEME,
  calculateSpiralPosition,
  getStarBrightness,
  getStarSize,
} from "../types";

// Camera positions
const OVERVIEW_POSITION: Vector3 = { x: 0, y: 0, z: 50 };
const OVERVIEW_TARGET: Vector3 = { x: 0, y: 0, z: 0 };

// Animation constants
const LERP_FACTOR = 0.04;
const TRANSITION_DURATION = 1500;

/**
 * Generate a unique ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Determine constellation category from list category
 */
function determineCategory(category: string): ConstellationCategory {
  const normalized = category.toLowerCase();
  if (normalized.includes("sport") || normalized.includes("basketball") || normalized.includes("football")) {
    return "Sports";
  }
  if (normalized.includes("music") || normalized.includes("song") || normalized.includes("album")) {
    return "Music";
  }
  if (normalized.includes("game") || normalized.includes("gaming")) {
    return "Games";
  }
  return "Stories";
}

/**
 * Generate connections between similar stars based on proximity in ranking
 */
function generateConnections(stars: Star[], theme: typeof CONSTELLATION_THEMES.Sports): StarConnection[] {
  const connections: StarConnection[] = [];

  // Connect adjacent ranked items
  for (let i = 0; i < stars.length - 1; i++) {
    const fromStar = stars[i];
    const toStar = stars[i + 1];

    // Strength decreases with rank (top items have stronger connections)
    const strength = 1 - (i / stars.length) * 0.5;

    connections.push({
      id: `conn-${fromStar.id}-${toStar.id}`,
      fromStarId: fromStar.id,
      toStarId: toStar.id,
      strength,
      color: theme.glowColor,
      animated: i < 3, // Animate top 3 connections
    });
  }

  return connections;
}

/**
 * Convert user lists to constellations
 */
function listsToConstellations(lists: UserList[]): Constellation[] {
  // Group lists by category for positioning
  const categoryGroups = new Map<ConstellationCategory, UserList[]>();

  lists.forEach((list) => {
    const category = determineCategory(list.category);
    if (!categoryGroups.has(category)) {
      categoryGroups.set(category, []);
    }
    categoryGroups.get(category)!.push(list);
  });

  const constellations: Constellation[] = [];

  categoryGroups.forEach((categoryLists, category) => {
    const basePosition = CONSTELLATION_POSITIONS[category];
    const theme = CONSTELLATION_THEMES[category];

    categoryLists.forEach((list, listIndex) => {
      // Offset each constellation within category
      const offsetAngle = (listIndex / categoryLists.length) * Math.PI * 2;
      const offsetDistance = 15;

      const position: Vector3 = {
        x: basePosition.x + Math.cos(offsetAngle) * offsetDistance * (listIndex > 0 ? 1 : 0),
        y: basePosition.y + Math.sin(offsetAngle * 0.5) * 5,
        z: basePosition.z + Math.sin(offsetAngle) * offsetDistance * (listIndex > 0 ? 1 : 0),
      };

      // Generate stars from list items
      const stars: Star[] = list.items.map((item) => {
        const starPosition = calculateSpiralPosition(item.rank, list.items.length, position);
        const brightness = getStarBrightness(item.rank, list.items.length);
        const size = getStarSize(item.rank, list.items.length);

        return {
          id: `star-${list.id}-${item.id}`,
          itemId: item.id,
          name: item.name,
          position: starPosition,
          brightness,
          rank: item.rank,
          color: theme.primaryColor,
          size,
          pulseSpeed: 0.5 + (1 - item.rank / list.items.length) * 1.5,
          metadata: {
            category: list.category,
            imageUrl: item.imageUrl,
          },
        };
      });

      // Generate connections between stars
      const connections = generateConnections(stars, theme);

      constellations.push({
        id: `constellation-${list.id}`,
        name: list.name,
        category,
        position,
        stars,
        connections,
        theme,
        listId: list.id,
        authorId: list.authorId,
        authorName: list.authorName,
      });
    });
  });

  return constellations;
}

/**
 * Hook for managing the Taste Universe state
 */
export function useUniverseState(userLists: UserList[] = []) {
  // Camera state
  const [cameraState, setCameraState] = useState<CameraState>({
    position: OVERVIEW_POSITION,
    target: OVERVIEW_TARGET,
    zoom: 0,
    isTransitioning: false,
    focusedConstellation: null,
    focusedStar: null,
  });

  // Target refs for smooth interpolation
  const targetPositionRef = useRef<Vector3>(OVERVIEW_POSITION);
  const targetLookAtRef = useRef<Vector3>(OVERVIEW_TARGET);
  const animationFrameRef = useRef<number | null>(null);
  const transitionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Spatial ranking state
  const [spatialRanking, setSpatialRanking] = useState<SpatialRankingState>({
    isActive: false,
    selectedStar: null,
    draggedStar: null,
    previewPosition: null,
    targetRank: null,
  });

  // Generate universe from lists
  const universe = useMemo<TasteUniverse>(() => {
    const constellations = listsToConstellations(userLists);

    return {
      id: generateId(),
      userId: "",
      userName: "",
      constellations,
      cameraPosition: OVERVIEW_POSITION,
      theme: DEFAULT_UNIVERSE_THEME,
      stats: {
        totalConstellations: constellations.length,
        totalStars: constellations.reduce((sum, c) => sum + c.stars.length, 0),
        totalConnections: constellations.reduce((sum, c) => sum + c.connections.length, 0),
        topCategories: Array.from(new Set(constellations.map((c) => c.category))) as ConstellationCategory[],
      },
      isPublic: true,
    };
  }, [userLists]);

  // Animation loop for smooth camera movement
  const animate = useCallback(() => {
    setCameraState((prev) => {
      const newPosition = {
        x: prev.position.x + (targetPositionRef.current.x - prev.position.x) * LERP_FACTOR,
        y: prev.position.y + (targetPositionRef.current.y - prev.position.y) * LERP_FACTOR,
        z: prev.position.z + (targetPositionRef.current.z - prev.position.z) * LERP_FACTOR,
      };

      const newTarget = {
        x: prev.target.x + (targetLookAtRef.current.x - prev.target.x) * LERP_FACTOR,
        y: prev.target.y + (targetLookAtRef.current.y - prev.target.y) * LERP_FACTOR,
        z: prev.target.z + (targetLookAtRef.current.z - prev.target.z) * LERP_FACTOR,
      };

      return {
        ...prev,
        position: newPosition,
        target: newTarget,
      };
    });

    animationFrameRef.current = requestAnimationFrame(animate);
  }, []);

  // Start animation loop
  useEffect(() => {
    animationFrameRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
      }
    };
  }, [animate]);

  // Navigate to overview
  const navigateToOverview = useCallback(() => {
    targetPositionRef.current = OVERVIEW_POSITION;
    targetLookAtRef.current = OVERVIEW_TARGET;

    setCameraState((prev) => ({
      ...prev,
      zoom: 0,
      isTransitioning: true,
      focusedConstellation: null,
      focusedStar: null,
    }));

    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current);
    }
    transitionTimeoutRef.current = setTimeout(() => {
      setCameraState((prev) => ({ ...prev, isTransitioning: false }));
    }, TRANSITION_DURATION);
  }, []);

  // Navigate to constellation
  const navigateToConstellation = useCallback((constellationId: string) => {
    const constellation = universe.constellations.find((c) => c.id === constellationId);
    if (!constellation) return;

    targetPositionRef.current = {
      x: constellation.position.x,
      y: constellation.position.y + 5,
      z: constellation.position.z + 20,
    };
    targetLookAtRef.current = constellation.position;

    setCameraState((prev) => ({
      ...prev,
      zoom: 0.5,
      isTransitioning: true,
      focusedConstellation: constellationId,
      focusedStar: null,
    }));

    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current);
    }
    transitionTimeoutRef.current = setTimeout(() => {
      setCameraState((prev) => ({ ...prev, isTransitioning: false }));
    }, TRANSITION_DURATION);
  }, [universe.constellations]);

  // Navigate to star (for spatial ranking)
  const navigateToStar = useCallback((starId: string) => {
    let targetStar: Star | null = null;
    let parentConstellation: Constellation | null = null;

    for (const constellation of universe.constellations) {
      const star = constellation.stars.find((s) => s.id === starId);
      if (star) {
        targetStar = star;
        parentConstellation = constellation;
        break;
      }
    }

    if (!targetStar || !parentConstellation) return;

    targetPositionRef.current = {
      x: targetStar.position.x + 2,
      y: targetStar.position.y + 1,
      z: targetStar.position.z + 5,
    };
    targetLookAtRef.current = targetStar.position;

    setCameraState((prev) => ({
      ...prev,
      zoom: 1,
      isTransitioning: true,
      focusedConstellation: parentConstellation!.id,
      focusedStar: starId,
    }));

    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current);
    }
    transitionTimeoutRef.current = setTimeout(() => {
      setCameraState((prev) => ({ ...prev, isTransitioning: false }));
    }, 1200);
  }, [universe.constellations]);

  // Pan camera
  const panCamera = useCallback((deltaX: number, deltaY: number) => {
    if (cameraState.isTransitioning) return;

    const panFactor = 0.02;
    targetPositionRef.current = {
      x: targetPositionRef.current.x + deltaX * panFactor,
      y: targetPositionRef.current.y - deltaY * panFactor,
      z: targetPositionRef.current.z,
    };
    targetLookAtRef.current = {
      x: targetLookAtRef.current.x + deltaX * panFactor,
      y: targetLookAtRef.current.y - deltaY * panFactor,
      z: targetLookAtRef.current.z,
    };
  }, [cameraState.isTransitioning]);

  // Zoom camera
  const zoomCamera = useCallback((delta: number) => {
    const zoomFactor = delta * 15;
    targetPositionRef.current = {
      ...targetPositionRef.current,
      z: Math.max(10, Math.min(100, targetPositionRef.current.z - zoomFactor)),
    };

    setCameraState((prev) => ({
      ...prev,
      zoom: Math.max(0, Math.min(1, prev.zoom + delta)),
    }));
  }, []);

  // Spatial ranking: start dragging a star
  const startDragStar = useCallback((star: Star) => {
    setSpatialRanking({
      isActive: true,
      selectedStar: star,
      draggedStar: star,
      previewPosition: star.position,
      targetRank: null,
    });
  }, []);

  // Spatial ranking: update drag position
  const updateDragPosition = useCallback((position: Vector3) => {
    setSpatialRanking((prev) => ({
      ...prev,
      previewPosition: position,
    }));
  }, []);

  // Spatial ranking: end drag and update rank
  const endDragStar = useCallback((newRank: number | null) => {
    setSpatialRanking((prev) => ({
      ...prev,
      isActive: false,
      draggedStar: null,
      previewPosition: null,
      targetRank: newRank,
    }));

    // Return the ranking change info
    return {
      starId: spatialRanking.draggedStar?.id,
      newRank,
    };
  }, [spatialRanking.draggedStar]);

  // Select a star (without dragging)
  const selectStar = useCallback((star: Star | null) => {
    setSpatialRanking((prev) => ({
      ...prev,
      selectedStar: star,
    }));
  }, []);

  return {
    // Universe data
    universe,

    // Camera state and controls
    cameraState,
    navigateToOverview,
    navigateToConstellation,
    navigateToStar,
    panCamera,
    zoomCamera,

    // Spatial ranking
    spatialRanking,
    startDragStar,
    updateDragPosition,
    endDragStar,
    selectStar,
  };
}
