'use client';

import { useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { MeshDistortMaterial, Sphere, Environment } from '@react-three/drei';
import * as THREE from 'three';

function AnimatedOrb() {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHover] = useState(false);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = state.clock.elapsedTime * 0.2;
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.3;
      
      // Gentle mouse parallax
      const targetX = (state.mouse.x * 0.5);
      const targetY = (state.mouse.y * 0.5);
      meshRef.current.position.x += (targetX - meshRef.current.position.x) * 0.05;
      meshRef.current.position.y += (targetY - meshRef.current.position.y) * 0.05;
    }
  });

  return (
    <Sphere 
      ref={meshRef} 
      args={[1, 64, 64]} 
      scale={hovered ? 1.5 : 1.3}
      onPointerOver={() => setHover(true)}
      onPointerOut={() => setHover(false)}
    >
      <MeshDistortMaterial
        color={hovered ? "#22d3ee" : "#7c3aed"}
        envMapIntensity={1}
        clearcoat={1}
        clearcoatRoughness={0.1}
        metalness={0.8}
        roughness={0.2}
        distort={0.4}
        speed={2}
      />
    </Sphere>
  );
}

export default function Hero3D() {

  return (
    <div className="absolute inset-0 z-0 opacity-40 pointer-events-none md:pointer-events-auto flex items-center justify-center">
      <Canvas camera={{ position: [0, 0, 4], fov: 45 }} dpr={[1, 2]}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1.5} color="#7c3aed" />
        <directionalLight position={[-10, -10, -5]} intensity={1} color="#22d3ee" />
        <Environment preset="city" />
        <AnimatedOrb />
      </Canvas>
    </div>
  );
}
