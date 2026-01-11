"use client";

import { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { UniverseTheme } from "../types";

interface CosmicBackgroundProps {
  theme: UniverseTheme;
}

/**
 * CosmicBackground - Ambient star field and nebula effect
 */
export function CosmicBackground({ theme }: CosmicBackgroundProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const geometryRef = useRef<THREE.BufferGeometry>(null);
  const nebulaRef = useRef<THREE.Points>(null);
  const nebulaGeometryRef = useRef<THREE.BufferGeometry>(null);

  // Generate star field positions and colors
  const { starPositions, starColors, starSizes } = useMemo(() => {
    const count = theme.starFieldDensity;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      // Spherical distribution
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const radius = 80 + Math.random() * 120;

      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.sin(phi) * Math.sin(theta);
      const z = radius * Math.cos(phi);

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      // Star colors - blue, white, yellow tints
      const colorType = Math.random();
      if (colorType < 0.3) {
        // Blue stars
        colors[i * 3] = 0.6 + Math.random() * 0.3;
        colors[i * 3 + 1] = 0.7 + Math.random() * 0.3;
        colors[i * 3 + 2] = 1.0;
      } else if (colorType < 0.7) {
        // White stars
        colors[i * 3] = 0.9 + Math.random() * 0.1;
        colors[i * 3 + 1] = 0.9 + Math.random() * 0.1;
        colors[i * 3 + 2] = 0.9 + Math.random() * 0.1;
      } else {
        // Yellow/orange stars
        colors[i * 3] = 1.0;
        colors[i * 3 + 1] = 0.8 + Math.random() * 0.2;
        colors[i * 3 + 2] = 0.5 + Math.random() * 0.3;
      }

      // Star sizes
      sizes[i] = 0.5 + Math.random() * 1.5;
    }

    return { starPositions: positions, starColors: colors, starSizes: sizes };
  }, [theme.starFieldDensity]);

  // Generate nebula particles
  const nebulaData = useMemo(() => {
    if (!theme.nebulaEnabled) return null;

    const count = 500;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      // Cloud-like distribution
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * 60;
      const height = (Math.random() - 0.5) * 30;

      positions[i * 3] = Math.cos(angle) * distance;
      positions[i * 3 + 1] = height;
      positions[i * 3 + 2] = Math.sin(angle) * distance - 40;

      // Purple/blue nebula colors
      colors[i * 3] = 0.3 + Math.random() * 0.2;
      colors[i * 3 + 1] = 0.1 + Math.random() * 0.2;
      colors[i * 3 + 2] = 0.5 + Math.random() * 0.3;
    }

    return { positions, colors };
  }, [theme.nebulaEnabled]);

  // Set up buffer attributes for stars
  useEffect(() => {
    if (!geometryRef.current) return;

    geometryRef.current.setAttribute(
      "position",
      new THREE.BufferAttribute(starPositions, 3)
    );
    geometryRef.current.setAttribute(
      "color",
      new THREE.BufferAttribute(starColors, 3)
    );
    geometryRef.current.setAttribute(
      "size",
      new THREE.BufferAttribute(starSizes.slice(), 1)
    );
  }, [starPositions, starColors, starSizes]);

  // Set up buffer attributes for nebula
  useEffect(() => {
    if (!nebulaGeometryRef.current || !nebulaData) return;

    nebulaGeometryRef.current.setAttribute(
      "position",
      new THREE.BufferAttribute(nebulaData.positions, 3)
    );
    nebulaGeometryRef.current.setAttribute(
      "color",
      new THREE.BufferAttribute(nebulaData.colors, 3)
    );
  }, [nebulaData]);

  // Animate stars twinkling
  useFrame((state) => {
    if (!pointsRef.current) return;

    const time = state.clock.getElapsedTime();
    const sizes = pointsRef.current.geometry.attributes.size;

    if (sizes) {
      for (let i = 0; i < starSizes.length; i++) {
        const twinkle = Math.sin(time * 2 + i * 0.1) * 0.3 + 0.7;
        (sizes.array as Float32Array)[i] = starSizes[i] * twinkle;
      }
      sizes.needsUpdate = true;
    }

    // Slow rotation of entire star field
    pointsRef.current.rotation.y = time * 0.01;
  });

  // Animate nebula
  useFrame((state) => {
    if (!nebulaRef.current || !nebulaData) return;

    const time = state.clock.getElapsedTime();
    nebulaRef.current.rotation.y = time * 0.02;
    nebulaRef.current.rotation.z = Math.sin(time * 0.1) * 0.1;
  });

  return (
    <group data-testid="cosmic-background">
      {/* Star field */}
      <points ref={pointsRef}>
        <bufferGeometry ref={geometryRef} />
        <pointsMaterial
          size={1}
          vertexColors
          transparent
          opacity={0.9}
          sizeAttenuation
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>

      {/* Nebula particles */}
      {nebulaData && (
        <points ref={nebulaRef}>
          <bufferGeometry ref={nebulaGeometryRef} />
          <pointsMaterial
            size={4}
            vertexColors
            transparent
            opacity={0.15}
            sizeAttenuation
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </points>
      )}
    </group>
  );
}
