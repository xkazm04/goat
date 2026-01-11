"use client";

import { useMemo, useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { Star, StarConnection, ConstellationTheme } from "../types";

interface StarConnectionsProps {
  stars: Star[];
  connections: StarConnection[];
  theme: ConstellationTheme;
  visible?: boolean;
}

/**
 * StarConnections - Renders lines connecting related stars in a constellation
 * Animated lines create a "drawing constellation" effect
 */
export function StarConnections({
  stars,
  connections,
  theme,
  visible = true,
}: StarConnectionsProps) {
  const linesRef = useRef<THREE.LineSegments>(null);
  const geometryRef = useRef<THREE.BufferGeometry>(null);
  const drawProgressRef = useRef<number[]>([]);

  // Create line geometry from connections
  const { positions, colors, animatedConnections } = useMemo(() => {
    const pos: number[] = [];
    const col: number[] = [];
    const animated: { from: THREE.Vector3; to: THREE.Vector3; color: THREE.Color }[] = [];

    // Create a map of star IDs to positions
    const starPositions = new Map<string, THREE.Vector3>();
    stars.forEach((star) => {
      starPositions.set(star.id, new THREE.Vector3(star.position.x, star.position.y, star.position.z));
    });

    connections.forEach((connection) => {
      const fromPos = starPositions.get(connection.fromStarId);
      const toPos = starPositions.get(connection.toStarId);

      if (!fromPos || !toPos) return;

      // Parse color
      const color = new THREE.Color(connection.color);

      if (connection.animated) {
        animated.push({ from: fromPos, to: toPos, color });
      } else {
        // Static line
        pos.push(fromPos.x, fromPos.y, fromPos.z);
        pos.push(toPos.x, toPos.y, toPos.z);

        // Color with strength-based opacity
        col.push(color.r, color.g, color.b);
        col.push(color.r, color.g, color.b);
      }
    });

    // Initialize draw progress
    drawProgressRef.current = animated.map(() => 0);

    return {
      positions: new Float32Array(pos),
      colors: new Float32Array(col),
      animatedConnections: animated,
    };
  }, [stars, connections]);

  // Set up buffer attributes for static lines
  useEffect(() => {
    if (!geometryRef.current || positions.length === 0) return;

    geometryRef.current.setAttribute(
      "position",
      new THREE.BufferAttribute(positions, 3)
    );
    geometryRef.current.setAttribute(
      "color",
      new THREE.BufferAttribute(colors, 3)
    );
  }, [positions, colors]);

  // Animate the "drawing" effect for animated connections
  useFrame((state) => {
    if (!visible) return;

    const time = state.clock.getElapsedTime();

    // Update animated line progress
    animatedConnections.forEach((_, index) => {
      const progress = drawProgressRef.current[index];
      if (progress < 1) {
        drawProgressRef.current[index] = Math.min(1, progress + 0.005);
      }
    });

    // Pulsing effect for lines
    if (linesRef.current) {
      const material = linesRef.current.material as THREE.LineBasicMaterial;
      material.opacity = theme.connectionOpacity * (0.8 + Math.sin(time * 2) * 0.2);
    }
  });

  if (!visible || positions.length === 0) return null;

  return (
    <group data-testid="star-connections">
      {/* Static connections */}
      <lineSegments ref={linesRef}>
        <bufferGeometry ref={geometryRef} />
        <lineBasicMaterial
          vertexColors
          transparent
          opacity={theme.connectionOpacity}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </lineSegments>

      {/* Animated connections */}
      {animatedConnections.map((conn, index) => (
        <AnimatedConnection
          key={`animated-${index}`}
          from={conn.from}
          to={conn.to}
          color={conn.color}
          opacity={theme.connectionOpacity}
        />
      ))}
    </group>
  );
}

interface AnimatedConnectionProps {
  from: THREE.Vector3;
  to: THREE.Vector3;
  color: THREE.Color;
  opacity: number;
}

/**
 * AnimatedConnection - Single animated line with drawing effect
 */
function AnimatedConnection({ from, to, color, opacity }: AnimatedConnectionProps) {
  const groupRef = useRef<THREE.Group>(null);
  const progressRef = useRef(0);
  const particleRef = useRef<THREE.Points>(null);
  const particleGeometryRef = useRef<THREE.BufferGeometry>(null);

  // Create line geometry
  const geometry = useMemo(() => {
    const points = [from, to];
    return new THREE.BufferGeometry().setFromPoints(points);
  }, [from, to]);

  // Set up particle geometry
  useEffect(() => {
    if (!particleGeometryRef.current) return;

    particleGeometryRef.current.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array([0, 0, 0]), 3)
    );
  }, []);

  // Animate the line drawing and traveling particle
  useFrame((state) => {
    const time = state.clock.getElapsedTime();

    // Animate traveling particle
    if (particleRef.current && progressRef.current >= 1) {
      const particleProgress = (time * 0.5) % 1;
      const particlePos = new THREE.Vector3().lerpVectors(from, to, particleProgress);
      particleRef.current.position.copy(particlePos);
    }
  });

  // Create material for the line
  const lineMaterial = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        color,
        transparent: true,
        opacity: opacity * 1.5,
        blending: THREE.AdditiveBlending,
      }),
    [color, opacity]
  );

  return (
    <group ref={groupRef}>
      {/* Main line - using primitive to avoid JSX type issues */}
      <primitive object={new THREE.Line(geometry, lineMaterial)} />

      {/* Traveling particle (energy flow) */}
      <points ref={particleRef}>
        <bufferGeometry ref={particleGeometryRef} />
        <pointsMaterial
          color={color}
          size={0.3}
          transparent
          opacity={0.8}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>
    </group>
  );
}
