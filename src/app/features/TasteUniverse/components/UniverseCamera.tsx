"use client";

import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";
import type { Vector3 } from "../types";

interface UniverseCameraProps {
  position: Vector3;
  target: Vector3;
  fov?: number;
}

const LERP_FACTOR = 0.08;

/**
 * UniverseCamera - Smooth interpolating camera for universe navigation
 */
export function UniverseCamera({
  position,
  target,
  fov = 60,
}: UniverseCameraProps) {
  const cameraRef = useRef<THREE.PerspectiveCamera>(null);
  const { set } = useThree();

  // Set as default camera
  useFrame(() => {
    if (!cameraRef.current) return;

    // Smooth position interpolation
    cameraRef.current.position.lerp(
      new THREE.Vector3(position.x, position.y, position.z),
      LERP_FACTOR
    );

    // Smooth look-at interpolation
    const currentTarget = new THREE.Vector3();
    cameraRef.current.getWorldDirection(currentTarget);
    currentTarget.multiplyScalar(10).add(cameraRef.current.position);

    const targetVec = new THREE.Vector3(target.x, target.y, target.z);
    currentTarget.lerp(targetVec, LERP_FACTOR);
    cameraRef.current.lookAt(currentTarget);
  });

  return (
    <PerspectiveCamera
      ref={cameraRef}
      makeDefault
      fov={fov}
      near={0.1}
      far={300}
      position={[position.x, position.y, position.z]}
      data-testid="universe-camera"
    />
  );
}
