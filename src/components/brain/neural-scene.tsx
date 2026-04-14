"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Line, OrbitControls, Sparkles, Stars } from "@react-three/drei";
import * as THREE from "three";

import { getAgentPosition } from "@/lib/neural/signals";
import type { AgentNode, NeuralSignal, ZoomLevel } from "@/types/core";

function NeuralShell() {
  const glowRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (!glowRef.current) return;
    glowRef.current.scale.setScalar(1 + Math.sin(t * 0.35) * 0.025);
  });

  return (
    <group>
      <mesh ref={glowRef} scale={[2.6, 1.7, 2.2]}>
        <sphereGeometry args={[1.2, 32, 32]} />
        <meshStandardMaterial color="#ff8bd2" transparent opacity={0.035} emissive="#ff73c8" emissiveIntensity={1.6} />
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
    ref.current.scale.setScalar(active ? 1.18 + Math.sin(t * 1.5) * 0.08 : 0.92 + Math.sin(t * 0.8) * 0.04);
  });

  const base = zoom === "far" ? 0.013 : zoom === "mid" ? 0.018 : 0.028;
  const size = base + agent.signal * 0.01 + Math.abs(agent.position[2]) * 0.002;

  return (
    <Float speed={0.6} rotationIntensity={0.04} floatIntensity={0.12}>
      <mesh ref={ref} position={agent.position} onClick={() => onSelect(agent.id)}>
        <sphereGeometry args={[size, 22, 22]} />
        <meshStandardMaterial
          color={agent.color}
          emissive={agent.color}
          emissiveIntensity={active ? 2 : 0.95}
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
            color="#ffaddf"
            lineWidth={0.18 + signal.weight * 0.22}
            transparent
            opacity={Math.max(0.015, 0.03 + signal.intensity * 0.08 - signal.decay * 0.04)}
          />
        );
      })}
    </>
  );
}

function SignalParticles({ signals }: { signals: NeuralSignal[] }) {
  return (
    <>
      {signals.map((signal, index) => (
        <TravelingPulse key={signal.id} signal={signal} offset={index * 0.2} />
      ))}
    </>
  );
}

function TravelingPulse({ signal, offset }: { signal: NeuralSignal; offset: number }) {
  const ref = useRef<THREE.Mesh>(null);
  const curve = useMemo(() => {
    const start = new THREE.Vector3(...getAgentPosition(signal.from));
    const end = new THREE.Vector3(...getAgentPosition(signal.to));
    const mid = new THREE.Vector3(
      (start.x + end.x) / 2,
      (start.y + end.y) / 2 + 0.22 + signal.intensity * 0.12,
      (start.z + end.z) / 2,
    );

    return new THREE.CatmullRomCurve3([start, mid, end]);
  }, [signal]);

  useFrame((state) => {
    if (!ref.current) return;
    const t = (state.clock.elapsedTime * (0.08 + signal.intensity * 0.08) + offset) % 1;
    const point = curve.getPoint(t);
    ref.current.position.copy(point);
    ref.current.scale.setScalar(0.55 + signal.intensity * 0.75);
  });

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.03, 16, 16]} />
      <meshStandardMaterial color="#ffc0eb" emissive="#ff8ed8" emissiveIntensity={2.8} toneMapped={false} />
    </mesh>
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
          <meshStandardMaterial color="#ff57ae" transparent opacity={0.018} emissive="#ff57ae" />
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
  systemMode,
  onSelect,
}: {
  agents: AgentNode[];
  signals: NeuralSignal[];
  activeAgentId: string;
  zoom: ZoomLevel;
  systemMode: "CALM" | "ACTIVE" | "ALERT" | "FOCUS" | "EMERGENCY";
  onSelect: (agentId: string) => void;
}) {
  const cameraPosition: [number, number, number] =
    zoom === "far" ? [0, 0.2, 6.3] : zoom === "mid" ? [0.1, 0.1, 4.8] : [0.15, 0.1, 3.1];
  const palette =
    systemMode === "EMERGENCY"
      ? { ambient: "#ff9ccf", pulse: "#ff2f78", accent: "#ff7ca7" }
      : systemMode === "ALERT"
        ? { ambient: "#ffacd9", pulse: "#ff4699", accent: "#ff97d9" }
        : systemMode === "FOCUS"
          ? { ambient: "#ffc4ea", pulse: "#ff69bb", accent: "#ffb3e8" }
          : systemMode === "ACTIVE"
            ? { ambient: "#ffbadf", pulse: "#ff5bb0", accent: "#ffb3df" }
            : { ambient: "#f9c9ec", pulse: "#d45f9e", accent: "#f0b8dc" };

  return (
    <Canvas camera={{ position: cameraPosition, fov: 38 }} dpr={[1, 2]}>
      <color attach="background" args={["#040106"]} />
      <ambientLight intensity={0.8} color={palette.ambient} />
      <pointLight position={[0, 0, 2]} intensity={16} color={palette.pulse} />
      <pointLight position={[2, -1, 1]} intensity={9} color={palette.accent} />
      <fog attach="fog" args={["#050208", 4.8, 12]} />
      <Stars radius={90} depth={42} count={3000} factor={3.2} saturation={0} fade speed={0.28} />
      <Sparkles count={80} scale={[7, 5, 6]} size={1.4} speed={0.08} color="#ff92db" opacity={0.55} />
      <NeuralShell />
      <RegionClouds />
      <SignalPaths signals={signals} />
      <SignalParticles signals={signals} />
      {agents.map((agent) => (
        <AgentStar
          key={agent.id}
          agent={agent}
          active={activeAgentId === agent.id}
          zoom={zoom}
          onSelect={onSelect}
        />
      ))}
      <OrbitControls enablePan={false} enableZoom={false} autoRotate autoRotateSpeed={zoom === "close" ? 0.04 : 0.07} />
    </Canvas>
  );
}
