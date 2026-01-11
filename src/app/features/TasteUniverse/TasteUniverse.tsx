"use client";

import { memo, useCallback, useRef, Suspense, useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Preload } from "@react-three/drei";
import * as THREE from "three";
import { motion, AnimatePresence } from "framer-motion";
import {
  CosmicBackground,
  ConstellationGroup,
  UniverseCamera,
  UniverseNavigationUI,
  SpatialRankingOverlay,
  CenterDropZone,
  DragPhysicsIndicator,
  UniverseComparisonPanel,
  ARModeOverlay,
} from "./components";
import { useUniverseState, useSocialFeatures, useARMode } from "./hooks";
import type { TasteUniverseProps, Star } from "./types";
import { DEFAULT_UNIVERSE_THEME } from "./types";

// Loading fallback
function LoadingFallback() {
  return (
    <div
      className="absolute inset-0 flex items-center justify-center"
      style={{ backgroundColor: DEFAULT_UNIVERSE_THEME.backgroundColor }}
    >
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-20 h-20">
          {/* Outer ring */}
          <div className="absolute inset-0 rounded-full border-2 border-purple-500/20" />
          {/* Spinning ring */}
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-cyan-500 border-r-purple-500 animate-spin" />
          {/* Inner pulsing dot */}
          <div className="absolute inset-4 rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 animate-pulse" />
        </div>
        <p className="text-white/60 text-sm">Generating your Taste Universe...</p>
      </div>
    </div>
  );
}

/**
 * TasteUniverse - Immersive 3D taste exploration experience
 * Each ranked list becomes a constellation with stars representing ranking positions
 */
