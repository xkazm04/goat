"use client";

import { useRef, useState, useCallback } from "react";
import { useFrame, ThreeEvent } from "@react-three/fiber";
import { Text, RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import type { Card3D } from "../types";

interface Card3DObjectProps {
  card: Card3D;
  onClick?: (card: Card3D) => void;
  isSelected?: boolean;
  isHovered?: boolean;
  onPointerOver?: () => void;
  onPointerOut?: () => void;
}

/**
 * Card3DObject - 3D representation of a showcase card in the universe
 */
export function Card3DObject({
  card,
  onClick,
  isSelected,
  isHovered: externalHover,
  onPointerOver,
  onPointerOut,
}: Card3DObjectProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [internalHover, setInternalHover] = useState(false);
  const orbitAngleRef = useRef(card.orbitOffset);

  const isHovered = externalHover ?? internalHover;

  // Animate orbit around galaxy center
  useFrame((state, delta) => {
    if (!groupRef.current) return;

    // Orbit animation
    orbitAngleRef.current += delta * card.orbitSpeed;

    const orbitX = Math.cos(orbitAngleRef.current) * card.orbitRadius;
    const orbitZ = Math.sin(orbitAngleRef.current) * card.orbitRadius;
    const orbitY = Math.sin(orbitAngleRef.current * 0.5) * 1.5;

    groupRef.current.position.x = card.position.x + orbitX;
    groupRef.current.position.y = card.position.y + orbitY;
    groupRef.current.position.z = card.position.z + orbitZ;

    // Subtle floating animation
    const floatOffset = Math.sin(state.clock.getElapsedTime() * 1.5 + card.orbitOffset) * 0.1;
    groupRef.current.position.y += floatOffset;

    // Look slightly toward camera
    groupRef.current.rotation.y = -orbitAngleRef.current * 0.3;

    // Scale animation on hover
    const targetScale = isHovered || isSelected ? card.scale * 1.15 : card.scale;
    groupRef.current.scale.lerp(
      new THREE.Vector3(targetScale, targetScale, targetScale),
      0.1
    );
  });

  const handleClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      onClick?.(card);
    },
    [onClick, card]
  );

  const handlePointerOver = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      setInternalHover(true);
      onPointerOver?.();
      document.body.style.cursor = "pointer";
    },
    [onPointerOver]
  );

  const handlePointerOut = useCallback(() => {
    setInternalHover(false);
    onPointerOut?.();
    document.body.style.cursor = "auto";
  }, [onPointerOut]);

  return (
    <group
      ref={groupRef}
      onClick={handleClick}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
      data-testid={`card-3d-${card.id}`}
    >
      {/* Card background */}
      <RoundedBox args={[3, 2, 0.1]} radius={0.1} smoothness={4}>
        <meshStandardMaterial
          color={isHovered ? "#2a2f45" : "#1a1f35"}
          metalness={0.2}
          roughness={0.8}
          transparent
          opacity={0.95}
        />
      </RoundedBox>

      {/* Glow effect when hovered/selected */}
      {(isHovered || isSelected) && (
        <mesh position={[0, 0, -0.1]}>
          <planeGeometry args={[3.4, 2.4]} />
          <meshBasicMaterial
            color={card.color.primary}
            transparent
            opacity={0.3}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      )}

      {/* Category accent line at top */}
      <mesh position={[0, 0.85, 0.06]}>
        <planeGeometry args={[2.6, 0.04]} />
        <meshBasicMaterial
          color={card.color.primary}
          transparent
          opacity={0.8}
        />
      </mesh>

      {/* Title text */}
      <Text
        position={[0, 0.4, 0.06]}
        fontSize={0.18}
        color="white"
        anchorX="center"
        anchorY="middle"
        maxWidth={2.5}
        textAlign="center"
        font="/fonts/Inter-Bold.woff"
      >
        {card.title}
      </Text>

      {/* Category badge */}
      <group position={[-1.1, 0.65, 0.06]}>
        <mesh>
          <planeGeometry args={[0.6, 0.2]} />
          <meshBasicMaterial
            color={card.color.primary}
            transparent
            opacity={0.3}
          />
        </mesh>
        <Text
          position={[0, 0, 0.01]}
          fontSize={0.08}
          color={card.color.accent || card.color.primary}
          anchorX="center"
          anchorY="middle"
        >
          {card.category}
        </Text>
      </group>

      {/* Hierarchy/size text */}
      <Text
        position={[0, 0, 0.06]}
        fontSize={0.12}
        color={card.color.primary}
        anchorX="center"
        anchorY="middle"
      >
        {card.hierarchy}
      </Text>

      {/* Author text */}
      <Text
        position={[0, -0.5, 0.06]}
        fontSize={0.1}
        color="#8b92a5"
        anchorX="center"
        anchorY="middle"
      >
        {card.author}
      </Text>

      {/* Comment/description */}
      <Text
        position={[0, -0.75, 0.06]}
        fontSize={0.08}
        color="#6b7280"
        anchorX="center"
        anchorY="middle"
        maxWidth={2.5}
      >
        {card.comment}
      </Text>

      {/* Interactive indicator */}
      {isHovered && (
        <Text
          position={[0, -0.9, 0.06]}
          fontSize={0.08}
          color={card.color.primary}
          anchorX="center"
          anchorY="middle"
        >
          Click to start
        </Text>
      )}

      {/* Edge glow */}
      <lineSegments>
        <edgesGeometry
          attach="geometry"
          args={[new THREE.BoxGeometry(3.02, 2.02, 0.12)]}
        />
        <lineBasicMaterial
          color={isHovered || isSelected ? card.color.primary : "#3b4261"}
          transparent
          opacity={isHovered || isSelected ? 0.8 : 0.3}
        />
      </lineSegments>
    </group>
  );
}
