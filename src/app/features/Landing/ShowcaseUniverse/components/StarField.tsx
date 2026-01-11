"use client";

import { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface StarFieldProps {
  count?: number;
  radius?: number;
  depth?: number;
  intensity?: number;
}

/**
 * StarField - Background star particles for the universe
 */
export function StarField({
  count = 3000,
  radius = 100,
  depth = 80,
  intensity = 1
}: StarFieldProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const geometryRef = useRef<THREE.BufferGeometry>(null);

  // Generate star positions
  const starData = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const baseSizes = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      // Distribute stars in a spherical shell
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = radius * (0.5 + Math.random() * 0.5);

      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = -depth * Math.random() - 10;

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      // Vary star colors slightly (white to light blue/yellow)
      const colorVariation = Math.random();
      if (colorVariation > 0.7) {
        // Blue-ish stars
        colors[i * 3] = 0.8 + Math.random() * 0.2;
        colors[i * 3 + 1] = 0.9 + Math.random() * 0.1;
        colors[i * 3 + 2] = 1;
      } else if (colorVariation > 0.4) {
        // White stars
        colors[i * 3] = 1;
        colors[i * 3 + 1] = 1;
        colors[i * 3 + 2] = 1;
      } else {
        // Yellow-ish stars
        colors[i * 3] = 1;
        colors[i * 3 + 1] = 0.95 + Math.random() * 0.05;
        colors[i * 3 + 2] = 0.8 + Math.random() * 0.2;
      }

      // Vary star sizes
      baseSizes[i] = (0.3 + Math.random() * 0.7) * intensity;
    }

    return { positions, colors, baseSizes };
  }, [count, radius, depth, intensity]);

  // Set up buffer attributes
  useEffect(() => {
    if (!geometryRef.current) return;

    geometryRef.current.setAttribute(
      "position",
      new THREE.BufferAttribute(starData.positions, 3)
    );
    geometryRef.current.setAttribute(
      "color",
      new THREE.BufferAttribute(starData.colors, 3)
    );
  }, [starData]);

  return (
    <points ref={pointsRef} data-testid="star-field">
      <bufferGeometry ref={geometryRef} />
      <pointsMaterial
        size={0.5}
        vertexColors
        transparent
        opacity={0.9}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}
