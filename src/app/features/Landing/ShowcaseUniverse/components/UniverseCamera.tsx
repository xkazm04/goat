"use client";

import { useRef, useEffect } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import { PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";
import type { Vector3 } from "../types";

interface UniverseCameraProps {
  position: Vector3;
  target: Vector3;
  fov?: number;
}

/**
 * UniverseCamera - Controlled camera for the 3D universe
 */
export function UniverseCamera({
  position,
  target,
  fov = 60
}: UniverseCameraProps) {
  const cameraRef = useRef<THREE.PerspectiveCamera>(null);
  const targetVector = useRef(new THREE.Vector3(target.x, target.y, target.z));
  const positionVector = useRef(new THREE.Vector3(position.x, position.y, position.z));

  // Update target vectors when props change
  useEffect(() => {
    targetVector.current.set(target.x, target.y, target.z);
    positionVector.current.set(position.x, position.y, position.z);
  }, [target, position]);

  // Smoothly interpolate camera position and look-at
  useFrame(() => {
    if (!cameraRef.current) return;

    // Smooth position interpolation
    cameraRef.current.position.lerp(positionVector.current, 0.08);

    // Create a temporary target for look-at calculation
    const currentTarget = new THREE.Vector3();
    cameraRef.current.getWorldDirection(currentTarget);
    currentTarget.multiplyScalar(10).add(cameraRef.current.position);

    // Smooth look-at interpolation
    currentTarget.lerp(targetVector.current, 0.08);
    cameraRef.current.lookAt(currentTarget);
  });

  return (
    <PerspectiveCamera
      ref={cameraRef}
      makeDefault
      fov={fov}
      near={0.1}
      far={200}
      position={[position.x, position.y, position.z]}
    />
  );
}
