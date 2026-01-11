"use client";

import { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { GalaxyTheme, Vector3 } from "../types";

interface GalaxyNebulaProps {
  position: Vector3;
  theme: GalaxyTheme;
  particleCount?: number;
  size?: number;
}

/**
 * GalaxyNebula - Themed particle cloud for a galaxy cluster
 */
export function GalaxyNebula({
  position,
  theme,
  particleCount = 500,
  size = 8
}: GalaxyNebulaProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const geometryRef = useRef<THREE.BufferGeometry>(null);
  const rotationRef = useRef(0);

  // Generate nebula particles in a spiral pattern
  const particleData = useMemo(() => {
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    const primaryColor = new THREE.Color(theme.particleColorStart);
    const secondaryColor = new THREE.Color(theme.particleColorEnd);
    const glowColor = new THREE.Color(theme.glow);

    for (let i = 0; i < particleCount; i++) {
      // Spiral galaxy pattern
      const angle = (i / particleCount) * Math.PI * 8;
      const radius = (i / particleCount) * size;
      const spiralOffset = Math.sin(angle * 3) * 0.5;

      // Add some randomness
      const randomX = (Math.random() - 0.5) * 2;
      const randomY = (Math.random() - 0.5) * 1.5;
      const randomZ = (Math.random() - 0.5) * 2;

      positions[i * 3] = Math.cos(angle) * radius + randomX;
      positions[i * 3 + 1] = spiralOffset + randomY;
      positions[i * 3 + 2] = Math.sin(angle) * radius + randomZ;

      // Blend colors based on distance from center
      const distanceRatio = radius / size;
      const color = new THREE.Color();

      if (distanceRatio < 0.3) {
        color.lerpColors(glowColor, primaryColor, distanceRatio / 0.3);
      } else {
        color.lerpColors(primaryColor, secondaryColor, (distanceRatio - 0.3) / 0.7);
      }

      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    return { positions, colors };
  }, [particleCount, size, theme]);

  // Set up buffer attributes
  useEffect(() => {
    if (!geometryRef.current) return;

    geometryRef.current.setAttribute(
      "position",
      new THREE.BufferAttribute(particleData.positions, 3)
    );
    geometryRef.current.setAttribute(
      "color",
      new THREE.BufferAttribute(particleData.colors, 3)
    );
  }, [particleData]);

  // Animate rotation
  useFrame((state, delta) => {
    if (!pointsRef.current) return;

    rotationRef.current += delta * 0.1;
    pointsRef.current.rotation.y = rotationRef.current;

    // Subtle scale pulsing
    const pulse = Math.sin(state.clock.getElapsedTime() * 0.5) * 0.02 + 1;
    pointsRef.current.scale.setScalar(pulse);
  });

  return (
    <group position={[position.x, position.y, position.z]}>
      <points ref={pointsRef} data-testid="galaxy-nebula">
        <bufferGeometry ref={geometryRef} />
        <pointsMaterial
          size={0.4}
          vertexColors
          transparent
          opacity={0.8}
          sizeAttenuation
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>

      {/* Center glow sphere */}
      <mesh>
        <sphereGeometry args={[0.8, 16, 16]} />
        <meshBasicMaterial
          color={theme.glow}
          transparent
          opacity={0.3}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Outer glow */}
      <mesh>
        <sphereGeometry args={[1.5, 16, 16]} />
        <meshBasicMaterial
          color={theme.primary}
          transparent
          opacity={0.1}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
}
