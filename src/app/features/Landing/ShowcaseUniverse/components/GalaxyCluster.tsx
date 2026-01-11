"use client";

import { useRef, useCallback } from "react";
import { useFrame, ThreeEvent } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";
import { GalaxyNebula } from "./GalaxyNebula";
import { Card3DObject } from "./Card3DObject";
import type { GalaxyCategory, GalaxyTheme, Vector3, Card3D } from "../types";

interface GalaxyClusterProps {
  category: GalaxyCategory;
  position: Vector3;
  theme: GalaxyTheme;
  cards: Card3D[];
  isActive: boolean;
  onGalaxyClick?: (category: GalaxyCategory) => void;
  onCardClick?: (card: Card3D) => void;
  selectedCard?: Card3D | null;
}

/**
 * GalaxyCluster - A themed galaxy with orbiting showcase cards
 */
export function GalaxyCluster({
  category,
  position,
  theme,
  cards,
  isActive,
  onGalaxyClick,
  onCardClick,
  selectedCard,
}: GalaxyClusterProps) {
  const groupRef = useRef<THREE.Group>(null);
  const labelRef = useRef<THREE.Group>(null);

  // Animate the galaxy cluster
  useFrame((state) => {
    if (!groupRef.current || !labelRef.current) return;

    // Subtle floating animation for the whole cluster
    const time = state.clock.getElapsedTime();
    const floatOffset = Math.sin(time * 0.3) * 0.2;
    groupRef.current.position.y = position.y + floatOffset;

    // Make label always face camera (billboard)
    labelRef.current.quaternion.copy(state.camera.quaternion);

    // Scale effect when active
    const targetScale = isActive ? 1.1 : 1;
    groupRef.current.scale.lerp(
      new THREE.Vector3(targetScale, targetScale, targetScale),
      0.05
    );
  });

  const handleGalaxyClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      onGalaxyClick?.(category);
    },
    [onGalaxyClick, category]
  );

  return (
    <group
      ref={groupRef}
      position={[position.x, position.y, position.z]}
      data-testid={`galaxy-cluster-${category.toLowerCase()}`}
    >
      {/* Nebula particle system */}
      <GalaxyNebula
        position={{ x: 0, y: 0, z: 0 }}
        theme={theme}
        particleCount={400}
        size={6}
      />

      {/* Galaxy label */}
      <group
        ref={labelRef}
        position={[0, -5, 0]}
        onClick={handleGalaxyClick}
      >
        {/* Label background */}
        <mesh>
          <planeGeometry args={[4, 0.8]} />
          <meshBasicMaterial
            color="#0a0f1a"
            transparent
            opacity={0.7}
          />
        </mesh>

        {/* Label text */}
        <Text
          position={[0, 0, 0.01]}
          fontSize={0.4}
          color={theme.primary}
          anchorX="center"
          anchorY="middle"
          font="/fonts/Inter-Bold.woff"
        >
          {category}
        </Text>

        {/* Underline accent */}
        <mesh position={[0, -0.3, 0.01]}>
          <planeGeometry args={[2, 0.04]} />
          <meshBasicMaterial
            color={theme.glow}
            transparent
            opacity={0.6}
          />
        </mesh>
      </group>

      {/* Card count indicator */}
      <group position={[0, -5.8, 0]}>
        <Text
          fontSize={0.2}
          color="#6b7280"
          anchorX="center"
          anchorY="middle"
        >
          {cards.length} {cards.length === 1 ? "list" : "lists"}
        </Text>
      </group>

      {/* Orbiting cards */}
      {cards.map((card) => (
        <Card3DObject
          key={card.id}
          card={card}
          onClick={onCardClick}
          isSelected={selectedCard?.id === card.id}
        />
      ))}

      {/* Central light source */}
      <pointLight
        color={theme.glow}
        intensity={2}
        distance={15}
        decay={2}
      />

      {/* Ambient glow for the galaxy */}
      <mesh>
        <sphereGeometry args={[0.5, 16, 16]} />
        <meshBasicMaterial
          color={theme.glow}
          transparent
          opacity={0.5}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
}
