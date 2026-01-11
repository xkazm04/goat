"use client";

import { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";

interface CenterDropZoneProps {
  position: { x: number; y: number; z: number };
  isActive: boolean;
  color: string;
}

/**
 * CenterDropZone - Visual indicator for the #1 rank position
 * Glows when dragging to encourage dropping at center
 */
export function CenterDropZone({ position, isActive, color }: CenterDropZoneProps) {
  const ringRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const particlesRef = useRef<THREE.Points>(null);
  const particleGeometryRef = useRef<THREE.BufferGeometry>(null);

  // Generate particle positions for center attraction effect
  const particlePositions = useMemo(() => {
    const count = 50;
    const positions = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const radius = 2 + Math.random() * 2;

      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 2;
      positions[i * 3 + 2] = Math.sin(angle) * radius;
    }

    return positions;
  }, []);

  // Set up particle geometry
  useEffect(() => {
    if (!particleGeometryRef.current) return;

    particleGeometryRef.current.setAttribute(
      "position",
      new THREE.BufferAttribute(particlePositions.slice(), 3)
    );
  }, [particlePositions]);

  // Animate the drop zone
  useFrame((state) => {
    if (!ringRef.current || !glowRef.current) return;

    const time = state.clock.getElapsedTime();

    // Pulsing ring
    const scale = 1 + Math.sin(time * 3) * 0.1;
    ringRef.current.scale.setScalar(isActive ? scale : 1);
    ringRef.current.rotation.z = time * 0.5;

    // Glow intensity
    const material = glowRef.current.material as THREE.MeshBasicMaterial;
    material.opacity = isActive ? 0.3 + Math.sin(time * 4) * 0.1 : 0.1;

    // Particle attraction animation
    if (particlesRef.current && isActive) {
      const positions = particlesRef.current.geometry.attributes.position;
      if (positions) {
        for (let i = 0; i < positions.count; i++) {
          const x = (positions.array as Float32Array)[i * 3];
          const z = (positions.array as Float32Array)[i * 3 + 2];

          // Move particles toward center
          const angle = Math.atan2(z, x);
          const currentRadius = Math.sqrt(x * x + z * z);
          const newRadius = currentRadius - 0.05;

          if (newRadius < 0.5) {
            // Reset particle to outer ring
            const resetRadius = 3 + Math.random();
            (positions.array as Float32Array)[i * 3] = Math.cos(angle) * resetRadius;
            (positions.array as Float32Array)[i * 3 + 2] = Math.sin(angle) * resetRadius;
          } else {
            (positions.array as Float32Array)[i * 3] = Math.cos(angle) * newRadius;
            (positions.array as Float32Array)[i * 3 + 2] = Math.sin(angle) * newRadius;
          }
        }
        positions.needsUpdate = true;
      }
    }
  });

  if (!isActive) return null;

  return (
    <group position={[position.x, position.y, position.z]} data-testid="center-drop-zone">
      {/* Outer ring */}
      <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.8, 2, 32]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.6}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Inner glow */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[1.5, 32, 32]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.2}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Attraction particles */}
      <points ref={particlesRef}>
        <bufferGeometry ref={particleGeometryRef} />
        <pointsMaterial
          color={color}
          size={0.15}
          transparent
          opacity={0.8}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>

      {/* Label */}
      <Text
        position={[0, -2.5, 0]}
        fontSize={0.3}
        color={color}
        anchorX="center"
        anchorY="middle"
      >
        Drop for #1
      </Text>

      {/* Point light */}
      <pointLight color={color} intensity={2} distance={8} decay={2} />
    </group>
  );
}
