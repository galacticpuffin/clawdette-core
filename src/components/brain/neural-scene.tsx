"use client";

import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Line, OrbitControls, Stars } from "@react-three/drei";
import { EffectComposer, Bloom, ChromaticAberration, Noise } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import * as THREE from "three";

import { getAgentPosition } from "@/lib/neural/signals";
import type { AgentNode, NeuralSignal, ZoomLevel } from "@/types/core";

// ── Region light anchor points (brain anatomy) ────────────────────────────────

const REGION_ANCHORS: Record<string, [number, number, number]> = {
  executive:   [0,     1.02,  0.28],  // Frontal lobe
  strategy:    [0.42,  0.62, -0.48],  // Prefrontal
  engineering: [1.08,  0.28,  0.22],  // Parietal right
  creative:    [1.18, -0.38, -0.28],  // Temporal right
  memory:      [-0.84, 0.42,  0.62],  // Hippocampal
  dispatch:    [0.08,  0.02,  1.08],  // Anterior brainstem
  operations:  [-1.1, -0.2,   0.08],  // Left hemisphere
  security:    [0.3,  -1.02,  0.08],  // Limbic/amygdala
  monitor:     [-0.18,-1.12,  0.72],  // Cerebellum
  life:        [-1.22, 0.52,  0.08],  // Left anterior
};

// ── Deterministic hash for stable jitter ─────────────────────────────────────

function hashFloat(id: string, slot: number): number {
  let h = (slot + 1) * 2654435761;
  for (let i = 0; i < id.length; i++) {
    h = Math.imul(h ^ id.charCodeAt(i), 2246822519);
    h ^= h >>> 13;
  }
  return (h >>> 0) / 0xffffffff;
}

// ── Procedural brain geometry (gyral ridges + interhemispheric fissure) ───────

function buildBrainGeo(segments: number): THREE.BufferGeometry {
  const geo = new THREE.SphereGeometry(1, segments, Math.ceil(segments * 0.75));
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const f = 3.75;
    const gyri =
      Math.sin(x * f + 0.7) * Math.cos(y * f * 1.1) * Math.sin(z * f * 0.85) * 0.055 +
      Math.sin(x * f * 2.2 + 1.4) * Math.sin(y * f * 1.9 + 0.9) * 0.024 +
      Math.cos(z * f * 2.5 + 0.3) * Math.sin(x * f + y * 0.6) * 0.018;
    const fissure = Math.abs(x) < 0.16 && y > 0.08 ? -Math.max(0, y) * 0.042 : 0;
    const disp = 1 + gyri + fissure;
    pos.setXYZ(i, x * disp, y * disp, z * disp);
  }
  geo.computeVertexNormals();
  return geo;
}

// ── Zoom watcher: derives discrete level from live camera distance ─────────────

function ZoomWatcher({
  onZoomChange,
}: {
  onZoomChange: (level: ZoomLevel) => void;
}) {
  const { camera } = useThree();
  const last = useRef<ZoomLevel>("far");

  useFrame(() => {
    const d = camera.position.length();
    const level: ZoomLevel = d < 3.4 ? "close" : d < 5.6 ? "mid" : "far";
    if (level !== last.current) {
      last.current = level;
      onZoomChange(level);
    }
  });

  return null;
}

// ── Brain envelope ────────────────────────────────────────────────────────────

