"use client";

import { useRef, useState, useCallback } from "react";
import { useFrame, ThreeEvent } from "@react-three/fiber";
import { Text, Sphere } from "@react-three/drei";
import * as THREE from "three";
import type { Star, StarBrightness } from "../types";

interface StarObjectProps {
  star: Star;
  isSelected?: boolean;
  isDragging?: boolean;
  onSelect?: (star: Star) => void;
  onDragStart?: (star: Star) => void;
  onDragEnd?: (star: Star, position: THREE.Vector3) => void;
}

// Brightness to emissive intensity mapping
const BRIGHTNESS_INTENSITY: Record<StarBrightness, number> = {
  bright: 2.5,
  medium: 1.5,
  dim: 0.8,
  faint: 0.3,
};

/**
 * StarObject - Individual star (ranked item) in a constellation
 * Stars pulse and glow based on their ranking position
 */
export function StarObject({
  star,
  isSelected = false,
  isDragging = false,
  onSelect,
  onDragStart,
  onDragEnd,
}: StarObjectProps) {
  const groupRef = useRef<THREE.Group>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const [isHovered, setIsHovered] = useState(false);
  const pulsePhaseRef = useRef(Math.random() * Math.PI * 2);

  // Calculate emissive intensity based on brightness
  const baseIntensity = BRIGHTNESS_INTENSITY[star.brightness];

  // Animate star pulsing and glow
  useFrame((state) => {
    if (!groupRef.current || !glowRef.current) return;

    const time = state.clock.getElapsedTime();

    // Pulse effect based on rank (higher rank = faster pulse)
    const pulse = Math.sin(time * star.pulseSpeed + pulsePhaseRef.current) * 0.2 + 1;
    const scale = star.size * pulse * (isHovered ? 1.3 : 1) * (isSelected ? 1.5 : 1);
    groupRef.current.scale.setScalar(scale);

    // Glow pulsing
    const glowScale = star.size * 3 * (1 + Math.sin(time * star.pulseSpeed * 0.5) * 0.15);
    glowRef.current.scale.setScalar(glowScale);

    // Dragging animation
    if (isDragging) {
      groupRef.current.rotation.y += 0.05;
    }
  });

  const handleClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      onSelect?.(star);
    },
    [onSelect, star]
  );

  const handlePointerDown = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      onDragStart?.(star);
    },
    [onDragStart, star]
  );

  const handlePointerUp = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      if (isDragging && groupRef.current) {
        onDragEnd?.(star, groupRef.current.position);
      }
    },
    [isDragging, onDragEnd, star]
  );

  const handlePointerOver = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setIsHovered(true);
    document.body.style.cursor = "pointer";
  }, []);

  const handlePointerOut = useCallback(() => {
    setIsHovered(false);
    document.body.style.cursor = "auto";
  }, []);

  return (
    <group
      ref={groupRef}
      position={[star.position.x, star.position.y, star.position.z]}
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
      data-testid={`star-object-${star.id}`}
    >
      {/* Core star */}
      <Sphere args={[0.3, 16, 16]}>
        <meshStandardMaterial
          color={star.color}
          emissive={star.color}
          emissiveIntensity={baseIntensity * (isHovered ? 1.5 : 1)}
          metalness={0.8}
          roughness={0.2}
        />
      </Sphere>

      {/* Inner glow */}
      <Sphere args={[0.4, 16, 16]}>
        <meshBasicMaterial
          color={star.color}
          transparent
          opacity={0.4}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </Sphere>

      {/* Outer glow */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial
          color={star.color}
          transparent
          opacity={0.1}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Rank indicator (shown on hover or selection) */}
      {(isHovered || isSelected) && (
        <group position={[0, star.size * 2 + 0.5, 0]}>
          {/* Rank badge background */}
          <mesh>
            <planeGeometry args={[0.8, 0.4]} />
            <meshBasicMaterial
              color="#0a0f1a"
              transparent
              opacity={0.85}
            />
          </mesh>

          {/* Rank number */}
          <Text
            position={[0, 0.02, 0.01]}
            fontSize={0.25}
            color={star.color}
            anchorX="center"
            anchorY="middle"
            font="/fonts/Inter-Bold.woff"
          >
            #{star.rank}
          </Text>
        </group>
      )}

      {/* Star name label (shown on hover or selection) */}
      {(isHovered || isSelected) && (
        <group position={[0, -star.size * 2 - 0.5, 0]}>
          <Text
            fontSize={0.2}
            color="white"
            anchorX="center"
            anchorY="middle"
            maxWidth={3}
            textAlign="center"
          >
            {star.name}
          </Text>
        </group>
      )}

      {/* Selection ring */}
      {isSelected && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[star.size + 0.3, star.size + 0.5, 32]} />
          <meshBasicMaterial
            color={star.color}
            transparent
            opacity={0.6}
            side={THREE.DoubleSide}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      )}

      {/* Point light for brighter stars */}
      {(star.brightness === "bright" || star.brightness === "medium") && (
        <pointLight
          color={star.color}
          intensity={baseIntensity * 0.5}
          distance={5}
          decay={2}
        />
      )}
    </group>
  );
}
