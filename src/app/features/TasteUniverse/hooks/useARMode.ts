"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { ARState, ARStar, Star, Vector3 } from "../types";

/**
 * Check if WebXR is supported
 */
function checkARSupport(): boolean {
  if (typeof navigator === "undefined") return false;

  // Check for WebXR API support
  return "xr" in navigator;
}

/**
 * Hook for managing AR mode in the Taste Universe
 * This provides foundation for AR viewing on mobile devices
 */
export function useARMode() {
  const [arState, setARState] = useState<ARState>({
    isSupported: false,
    isActive: false,
    sessionStarted: false,
    anchors: [],
  });

  const xrSessionRef = useRef<XRSession | null>(null);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check AR support on mount
  useEffect(() => {
    const checkSupport = async () => {
      const basicSupport = checkARSupport();

      if (basicSupport && navigator.xr) {
        try {
          const supported = await navigator.xr.isSessionSupported("immersive-ar");
          setARState((prev) => ({
            ...prev,
            isSupported: supported,
          }));
        } catch {
          setARState((prev) => ({
            ...prev,
            isSupported: false,
          }));
        }
      }
    };

    checkSupport();
  }, []);

  // Request AR session
  const startARSession = useCallback(async () => {
    if (!arState.isSupported || !navigator.xr) {
      setError("AR is not supported on this device");
      return false;
    }

    try {
      // Request immersive AR session
      const session = await navigator.xr.requestSession("immersive-ar", {
        requiredFeatures: ["hit-test", "local-floor"],
        optionalFeatures: ["dom-overlay"],
      });

      xrSessionRef.current = session;

      setARState((prev) => ({
        ...prev,
        isActive: true,
        sessionStarted: true,
      }));

      setPermissionGranted(true);
      setError(null);

      // Handle session end
      session.addEventListener("end", () => {
        xrSessionRef.current = null;
        setARState((prev) => ({
          ...prev,
          isActive: false,
          sessionStarted: false,
          anchors: [],
        }));
      });

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to start AR session";
      setError(errorMessage);
      console.error("AR session error:", err);
      return false;
    }
  }, [arState.isSupported]);

  // End AR session
  const endARSession = useCallback(async () => {
    if (xrSessionRef.current) {
      await xrSessionRef.current.end();
      xrSessionRef.current = null;
    }

    setARState((prev) => ({
      ...prev,
      isActive: false,
      sessionStarted: false,
      anchors: [],
    }));
  }, []);

  // Anchor a star in AR space
  const anchorStar = useCallback((star: Star, worldPosition: Vector3): ARStar => {
    const arStar: ARStar = {
      ...star,
      worldPosition,
      isAnchored: true,
    };

    setARState((prev) => ({
      ...prev,
      anchors: [...prev.anchors, arStar],
    }));

    return arStar;
  }, []);

  // Remove an anchored star
  const removeAnchor = useCallback((starId: string) => {
    setARState((prev) => ({
      ...prev,
      anchors: prev.anchors.filter((a) => a.id !== starId),
    }));
  }, []);

  // Clear all anchors
  const clearAnchors = useCallback(() => {
    setARState((prev) => ({
      ...prev,
      anchors: [],
    }));
  }, []);

  // Convert screen position to AR world position
  // This is a placeholder - real implementation would use hit-testing
  const screenToWorldPosition = useCallback(
    async (screenX: number, screenY: number): Promise<Vector3 | null> => {
      if (!xrSessionRef.current) return null;

      // Placeholder - real implementation would use XR hit-testing
      // to find where the user is pointing in AR space
      return {
        x: screenX * 0.01,
        y: 0,
        z: -screenY * 0.01,
      };
    },
    []
  );

  // Get device orientation for positioning
  const getDeviceOrientation = useCallback(() => {
    if (typeof window === "undefined" || !window.DeviceOrientationEvent) {
      return null;
    }

    // This would use DeviceOrientationEvent for orientation
    return {
      alpha: 0,
      beta: 0,
      gamma: 0,
    };
  }, []);

  return {
    arState,
    permissionGranted,
    error,
    startARSession,
    endARSession,
    anchorStar,
    removeAnchor,
    clearAnchors,
    screenToWorldPosition,
    getDeviceOrientation,
  };
}