function BrainEnvelope({ pulseColor, accentColor }: { pulseColor: string; accentColor: string }) {
  const outerRef = useRef<THREE.Mesh>(null);
  const cortexRef = useRef<THREE.Mesh>(null);

  const outerGeo = useMemo(() => buildBrainGeo(72), []);
  const cortexGeo = useMemo(() => buildBrainGeo(52), []);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (outerRef.current) outerRef.current.scale.setScalar(1 + Math.sin(t * 0.27) * 0.013);
    if (cortexRef.current) cortexRef.current.scale.setScalar(1 + Math.sin(t * 0.27 + 0.5) * 0.007);
  });

  return (
    <group>
      {/* Outer membrane */}
      <mesh ref={outerRef} scale={[2.8, 1.85, 2.24]} geometry={outerGeo}>
        <meshStandardMaterial color={pulseColor} transparent opacity={0.028} emissive={pulseColor} emissiveIntensity={1.8} side={THREE.FrontSide} depthWrite={false} />
      </mesh>
      {/* Cortex surface */}
      <mesh ref={cortexRef} scale={[2.52, 1.67, 2.02]} geometry={cortexGeo}>
        <meshStandardMaterial color="#200018" transparent opacity={0.07} emissive={accentColor} emissiveIntensity={0.6} side={THREE.FrontSide} depthWrite={false} />
      </mesh>
      {/* White matter glow */}
      <mesh scale={[2.08, 1.38, 1.7]}>
        <sphereGeometry args={[1, 20, 20]} />
        <meshStandardMaterial color={pulseColor} transparent opacity={0.018} emissive={pulseColor} emissiveIntensity={2.6} depthWrite={false} />
      </mesh>
      {/* Thalamic core */}
      <mesh scale={[0.85, 0.56, 0.7]}>
        <sphereGeometry args={[1, 12, 12]} />
        <meshStandardMaterial color="#ff58a8" transparent opacity={0.016} emissive="#ff58a8" emissiveIntensity={3.5} depthWrite={false} />
      </mesh>
    </group>
  );
}

// ── Region activity lights ────────────────────────────────────────────────────

function RegionGlow({ agents }: { agents: AgentNode[] }) {
  const regions = useMemo(() => {
    const acc = new Map<string, { color: string; signal: number; n: number }>();
    for (const a of agents) {
      const r = acc.get(a.region);
      r ? (r.signal += a.signal, r.n++) : acc.set(a.region, { color: a.color, signal: a.signal, n: 1 });
    }
    return Array.from(acc.entries()).map(([region, d]) => ({
      region,
      pos: REGION_ANCHORS[region] ?? ([0, 0, 0] as [number, number, number]),
      color: d.color,
      signal: d.signal / d.n,
    }));
  }, [agents]);

  return (
    <>
      {regions.map(({ region, pos, color, signal }) => (
        <RegionLight key={region} position={pos} color={color} signal={signal} />
      ))}
    </>
  );
}

function RegionLight({ position, color, signal }: { position: [number, number, number]; color: string; signal: number }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const lightRef = useRef<THREE.PointLight>(null);

  useFrame(({ clock }) => {
    const pulse = signal * (0.82 + Math.sin(clock.elapsedTime * 0.78 + position[0] * 3.1) * 0.18);
    if (meshRef.current) {
      meshRef.current.scale.setScalar(0.09 + pulse * 0.24);
      const mat = meshRef.current.material as THREE.MeshStandardMaterial;
      mat.opacity = 0.04 + pulse * 0.13;
      mat.emissiveIntensity = pulse * 2.8;
    }
    if (lightRef.current) lightRef.current.intensity = pulse * 6;
  });

  return (
    <group position={position}>
      <pointLight ref={lightRef} color={color} intensity={signal * 5} distance={1.7} decay={2} />
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.24, 10, 10]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={signal * 2.5} transparent opacity={0.07} depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  );
}

// ── Neural pathways: tubes for strong signals, lines for weak ─────────────────

function NeuralPathways({ signals }: { signals: NeuralSignal[] }) {
  return (
    <>
      {signals.map((signal) => <NeuralPathway key={signal.id} signal={signal} />)}
    </>
  );
}

