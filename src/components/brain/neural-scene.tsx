"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Line, OrbitControls, Stars } from "@react-three/drei";
import * as THREE from "three";

import { getAgentPosition } from "@/lib/neural/signals";
import type { AgentNode, NeuralSignal, ZoomLevel } from "@/types/core";

function NeuralShell() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (!meshRef.current) return;
    meshRef.current.rotation.y = Math.sin(t * 0.12) * 0.12;
    meshRef.current.rotation.x = Math.cos(t * 0.08) * 0.05;
    meshRef.current.scale.setScalar(1 + Math.sin(t * 0.9) * 0.02);
  });

  return (
    <group>
      <mesh ref={meshRef}>
        <sphereGeometry args={[2.2, 64, 64]} />
        <meshStandardMaterial
          color="#ff5cb7"
          transparent
          opacity={0.08}
          emissive="#ff3892"
          emissiveIntensity={0.85}
          wireframe
        />
      </mesh>
      <mesh scale={[1.7, 1.15, 1.55]}>
        <sphereGeometry args={[1.5, 64, 64]} />
        <meshStandardMaterial color="#ff99de" transparent opacity={0.06} emissive="#ff84c9" />
      </mesh>
    </group>
  );
}

function AgentStar({
  agent,
  active,
  zoom,
  onSelect,
}: {
  agent: AgentNode;
  active: boolean;
  zoom: ZoomLevel;
  onSelect: (agentId: string) => void;
}) {
  const ref = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime + agent.load * 6;
    if (!ref.current) return;
    ref.current.scale.setScalar(active ? 1.5 + Math.sin(t * 2.8) * 0.15 : 1 + Math.sin(t * 1.5) * 0.08);
  });

  const size = zoom === "far" ? 0.06 : zoom === "mid" ? 0.085 : 0.12;

  return (
    <Float speed={1.6} rotationIntensity={0.12} floatIntensity={0.35}>
      <mesh ref={ref} position={agent.position} onClick={() => onSelect(agent.id)}>
        <sphereGeometry args={[size, 22, 22]} />
        <meshStandardMaterial
          color={agent.color}
          emissive={agent.color}
          emissiveIntensity={active ? 3 : 1.7}
          toneMapped={false}
        />
      </mesh>
    </Float>
  );
}

function SignalPaths({ signals }: { signals: NeuralSignal[] }) {
  return (
    <>
      {signals.map((signal) => {
        const start = getAgentPosition(signal.from);
        const end = getAgentPosition(signal.to);
        const mid: [number, number, number] = [
          (start[0] + end[0]) / 2,
          (start[1] + end[1]) / 2 + 0.2,
          (start[2] + end[2]) / 2,
        ];

        return (
          <Line
            key={signal.id}
            points={[start, mid, end]}
            color="#ff8ed8"
            lineWidth={signal.intensity * 1.2}
            transparent
            opacity={0.16 + signal.intensity * 0.28}
          />
        );
      })}
    </>
  );
}

function RegionClouds() {
  const clouds = useMemo(
    () => [
      { position: [0, 1.1, -0.35] as [number, number, number], scale: [2.4, 1, 1.5] as [number, number, number] },
      { position: [1.2, -0.05, 0.15] as [number, number, number], scale: [1.4, 1.1, 1.35] as [number, number, number] },
      { position: [-1.1, -0.15, 0.05] as [number, number, number], scale: [1.55, 1.2, 1.25] as [number, number, number] },
      { position: [0.05, -1.0, 0.15] as [number, number, number], scale: [1.8, 0.8, 1.2] as [number, number, number] },
    ],
    [],
  );

  return (
    <>
      {clouds.map((cloud, index) => (
        <mesh key={index} position={cloud.position} scale={cloud.scale}>
          <sphereGeometry args={[0.8, 32, 32]} />
          <meshStandardMaterial color="#ff57ae" transparent opacity={0.06} emissive="#ff57ae" />
        </mesh>
      ))}
    </>
  );
}

export function NeuralScene({
  agents,
  signals,
  activeAgentId,
  zoom,
  onSelect,
}: {
  agents: AgentNode[];
  signals: NeuralSignal[];
  activeAgentId: string;
  zoom: ZoomLevel;
  onSelect: (agentId: string) => void;
}) {
  const cameraPosition: [number, number, number] =
    zoom === "far" ? [0, 0.2, 6.3] : zoom === "mid" ? [0.1, 0.1, 4.8] : [0.15, 0.1, 3.1];

  return (
    <Canvas camera={{ position: cameraPosition, fov: 38 }} dpr={[1, 2]}>
      <color attach="background" args={["#040106"]} />
      <ambientLight intensity={0.8} color="#ffacd9" />
      <pointLight position={[0, 0, 2]} intensity={28} color="#ff4ba1" />
      <pointLight position={[2, -1, 1]} intensity={18} color="#ffb4eb" />
      <Stars radius={80} depth={30} count={2200} factor={4} saturation={0} fade speed={0.7} />
      <NeuralShell />
      <RegionClouds />
      <SignalPaths signals={signals} />
      {agents.map((agent) => (
        <AgentStar
          key={agent.id}
          agent={agent}
          active={activeAgentId === agent.id}
          zoom={zoom}
          onSelect={onSelect}
        />
      ))}
      <OrbitControls enablePan={false} enableZoom={false} autoRotate autoRotateSpeed={0.18} />
    </Canvas>
  );
}
