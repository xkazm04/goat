"use client";

import { useRef, useCallback, useState } from "react";
import { useFrame, ThreeEvent } from "@react-three/fiber";
import { Text, Html } from "@react-three/drei";
import * as THREE from "three";
import { StarObject } from "./StarObject";
import { StarConnections } from "./StarConnections";
import type { Constellation, Star, Vector3 } from "../types";

interface ConstellationGroupProps {
  constellation: Constellation;
  isActive: boolean;
  selectedStarId?: string | null;
  onConstellationClick?: (id: string) => void;
  onStarSelect?: (star: Star) => void;
  onStarDragStart?: (star: Star) => void;
  onStarDragEnd?: (star: Star, position: THREE.Vector3) => void;
  showConnections?: boolean;
}

/**
 * ConstellationGroup - A complete constellation with stars, connections, and label
 * Represents a ranked list in the 3D taste universe
 */
export function ConstellationGroup({
  constellation,
  isActive,
  selectedStarId,
  onConstellationClick,
  onStarSelect,
  onStarDragStart,
  onStarDragEnd,
  showConnections = true,
}: ConstellationGroupProps) {
  const groupRef = useRef<THREE.Group>(null);
  const labelRef = useRef<THREE.Group>(null);
  const [isHovered, setIsHovered] = useState(false);

  // Animate constellation floating and scale
  useFrame((state) => {
    if (!groupRef.current) return;

    const time = state.clock.getElapsedTime();

    // Subtle floating animation
    const floatOffset = Math.sin(time * 0.2 + constellation.position.x) * 0.3;
    groupRef.current.position.y = constellation.position.y + floatOffset;

    // Scale effect when active
    const targetScale = isActive ? 1.1 : isHovered ? 1.05 : 1;
    groupRef.current.scale.lerp(
      new THREE.Vector3(targetScale, targetScale, targetScale),
      0.05
    );

    // Billboard effect for label
    if (labelRef.current) {
      labelRef.current.quaternion.copy(state.camera.quaternion);
    }
  });

  const handleConstellationClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      onConstellationClick?.(constellation.id);
    },
    [onConstellationClick, constellation.id]
  );

  const handlePointerOver = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setIsHovered(true);
  }, []);

  const handlePointerOut = useCallback(() => {
    setIsHovered(false);
  }, []);

  // Find center position for constellation label
  const centerY = constellation.stars.reduce((sum, s) => sum + s.position.y, 0) / constellation.stars.length || 0;
  const minY = Math.min(...constellation.stars.map((s) => s.position.y));

  return (
    <group
      ref={groupRef}
      position={[constellation.position.x, constellation.position.y, constellation.position.z]}
      data-testid={`constellation-${constellation.id}`}
    >
      {/* Star connections (lines between ranked items) */}
      {showConnections && (
        <StarConnections
          stars={constellation.stars}
          connections={constellation.connections}
          theme={constellation.theme}
          visible={isActive || isHovered}
        />
      )}

      {/* Individual stars */}
      {constellation.stars.map((star) => (
        <StarObject
          key={star.id}
          star={{
            ...star,
            // Adjust position relative to constellation center
            position: {
              x: star.position.x - constellation.position.x,
              y: star.position.y - constellation.position.y,
              z: star.position.z - constellation.position.z,
            },
          }}
          isSelected={selectedStarId === star.id}
          onSelect={onStarSelect}
          onDragStart={onStarDragStart}
          onDragEnd={onStarDragEnd}
        />
      ))}

      {/* Constellation nebula/glow */}
      <mesh
        onClick={handleConstellationClick}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      >
        <sphereGeometry args={[10, 16, 16]} />
        <meshBasicMaterial
          color={constellation.theme.nebulaColor}
          transparent
          opacity={isActive ? 0.08 : isHovered ? 0.05 : 0.02}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.BackSide}
        />
      </mesh>

      {/* Constellation label */}
      <group
        ref={labelRef}
        position={[0, minY - constellation.position.y - 3, 0]}
      >
        {/* Label background */}
        <mesh>
          <planeGeometry args={[5, 1.2]} />
          <meshBasicMaterial
            color="#030712"
            transparent
            opacity={0.75}
          />
        </mesh>

        {/* Constellation name */}
        <Text
          position={[0, 0.15, 0.01]}
          fontSize={0.4}
          color={constellation.theme.primaryColor}
          anchorX="center"
          anchorY="middle"
          font="/fonts/Inter-Bold.woff"
        >
          {constellation.name}
        </Text>

        {/* Star count */}
        <Text
          position={[0, -0.25, 0.01]}
          fontSize={0.2}
          color="#6b7280"
          anchorX="center"
          anchorY="middle"
        >
          {constellation.stars.length} items ranked
        </Text>

        {/* Category badge */}
        <group position={[0, 0.5, 0.01]}>
          <mesh>
            <planeGeometry args={[1.2, 0.3]} />
            <meshBasicMaterial
              color={constellation.theme.primaryColor}
              transparent
              opacity={0.2}
            />
          </mesh>
          <Text
            fontSize={0.12}
            color={constellation.theme.glowColor}
            anchorX="center"
            anchorY="middle"
          >
            {constellation.category}
          </Text>
        </group>

        {/* Underline accent */}
        <mesh position={[0, -0.45, 0.01]}>
          <planeGeometry args={[3, 0.03]} />
          <meshBasicMaterial
            color={constellation.theme.glowColor}
            transparent
            opacity={0.5}
          />
        </mesh>
      </group>

      {/* Author attribution */}
      {constellation.authorName && (
        <group position={[0, minY - constellation.position.y - 4.5, 0]}>
          <Text
            fontSize={0.15}
            color="#9ca3af"
            anchorX="center"
            anchorY="middle"
          >
            by {constellation.authorName}
          </Text>
        </group>
      )}

      {/* Center core (prominent for #1 position) */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.8, 32, 32]} />
        <meshBasicMaterial
          color={constellation.theme.glowColor}
          transparent
          opacity={isActive ? 0.15 : 0.05}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Central point light */}
      <pointLight
        color={constellation.theme.glowColor}
        intensity={isActive ? 3 : 1}
        distance={20}
        decay={2}
      />
    </group>
  );
}