function NeuralPathway({ signal }: { signal: NeuralSignal }) {
  const meshRef = useRef<THREE.Mesh>(null);

  const data = useMemo(() => {
    const startArr = getAgentPosition(signal.from) as [number, number, number];
    const endArr = getAgentPosition(signal.to) as [number, number, number];
    const start = new THREE.Vector3(...startArr);
    const end = new THREE.Vector3(...endArr);
    const jx = (hashFloat(signal.id, 0) - 0.5) * 0.3;
    const jy = hashFloat(signal.id, 1) * 0.24 + 0.1;
    const jz = (hashFloat(signal.id, 2) - 0.5) * 0.22;
    const mid = new THREE.Vector3(
      (start.x + end.x) / 2 + jx,
      (start.y + end.y) / 2 + jy + signal.intensity * 0.14,
      (start.z + end.z) / 2 + jz,
    );
    const curve = new THREE.CatmullRomCurve3([start, mid, end]);
    const midArr: [number, number, number] = [mid.x, mid.y, mid.z];
    const tubeGeo = signal.intensity > 0.5
      ? new THREE.TubeGeometry(curve, 24, 0.004 + signal.weight * 0.007, 5, false)
      : null;
    return { tubeGeo, linePoints: [startArr, midArr, endArr] };
  }, [signal]);

  // Dispose TubeGeometry on unmount or signal change to prevent GPU memory leak
  useEffect(() => {
    return () => { data.tubeGeo?.dispose(); };
  }, [data.tubeGeo]);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const mat = meshRef.current.material as THREE.MeshStandardMaterial;
    mat.opacity = (0.055 + signal.intensity * 0.14) * (0.65 + Math.sin(clock.elapsedTime * 0.5 + signal.weight * 5) * 0.35);
  });

  if (!data.tubeGeo) {
    return (
      <Line points={data.linePoints} color="#ff88cc" lineWidth={0.14 + signal.weight * 0.14} transparent opacity={0.024 + signal.intensity * 0.055} />
    );
  }

  return (
    <mesh ref={meshRef} geometry={data.tubeGeo}>
      <meshStandardMaterial color="#ffb0ea" emissive="#ff6cc8" emissiveIntensity={1.6 + signal.intensity * 2.4} transparent opacity={0.08 + signal.intensity * 0.14} depthWrite={false} toneMapped={false} />
    </mesh>
  );
}

// ── Synaptic glow at junctions ────────────────────────────────────────────────

function SynapticGlow({ signals }: { signals: NeuralSignal[] }) {
  const junctions = useMemo(() => {
    const acc: Record<string, number> = {};
    for (const s of signals) {
      acc[s.from] = (acc[s.from] ?? 0) + s.intensity;
      acc[s.to] = (acc[s.to] ?? 0) + s.intensity;
    }
    return Object.entries(acc).map(([id, total]) => ({
      id,
      pos: getAgentPosition(id) as [number, number, number],
      intensity: Math.min(1, total / 3),
    }));
  }, [signals]);

  return (
    <>
      {junctions.map(({ id, pos, intensity }) => (
        <SynapticNode key={id} position={pos} intensity={intensity} />
      ))}
    </>
  );
}

function SynapticNode({ position, intensity }: { position: [number, number, number]; intensity: number }) {
  const ref = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const pulse = intensity * (0.78 + Math.sin(clock.elapsedTime * 2.9 + intensity * 12) * 0.22);
    ref.current.scale.setScalar(0.03 + pulse * 0.065);
    const mat = ref.current.material as THREE.MeshStandardMaterial;
    mat.opacity = 0.28 + pulse * 0.55;
    mat.emissiveIntensity = pulse * 5.5;
  });

  return (
    <mesh ref={ref} position={position}>
      <sphereGeometry args={[1, 10, 10]} />
      <meshStandardMaterial color="#ffffff" emissive="#ffd8ff" emissiveIntensity={intensity * 4.5} transparent opacity={0.35} depthWrite={false} toneMapped={false} />
    </mesh>
  );
}

// ── Traveling signal pulses with trail ────────────────────────────────────────

const TRAIL = 7;

function SignalParticles({ signals }: { signals: NeuralSignal[] }) {
  return (
    <>
      {signals.map((signal, i) => (
        <TravelingPulse key={signal.id} signal={signal} offset={i * 0.22} />
      ))}
    </>
  );
}

