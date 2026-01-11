"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { Vector3, GalaxyCategory, Card3D, NavigationState } from "../types";
import { GALAXY_POSITIONS } from "../types";

const INITIAL_CAMERA_POSITION: Vector3 = { x: 0, y: 0, z: 30 };
const INITIAL_CAMERA_TARGET: Vector3 = { x: 0, y: 0, z: 0 };

// Lerp factor for smooth transitions
const LERP_FACTOR = 0.05;

/**
 * Hook for managing spatial navigation in the 3D universe
 */
export function useUniverseNavigation() {
  const [state, setState] = useState<NavigationState>({
    cameraPosition: INITIAL_CAMERA_POSITION,
    cameraTarget: INITIAL_CAMERA_TARGET,
    focusedGalaxy: null,
    selectedCard: null,
    zoomLevel: 0,
    isTransitioning: false,
  });

  // Target positions for smooth interpolation
  const targetPositionRef = useRef<Vector3>(INITIAL_CAMERA_POSITION);
  const targetRef = useRef<Vector3>(INITIAL_CAMERA_TARGET);
  const animationFrameRef = useRef<number | null>(null);
  const transitionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Animation loop for smooth camera movement
  const animate = useCallback(() => {
    setState((prev) => {
      const newPosition = {
        x: prev.cameraPosition.x + (targetPositionRef.current.x - prev.cameraPosition.x) * LERP_FACTOR,
        y: prev.cameraPosition.y + (targetPositionRef.current.y - prev.cameraPosition.y) * LERP_FACTOR,
        z: prev.cameraPosition.z + (targetPositionRef.current.z - prev.cameraPosition.z) * LERP_FACTOR,
      };

      const newTarget = {
        x: prev.cameraTarget.x + (targetRef.current.x - prev.cameraTarget.x) * LERP_FACTOR,
        y: prev.cameraTarget.y + (targetRef.current.y - prev.cameraTarget.y) * LERP_FACTOR,
        z: prev.cameraTarget.z + (targetRef.current.z - prev.cameraTarget.z) * LERP_FACTOR,
      };

      return {
        ...prev,
        cameraPosition: newPosition,
        cameraTarget: newTarget,
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

  // Navigate to overview (all galaxies visible)
  const navigateToOverview = useCallback(() => {
    targetPositionRef.current = INITIAL_CAMERA_POSITION;
    targetRef.current = INITIAL_CAMERA_TARGET;

    setState((prev) => ({
      ...prev,
      focusedGalaxy: null,
      selectedCard: null,
      zoomLevel: 0,
      isTransitioning: true,
    }));

    // Clear transition flag after animation completes
    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current);
    }
    transitionTimeoutRef.current = setTimeout(() => {
      setState((prev) => ({ ...prev, isTransitioning: false }));
    }, 1500);
  }, []);

  // Navigate to a specific galaxy
  const navigateToGalaxy = useCallback((category: GalaxyCategory) => {
    const galaxyPos = GALAXY_POSITIONS[category];

    // Position camera in front of and slightly above the galaxy
    targetPositionRef.current = {
      x: galaxyPos.x,
      y: galaxyPos.y + 3,
      z: galaxyPos.z + 15,
    };
    targetRef.current = galaxyPos;

    setState((prev) => ({
      ...prev,
      focusedGalaxy: category,
      selectedCard: null,
      zoomLevel: 0.5,
      isTransitioning: true,
    }));

    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current);
    }
    transitionTimeoutRef.current = setTimeout(() => {
      setState((prev) => ({ ...prev, isTransitioning: false }));
    }, 1500);
  }, []);

  // Navigate to a specific card (cinematic zoom)
  const navigateToCard = useCallback((card: Card3D) => {
    // Position camera close to the card for dramatic effect
    targetPositionRef.current = {
      x: card.position.x + 2,
      y: card.position.y + 1,
      z: card.position.z + 5,
    };
    targetRef.current = card.position;

    setState((prev) => ({
      ...prev,
      selectedCard: card,
      zoomLevel: 1,
      isTransitioning: true,
    }));

    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current);
    }
    transitionTimeoutRef.current = setTimeout(() => {
      setState((prev) => ({ ...prev, isTransitioning: false }));
    }, 1200);
  }, []);

  // Adjust zoom level with scroll/gesture
  const adjustZoom = useCallback((delta: number) => {
    setState((prev) => {
      const newZoom = Math.max(0, Math.min(1, prev.zoomLevel + delta));
      const zDelta = delta * 10;

      targetPositionRef.current = {
        ...targetPositionRef.current,
        z: Math.max(5, targetPositionRef.current.z - zDelta),
      };

      return { ...prev, zoomLevel: newZoom };
    });
  }, []);

  // Pan camera based on mouse/touch movement
  const panCamera = useCallback((deltaX: number, deltaY: number) => {
    setState((prev) => {
      if (prev.isTransitioning || prev.selectedCard) return prev;

      const panFactor = 0.01;
      targetPositionRef.current = {
        x: targetPositionRef.current.x + deltaX * panFactor,
        y: targetPositionRef.current.y - deltaY * panFactor,
        z: targetPositionRef.current.z,
      };
      targetRef.current = {
        x: targetRef.current.x + deltaX * panFactor,
        y: targetRef.current.y - deltaY * panFactor,
        z: targetRef.current.z,
      };

      return prev;
    });
  }, []);

  // Clear card selection (go back to galaxy view)
  const clearSelection = useCallback(() => {
    if (state.focusedGalaxy) {
      navigateToGalaxy(state.focusedGalaxy);
    } else {
      navigateToOverview();
    }
  }, [state.focusedGalaxy, navigateToGalaxy, navigateToOverview]);

  return {
    ...state,
    navigateToOverview,
    navigateToGalaxy,
    navigateToCard,
    adjustZoom,
    panCamera,
    clearSelection,
  };
}
