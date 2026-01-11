"use client";

import { memo, useMemo, useCallback, Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { Preload } from "@react-three/drei";
import * as THREE from "three";
import { motion, AnimatePresence } from "framer-motion";
import {
  StarField,
  GalaxyCluster,
  UniverseCamera,
  NavigationUI,
} from "./components";
import { useUniverseNavigation, useGestureControls } from "./hooks";
import type {
  ShowcaseUniverseProps,
  Card3D,
  GalaxyCategory,
  GalaxyCluster as GalaxyClusterType,
} from "./types";
import { GALAXY_THEMES, GALAXY_POSITIONS } from "./types";
import { showcaseData, LegacyShowcaseItem } from "@/lib/constants/showCaseExamples";
import type { ShowcaseCardData } from "../types";

// Loading fallback for 3D canvas
function LoadingFallback() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-[#0a0f1a]">
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-2 border-cyan-500/20" />
          <div className="absolute inset-0 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin" />
        </div>
        <p className="text-white/60 text-sm">Entering the Universe...</p>
      </div>
    </div>
  );
}

/**
 * Transform showcase data into 3D card format organized by galaxy
 */
function createGalaxyClusters(showcaseItems: LegacyShowcaseItem[]): GalaxyClusterType[] {
  const categoryMap = new Map<GalaxyCategory, Card3D[]>();

  // Initialize categories
  (["Sports", "Music", "Games", "Stories"] as GalaxyCategory[]).forEach((cat) => {
    categoryMap.set(cat, []);
  });

  // Assign showcase items to their galaxies
  showcaseItems.forEach((item, index) => {
    const category = item.category as GalaxyCategory;
    if (!categoryMap.has(category)) {
      // Default to Stories if category not recognized
      categoryMap.set("Stories", categoryMap.get("Stories") || []);
    }

    const galaxyPos = GALAXY_POSITIONS[category] || GALAXY_POSITIONS.Stories;
    const cards = categoryMap.get(category) || [];
    const cardIndex = cards.length;

    const card3D: Card3D = {
      id: `card-${item.id}`,
      category: item.category,
      subcategory: item.subcategory,
      timePeriod: item.timePeriod,
      hierarchy: item.hierarchy,
      title: item.title,
      author: item.author,
      comment: item.comment,
      color: item.color,
      position: {
        x: galaxyPos.x,
        y: galaxyPos.y,
        z: galaxyPos.z,
      },
      rotation: { x: 0, y: 0, z: 0 },
      scale: 0.8 + Math.random() * 0.2,
      galaxyCategory: category,
      orbitRadius: 4 + cardIndex * 1.5,
      orbitSpeed: 0.1 + Math.random() * 0.1,
      orbitOffset: (cardIndex * Math.PI * 2) / Math.max(1, cards.length + 1),
    };

    cards.push(card3D);
    categoryMap.set(category, cards);
  });

  // Create galaxy clusters
  const clusters: GalaxyClusterType[] = [];
  categoryMap.forEach((cards, category) => {
    clusters.push({
      category,
      position: GALAXY_POSITIONS[category],
      theme: GALAXY_THEMES[category],
      cards,
    });
  });

  return clusters;
}

/**
 * ShowcaseUniverse - Immersive 3D universe for exploring showcase categories
 */
export const ShowcaseUniverse = memo(function ShowcaseUniverse({
  onCardClick,
  enableGestures = true,
  initialGalaxy,
  debug = false,
}: ShowcaseUniverseProps) {
  // Navigation state and controls
  const navigation = useUniverseNavigation();

  // Gesture controls
  const { containerRef } = useGestureControls({
    onPan: navigation.panCamera,
    onZoom: navigation.adjustZoom,
    enabled: enableGestures && !navigation.isTransitioning,
  });

  // Create galaxy clusters from showcase data
  const galaxyClusters = useMemo(
    () => createGalaxyClusters(showcaseData),
    []
  );

  // Handle card click
  const handleCardClick = useCallback(
    (card: Card3D) => {
      // First navigate to the card for cinematic zoom
      navigation.navigateToCard(card);

      // Then trigger the callback to open composition modal
      if (onCardClick) {
        // Delay slightly to allow for zoom transition
        setTimeout(() => {
          const cardData: ShowcaseCardData = {
            category: card.category,
            subcategory: card.subcategory,
            timePeriod: card.timePeriod,
            hierarchy: card.hierarchy,
            title: card.title,
            author: card.author,
            comment: card.comment,
            color: card.color,
          };
          onCardClick(cardData);
        }, 800);
      }
    },
    [navigation, onCardClick]
  );

  // Handle galaxy click
  const handleGalaxyClick = useCallback(
    (category: GalaxyCategory) => {
      navigation.navigateToGalaxy(category);
    },
    [navigation]
  );

  return (
    <div
      ref={containerRef}
      className="relative w-full h-screen overflow-hidden bg-[#0a0f1a]"
      data-testid="showcase-universe"
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
          data-testid="showcase-universe-canvas"
        >
          {/* Camera */}
          <UniverseCamera
            position={navigation.cameraPosition}
            target={navigation.cameraTarget}
          />

          {/* Ambient lighting */}
          <ambientLight intensity={0.3} />

          {/* Star field background */}
          <StarField count={2500} radius={80} depth={60} intensity={0.8} />

          {/* Galaxy clusters */}
          {galaxyClusters.map((cluster) => (
            <GalaxyCluster
              key={cluster.category}
              category={cluster.category}
              position={cluster.position}
              theme={cluster.theme}
              cards={cluster.cards}
              isActive={navigation.focusedGalaxy === cluster.category}
              onGalaxyClick={handleGalaxyClick}
              onCardClick={handleCardClick}
              selectedCard={navigation.selectedCard}
            />
          ))}

          {/* Fog for depth */}
          <fog attach="fog" args={["#0a0f1a", 30, 100]} />

          {/* Preload assets */}
          <Preload all />
        </Canvas>
      </Suspense>

      {/* Navigation UI overlay */}
      <NavigationUI
        focusedGalaxy={navigation.focusedGalaxy}
        selectedCard={navigation.selectedCard}
        zoomLevel={navigation.zoomLevel}
        isTransitioning={navigation.isTransitioning}
        onNavigateToOverview={navigation.navigateToOverview}
        onNavigateToGalaxy={navigation.navigateToGalaxy}
        onClearSelection={navigation.clearSelection}
      />

      {/* Header */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2 text-center pointer-events-none">
        <AnimatePresence mode="wait">
          {!navigation.focusedGalaxy && !navigation.selectedCard && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
            >
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">
                Explore the{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500">
                  G.O.A.T.
                </span>{" "}
                Universe
              </h1>
              <p className="text-lg text-white/60 max-w-xl mx-auto">
                Navigate through galaxies of rankings. Click on any card to start your own list.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Debug info */}
      {debug && (
        <div className="absolute top-4 left-4 p-4 bg-black/80 rounded-lg text-white text-xs font-mono">
          <div>Camera: {JSON.stringify(navigation.cameraPosition)}</div>
          <div>Target: {JSON.stringify(navigation.cameraTarget)}</div>
          <div>Galaxy: {navigation.focusedGalaxy || "none"}</div>
          <div>Card: {navigation.selectedCard?.title || "none"}</div>
          <div>Zoom: {navigation.zoomLevel.toFixed(2)}</div>
          <div>Transitioning: {navigation.isTransitioning ? "yes" : "no"}</div>
        </div>
      )}
    </div>
  );
});