function TravelingPulse({ signal, offset }: { signal: NeuralSignal; offset: number }) {
  const trailRefs = useRef<(THREE.Mesh | null)[]>(Array.from({ length: TRAIL }, () => null));

  const curve = useMemo(() => {
    const start = new THREE.Vector3(...(getAgentPosition(signal.from) as [number, number, number]));
    const end = new THREE.Vector3(...(getAgentPosition(signal.to) as [number, number, number]));
    const mid = new THREE.Vector3(
      (start.x + end.x) / 2,
      (start.y + end.y) / 2 + 0.14 + signal.intensity * 0.18,
      (start.z + end.z) / 2,
    );
    return new THREE.CatmullRomCurve3([start, mid, end]);
  }, [signal]);

  useFrame(({ clock }) => {
    const speed = 0.088 + signal.intensity * 0.1;
    const t = (clock.elapsedTime * speed + offset) % 1;
    trailRefs.current.forEach((ref, i) => {
      if (!ref) return;
      ref.position.copy(curve.getPoint(Math.max(0, t - i * 0.021)));
      const fade = Math.pow(1 - i / TRAIL, 1.5);
      ref.scale.setScalar((0.017 + signal.intensity * 0.015) * fade);
      const mat = ref.material as THREE.MeshStandardMaterial;
      mat.opacity = fade * (0.52 + signal.intensity * 0.38);
      mat.emissiveIntensity = i === 0 ? 5.5 : fade * 2.8;
    });
  });

  return (
    <>
      {Array.from({ length: TRAIL }, (_, i) => (
        <mesh key={i} ref={(el) => { trailRefs.current[i] = el; }}>
          <sphereGeometry args={[1, 6, 6]} />
          <meshStandardMaterial
            color={i === 0 ? "#fff8ff" : "#ffb4ec"}
            emissive={i === 0 ? "#ffffff" : "#ff78d4"}
            emissiveIntensity={i === 0 ? 5.5 : 2.8}
            transparent opacity={0.7} depthWrite={false} toneMapped={false}
          />
        </mesh>
      ))}
    </>
  );
}

// ── Agent node: core + volumetric halo ────────────────────────────────────────

function AgentNodeMesh({
  agent, active, cameraZ, onSelect,
}: {
  agent: AgentNode;
  active: boolean;
  cameraZ: number;
  onSelect: (id: string) => void;
}) {
  const coreRef = useRef<THREE.Mesh>(null);
  const haloRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime + agent.load * 7;
    const pulse = active ? 1.12 + Math.sin(t * 1.85) * 0.1 : 0.9 + Math.sin(t * 0.62 + agent.signal * 3) * 0.04;
    if (coreRef.current) coreRef.current.scale.setScalar(pulse);
    if (haloRef.current) {
      haloRef.current.scale.setScalar(pulse * 1.9);
      const mat = haloRef.current.material as THREE.MeshStandardMaterial;
      mat.opacity = active ? 0.26 + Math.sin(t * 1.85) * 0.06 : 0.055 + agent.signal * 0.09;
      mat.emissiveIntensity = active ? 3.2 : 1.2 + agent.signal * 0.8;
    }
  });

  const base = cameraZ > 5.5 ? 0.02 : cameraZ > 3.8 ? 0.03 : 0.042;
  const coreSize = base + agent.signal * 0.01;

  return (
    <group position={agent.position} onClick={() => onSelect(agent.id)}>
      <mesh ref={haloRef}>
        <sphereGeometry args={[coreSize * 1.85, 10, 10]} />
        <meshStandardMaterial color={agent.color} emissive={agent.color} emissiveIntensity={active ? 3 : 1.4} transparent opacity={active ? 0.24 : 0.06} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh ref={coreRef}>
        <sphereGeometry args={[coreSize, 16, 16]} />
        <meshStandardMaterial color={active ? "#ffffff" : agent.color} emissive={agent.color} emissiveIntensity={active ? 4.5 : 1.4 + agent.signal * 0.9} toneMapped={false} />
      </mesh>
      {active && <pointLight color={agent.color} intensity={12} distance={1.6} decay={2} />}
    </group>
  );
}

// NodeLabels intentionally removed — labels are rendered as HTML overlay in neural-core-app
// to keep the Three.js scene pure GPU with no Html reconciler overhead.

// ── Post-processing stack ─────────────────────────────────────────────────────

// Stable Vector2 instance — created once, never recreated on render
const CHROMA_OFFSET = new THREE.Vector2(0.0006, 0.0006);

