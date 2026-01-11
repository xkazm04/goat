"use client";

import { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";
import type { Star, Vector3 } from "../types";

interface DragPhysicsIndicatorProps {
  draggedStar: Star;
  targetPosition: Vector3;
  constellationCenter: Vector3;
  maxRank: number;
}

/**
 * DragPhysicsIndicator - Visual physics feedback during spatial ranking
 * Shows trajectory arc, distance to center, and predicted rank position
 */
export function DragPhysicsIndicator({
  draggedStar,
  targetPosition,
  constellationCenter,
  maxRank,
}: DragPhysicsIndicatorProps) {
  const trailRef = useRef<THREE.Points>(null);
  const trailGeometryRef = useRef<THREE.BufferGeometry>(null);
  const labelGroupRef = useRef<THREE.Group>(null);
  const arcLineRef = useRef<THREE.Line | null>(null);
  const centerLineRef = useRef<THREE.Line | null>(null);
  const groupRef = useRef<THREE.Group>(null);

  // Calculate distance to center and predicted rank
  const { distanceToCenter, predictedRank, distanceNormalized } = useMemo(() => {
    const dx = targetPosition.x - constellationCenter.x;
    const dy = targetPosition.y - constellationCenter.y;
    const dz = targetPosition.z - constellationCenter.z;
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

    // Max distance for ranking calculation
    const maxDistance = 10;
    const normalized = Math.min(distance / maxDistance, 1);

    // Predicted rank (closer to center = lower rank = better)
    const predicted = Math.max(1, Math.ceil(normalized * maxRank));

    return {
      distanceToCenter: distance,
      predictedRank: predicted,
      distanceNormalized: normalized,
    };
  }, [targetPosition, constellationCenter, maxRank]);

  // Color based on distance (closer = greener/better)
  const indicatorColor = useMemo(() => {
    const hue = (1 - distanceNormalized) * 120; // 0=red, 120=green
    return `hsl(${hue}, 80%, 60%)`;
  }, [distanceNormalized]);

  // Generate arc curve from star to target position
  const arcGeometry = useMemo(() => {
    const start = new THREE.Vector3(
      draggedStar.position.x,
      draggedStar.position.y,
      draggedStar.position.z
    );
    const end = new THREE.Vector3(targetPosition.x, targetPosition.y, targetPosition.z);

    // Create control point for arc
    const mid = start.clone().add(end).multiplyScalar(0.5);
    mid.y += 2; // Arc upward

    const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
    const points = curve.getPoints(50);

    return new THREE.BufferGeometry().setFromPoints(points);
  }, [draggedStar.position, targetPosition]);

  // Generate trail particles
  const trailPositions = useMemo(() => {
    const count = 30;
    const positions = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const t = i / count;
      const angle = t * Math.PI * 4;
      const radius = (1 - t) * 0.5;

      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = t * 0.5;
      positions[i * 3 + 2] = Math.sin(angle) * radius;
    }

    return positions;
  }, []);

  // Create arc line
  useEffect(() => {
    if (!groupRef.current) return;

    // Create arc line
    const arcMaterial = new THREE.LineBasicMaterial({
      color: indicatorColor,
      transparent: true,
      opacity: 0.6,
    });
    const arcLine = new THREE.Line(arcGeometry, arcMaterial);
    arcLineRef.current = arcLine;
    groupRef.current.add(arcLine);

    // Create center line
    const centerLineGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(targetPosition.x, targetPosition.y, targetPosition.z),
      new THREE.Vector3(constellationCenter.x, constellationCenter.y, constellationCenter.z),
    ]);
    const centerLineMaterial = new THREE.LineDashedMaterial({
      color: indicatorColor,
      transparent: true,
      opacity: 0.3,
      dashSize: 0.3,
      gapSize: 0.15,
    });
    const centerLine = new THREE.Line(centerLineGeometry, centerLineMaterial);
    centerLine.computeLineDistances();
    centerLineRef.current = centerLine;
    groupRef.current.add(centerLine);

    return () => {
      if (arcLineRef.current && groupRef.current) {
        groupRef.current.remove(arcLineRef.current);
        arcLineRef.current.geometry.dispose();
        (arcLineRef.current.material as THREE.Material).dispose();
      }
      if (centerLineRef.current && groupRef.current) {
        groupRef.current.remove(centerLineRef.current);
        centerLineRef.current.geometry.dispose();
        (centerLineRef.current.material as THREE.Material).dispose();
      }
    };
  }, [arcGeometry, indicatorColor, targetPosition, constellationCenter]);

  // Set up trail geometry
  useEffect(() => {
    if (!trailGeometryRef.current) return;

    trailGeometryRef.current.setAttribute(
      "position",
      new THREE.BufferAttribute(trailPositions.slice(), 3)
    );
  }, [trailPositions]);

  // Animate trail and arc
  useFrame((state) => {
    const time = state.clock.getElapsedTime();

    // Animate trail particles
    if (trailRef.current && trailGeometryRef.current) {
      const positions = trailGeometryRef.current.attributes.position;
      if (positions) {
        for (let i = 0; i < positions.count; i++) {
          const t = (i / positions.count + time * 0.5) % 1;
          const angle = t * Math.PI * 6;
          const radius = (1 - t) * 0.3;

          (positions.array as Float32Array)[i * 3] = Math.cos(angle) * radius;
          (positions.array as Float32Array)[i * 3 + 1] = t * 1.5 - 0.75;
          (positions.array as Float32Array)[i * 3 + 2] = Math.sin(angle) * radius;
        }
        positions.needsUpdate = true;
      }

      trailRef.current.position.set(targetPosition.x, targetPosition.y, targetPosition.z);
    }

    // Billboard effect for label
    if (labelGroupRef.current) {
      labelGroupRef.current.quaternion.copy(state.camera.quaternion);
    }
  });

  return (
    <group ref={groupRef} data-testid="drag-physics-indicator">
      {/* Spiral trail at target position */}
      <points ref={trailRef}>
        <bufferGeometry ref={trailGeometryRef} />
        <pointsMaterial
          color={draggedStar.color}
          size={0.1}
          transparent
          opacity={0.8}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>

      {/* Target position indicator */}
      <group position={[targetPosition.x, targetPosition.y, targetPosition.z]}>
        {/* Pulsing ring */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.6, 0.8, 32]} />
          <meshBasicMaterial
            color={indicatorColor}
            transparent
            opacity={0.5}
            side={THREE.DoubleSide}
            blending={THREE.AdditiveBlending}
          />
        </mesh>

        {/* Center dot */}
        <mesh>
          <sphereGeometry args={[0.15, 16, 16]} />
          <meshBasicMaterial color={indicatorColor} />
        </mesh>

        {/* Rank prediction label */}
        <group ref={labelGroupRef} position={[0, 1.5, 0]}>
          {/* Background */}
          <mesh>
            <planeGeometry args={[1.2, 0.6]} />
            <meshBasicMaterial
              color="#0a0f1a"
              transparent
              opacity={0.85}
            />
          </mesh>

          {/* Predicted rank text */}
          <Text
            position={[0, 0.08, 0.01]}
            fontSize={0.25}
            color={indicatorColor}
            anchorX="center"
            anchorY="middle"
            font="/fonts/Inter-Bold.woff"
          >
            #{predictedRank}
          </Text>

          {/* Distance indicator */}
          <Text
            position={[0, -0.15, 0.01]}
            fontSize={0.1}
            color="#6b7280"
            anchorX="center"
            anchorY="middle"
          >
            {distanceToCenter.toFixed(1)}m to center
          </Text>
        </group>
      </group>
    </group>
  );
}