export const TasteUniverse = memo(function TasteUniverse({
  userLists = [],
  userId,
  visitUserId,
  enableSpatialRanking = true,
  enableAR = true,
  enableSocial = true,
  onRankingChange,
  onVisitUniverse,
  debug = false,
}: TasteUniverseProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [showComparison, setShowComparison] = useState(false);

  // Universe state management
  const {
    universe,
    cameraState,
    navigateToOverview,
    navigateToConstellation,
    navigateToStar,
    panCamera,
    zoomCamera,
    spatialRanking,
    startDragStar,
    updateDragPosition,
    endDragStar,
    selectStar,
  } = useUniverseState(userLists);

  // Social features
  const {
    socialState,
    visitedUniverse,
    isLoading: isSocialLoading,
    visitUniverse,
    returnToOwnUniverse,
    shareUniverse,
    getShareableLink,
  } = useSocialFeatures(userId);

  // AR mode
  const {
    arState,
    startARSession,
    endARSession,
    clearAnchors,
  } = useARMode();

  // Gesture handling for pan and zoom
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let isDragging = false;
    let lastX = 0;
    let lastY = 0;

    const handleMouseDown = (e: MouseEvent) => {
      isDragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const deltaX = e.clientX - lastX;
      const deltaY = e.clientY - lastY;
      panCamera(deltaX, deltaY);
      lastX = e.clientX;
      lastY = e.clientY;
    };

    const handleMouseUp = () => {
      isDragging = false;
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.05 : 0.05;
      zoomCamera(delta);
    };

    container.addEventListener("mousedown", handleMouseDown);
    container.addEventListener("mousemove", handleMouseMove);
    container.addEventListener("mouseup", handleMouseUp);
    container.addEventListener("mouseleave", handleMouseUp);
    container.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      container.removeEventListener("mousedown", handleMouseDown);
      container.removeEventListener("mousemove", handleMouseMove);
      container.removeEventListener("mouseup", handleMouseUp);
      container.removeEventListener("mouseleave", handleMouseUp);
      container.removeEventListener("wheel", handleWheel);
    };
  }, [panCamera, zoomCamera]);

  // Handle star selection
  const handleStarSelect = useCallback(
    (star: Star) => {
      selectStar(star);
      navigateToStar(star.id);
    },
    [selectStar, navigateToStar]
  );

  // Handle star drag for spatial ranking
  const handleStarDragStart = useCallback(
    (star: Star) => {
      if (!enableSpatialRanking) return;
      startDragStar(star);
    },
    [enableSpatialRanking, startDragStar]
  );

  // Handle ranking confirmation
  const handleConfirmRank = useCallback(
    (newRank: number) => {
      const result = endDragStar(newRank);
      if (result.starId && result.newRank !== null && onRankingChange) {
        // Find the constellation containing this star
        const constellation = universe.constellations.find((c) =>
          c.stars.some((s) => s.id === result.starId)
        );
        if (constellation) {
          // Calculate new order based on rank change
          const newOrder = constellation.stars
            .map((s) => ({ id: s.itemId, rank: s.id === result.starId ? result.newRank! : s.rank }))
            .sort((a, b) => a.rank - b.rank)
            .map((s) => s.id);
          onRankingChange(constellation.listId, newOrder);
        }
      }
    },
    [endDragStar, onRankingChange, universe.constellations]
  );

  // Handle ranking cancel
  const handleCancelRank = useCallback(() => {
    selectStar(null);
    endDragStar(null);
  }, [selectStar, endDragStar]);

  // Share functionality
  const handleShare = useCallback(async () => {
    await shareUniverse();
    if (userId) {
      const link = getShareableLink(userId);
      navigator.clipboard.writeText(link);
      // Could show a toast here
    }
  }, [shareUniverse, getShareableLink, userId]);

  // AR toggle
  const handleToggleAR = useCallback(async () => {
    if (arState.isActive) {
      await endARSession();
    } else {
      await startARSession();
    }
  }, [arState.isActive, startARSession, endARSession]);

  // Determine which universe to display
  const displayUniverse = visitedUniverse || universe;
  const isVisiting = !!visitedUniverse;

  return (
    <div
      ref={containerRef}
      className="relative w-full h-screen overflow-hidden"
      style={{ backgroundColor: DEFAULT_UNIVERSE_THEME.backgroundColor }}
      data-testid="taste-universe"
    >
      {/* 3D Canvas */}
      <Suspense fallback={<LoadingFallback />}>
        <Canvas
          gl={{
            antialias: true,
            toneMapping: THREE.ACESFilmicToneMapping,
            outputColorSpace: THREE.SRGBColorSpace,
          }}
          shadows={false}
          dpr={[1, 2]}
          data-testid="taste-universe-canvas"
        >
          {/* Camera */}
          <UniverseCamera
            position={cameraState.position}
            target={cameraState.target}
          />

          {/* Ambient lighting */}
          <ambientLight intensity={displayUniverse.theme.ambientLightIntensity} />

          {/* Cosmic background */}
          <CosmicBackground theme={displayUniverse.theme} />

          {/* Constellations */}
          {displayUniverse.constellations.map((constellation) => (
            <ConstellationGroup
              key={constellation.id}
              constellation={constellation}
              isActive={cameraState.focusedConstellation === constellation.id}
              selectedStarId={cameraState.focusedStar}
              onConstellationClick={navigateToConstellation}
              onStarSelect={handleStarSelect}
              onStarDragStart={handleStarDragStart}
              showConnections
            />
          ))}

          {/* Center drop zone for spatial ranking */}
          {spatialRanking.isActive && spatialRanking.draggedStar && cameraState.focusedConstellation && (
            <CenterDropZone
              position={
                displayUniverse.constellations.find(
                  (c) => c.id === cameraState.focusedConstellation
                )?.position || { x: 0, y: 0, z: 0 }
              }
              isActive={true}
              color={spatialRanking.draggedStar.color}
            />
          )}

          {/* Fog for depth */}
          <fog
            attach="fog"
            args={[
              displayUniverse.theme.fogColor,
              displayUniverse.theme.fogNear,
              displayUniverse.theme.fogFar,
            ]}
          />

          {/* Preload assets */}
          <Preload all />
        </Canvas>
      </Suspense>

      {/* Navigation UI overlay */}
      <UniverseNavigationUI
        cameraState={cameraState}
        constellations={displayUniverse.constellations}
        isVisiting={isVisiting}
        visitingUserName={visitedUniverse?.userName}
        onNavigateToOverview={navigateToOverview}
        onNavigateToConstellation={navigateToConstellation}
        onZoom={zoomCamera}
        onShare={enableSocial ? handleShare : undefined}
        onVisitUniverse={enableSocial ? () => onVisitUniverse?.("") : undefined}
        onReturnToOwn={returnToOwnUniverse}
        onToggleAR={enableAR ? handleToggleAR : undefined}
        isARSupported={arState.isSupported}
        isARActive={arState.isActive}
      />

      {/* Spatial ranking overlay */}
      {enableSpatialRanking && (
        <SpatialRankingOverlay
          spatialRanking={spatialRanking}
          onConfirmRank={handleConfirmRank}
          onCancel={handleCancelRank}
        />
      )}

      {/* Header */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2 text-center pointer-events-none">
        <AnimatePresence mode="wait">
          {!cameraState.focusedConstellation && !cameraState.focusedStar && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
            >
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">
                {isVisiting ? (
                  <>
                    {visitedUniverse?.userName}&apos;s{" "}
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">
                      Taste Universe
                    </span>
                  </>
                ) : (
                  <>
                    Your{" "}
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500">
                      Taste Universe
                    </span>
                  </>
                )}
              </h1>
              <p className="text-lg text-white/60 max-w-xl mx-auto">
                {displayUniverse.stats.totalConstellations} constellations &bull;{" "}
                {displayUniverse.stats.totalStars} stars ranked
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Loading overlay for social visits */}
      <AnimatePresence>
        {isSocialLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 flex items-center justify-center z-50"
          >
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-2 border-purple-500/50 border-t-purple-500 rounded-full animate-spin" />
              <p className="text-white/60">Traveling to another universe...</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Debug info */}
      {debug && (
        <div className="absolute top-4 left-4 p-4 bg-black/80 rounded-lg text-white text-xs font-mono z-50">
          <div>Constellations: {displayUniverse.constellations.length}</div>
          <div>Total Stars: {displayUniverse.stats.totalStars}</div>
          <div>Camera: {JSON.stringify(cameraState.position)}</div>
          <div>Focused: {cameraState.focusedConstellation || "none"}</div>
          <div>Selected Star: {cameraState.focusedStar || "none"}</div>
          <div>Spatial Ranking: {spatialRanking.isActive ? "active" : "inactive"}</div>
          <div>AR Supported: {arState.isSupported ? "yes" : "no"}</div>
          <div>Visiting: {isVisiting ? "yes" : "no"}</div>
        </div>
      )}

      {/* AR Mode Overlay - instructions and controls */}
      {enableAR && arState.isActive && (
        <ARModeOverlay
          arState={arState}
          onClose={endARSession}
          onClearAnchors={clearAnchors}
        />
      )}

      {/* Universe Comparison Panel - when visiting and comparing */}
      {isVisiting && visitedUniverse && showComparison && (
        <UniverseComparisonPanel
          ownUniverse={universe}
          visitedUniverse={visitedUniverse}
          onClose={() => setShowComparison(false)}
        />
      )}

      {/* Compare button - when visiting another universe */}
      {isVisiting && visitedUniverse && !showComparison && (
        <motion.button
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="fixed right-4 top-1/2 -translate-y-1/2 z-50
            px-4 py-3 rounded-xl bg-gradient-to-r from-cyan-500/20 to-purple-500/20
            backdrop-blur-xl border border-white/10
            text-white hover:from-cyan-500/30 hover:to-purple-500/30 transition-colors"
          onClick={() => setShowComparison(true)}
          data-testid="universe-compare-btn"
        >
          <span className="text-sm font-medium">Compare Tastes</span>
        </motion.button>
      )}
    </div>
  );
});