function PostFX() {
  return (
    <EffectComposer>
      <Bloom
        intensity={0.85}
        luminanceThreshold={0.18}
        luminanceSmoothing={0.4}
        mipmapBlur
      />
      <ChromaticAberration
        blendFunction={BlendFunction.NORMAL}
        offset={CHROMA_OFFSET}
        radialModulation={false}
        modulationOffset={0}
      />
      <Noise
        blendFunction={BlendFunction.OVERLAY}
        opacity={0.028}
      />
    </EffectComposer>
  );
}

// ── Camera distance tracker for continuous zoom ──────────────────────────────

function CameraDistanceTracker({
  onDistance,
}: {
  onDistance: (d: number) => void;
}) {
  const { camera } = useThree();
  const lastD = useRef(-1);

  useFrame(() => {
    const d = camera.position.length();
    if (Math.abs(d - lastD.current) > 0.05) {
      lastD.current = d;
      onDistance(d);
    }
  });

  return null;
}

// ── Scene root ────────────────────────────────────────────────────────────────

export function NeuralScene({
  agents,
  signals,
  activeAgentId,
  zoom,
  systemMode,
  onSelect,
  onZoomChange,
  onCameraDistance,
}: {
  agents: AgentNode[];
  signals: NeuralSignal[];
  activeAgentId: string;
  zoom: ZoomLevel;
  systemMode: "CALM" | "ACTIVE" | "ALERT" | "FOCUS" | "EMERGENCY";
  onSelect: (agentId: string) => void;
  onZoomChange?: (level: ZoomLevel) => void;
  onCameraDistance?: (d: number) => void;
}) {
  const startZ = zoom === "far" ? 6.5 : zoom === "mid" ? 5.0 : 3.2;

  const palette =
    systemMode === "EMERGENCY" ? { ambient: "#ff9ccf", pulse: "#ff2f78", accent: "#ff7ca7" } :
    systemMode === "ALERT"     ? { ambient: "#ffacd9", pulse: "#ff4699", accent: "#ff97d9" } :
    systemMode === "FOCUS"     ? { ambient: "#ffc4ea", pulse: "#ff69bb", accent: "#ffb3e8" } :
    systemMode === "ACTIVE"    ? { ambient: "#ffbadf", pulse: "#ff5bb0", accent: "#ffb3df" } :
                                 { ambient: "#f9c9ec", pulse: "#d45f9e", accent: "#f0b8dc" };

  // Local camera z for node sizing (passed via onCameraDistance)
  const cameraZ = useRef(startZ);
  const handleDistance = (d: number) => {
    cameraZ.current = d;
    onCameraDistance?.(d);
  };

  return (
    <Canvas
      camera={{ position: [0, 0.2, startZ], fov: 38 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: false }}
    >
      <color attach="background" args={["#030008"]} />
      <ambientLight intensity={0.58} color={palette.ambient} />
      <pointLight position={[0, 2, 2.5]} intensity={24} color={palette.pulse} />
      <pointLight position={[2.6, -1, 1.5]} intensity={13} color={palette.accent} />
      <pointLight position={[-2.5, 0.5, -0.5]} intensity={8} color="#ff68b4" />
      <fog attach="fog" args={["#030008", 6, 14]} />

      <Stars radius={90} depth={44} count={1800} factor={3} saturation={0} fade speed={0.18} />

      <BrainEnvelope pulseColor={palette.pulse} accentColor={palette.accent} />
      <RegionGlow agents={agents} />
      <NeuralPathways signals={signals} />
      <SynapticGlow signals={signals} />
      <SignalParticles signals={signals} />

      {agents.map((agent) => (
        <AgentNodeMesh
          key={agent.id}
          agent={agent}
          active={activeAgentId === agent.id}
          cameraZ={cameraZ.current}
          onSelect={onSelect}
        />
      ))}

      <ZoomWatcher onZoomChange={onZoomChange ?? (() => {})} />
      <CameraDistanceTracker onDistance={handleDistance} />

      <OrbitControls
        enablePan={false}
        enableZoom
        autoRotate
        autoRotateSpeed={0.06}
        minDistance={2.2}
        maxDistance={9}
        zoomSpeed={0.7}
        dampingFactor={0.06}
        enableDamping
      />

      <PostFX />
    </Canvas>
  );
}
