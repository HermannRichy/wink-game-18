"use client";

import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { Edges, OrbitControls } from "@react-three/drei";
import { CuboidCollider, Physics, RigidBody, type RapierRigidBody } from "@react-three/rapier";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { sfx } from "@/lib/sound";
import { vibrate } from "@/lib/deck";

// Dimensions d'un bloc (unités arbitraires)
const L = 3;
const W = 1;
const H = 0.6;
const GAP = 0.02;
export const LAYERS = 18;
export const BLOCK_COUNT = LAYERS * 3;

type OrbitControlsImpl = React.ComponentRef<typeof OrbitControls>;

const DYNAMIC = 0;
const KINEMATIC_POSITION = 2;

interface BlockDef {
  index: number;
  layer: number;
  position: THREE.Vector3;
  /** Axe long du bloc, dans lequel on le pousse ou le tire */
  axis: THREE.Vector3;
  rotationY: number;
  tint: THREE.Color;
}

function buildBlocks(): BlockDef[] {
  const blocks: BlockDef[] = [];
  for (let layer = 0; layer < LAYERS; layer++) {
    const alongX = layer % 2 === 0;
    for (let slot = 0; slot < 3; slot++) {
      const offset = (slot - 1) * (W + GAP);
      const y = H / 2 + layer * H;
      const tint = new THREE.Color().setHSL(0.09 + (Math.random() - 0.5) * 0.02, 0.55, 0.78 + (Math.random() - 0.5) * 0.08);
      blocks.push({
        index: layer * 3 + slot,
        layer,
        position: alongX ? new THREE.Vector3(0, y, offset) : new THREE.Vector3(offset, y, 0),
        axis: alongX ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 0, 1),
        rotationY: alongX ? 0 : Math.PI / 2,
        tint,
      });
    }
  }
  return blocks;
}

/** Texture de bois générée par le code (aucune image à télécharger). */
function useWoodTexture() {
  return useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 128;
    const g = c.getContext("2d")!;
    g.fillStyle = "#F4D3A1";
    g.fillRect(0, 0, c.width, c.height);
    for (let i = 0; i < 46; i++) {
      const y0 = Math.random() * c.height;
      const amp = 2 + Math.random() * 6;
      const freq = 0.006 + Math.random() * 0.02;
      const phase = Math.random() * Math.PI * 2;
      g.strokeStyle = `rgba(${150 + Math.random() * 40}, ${95 + Math.random() * 30}, ${45 + Math.random() * 20}, ${0.12 + Math.random() * 0.25})`;
      g.lineWidth = 0.8 + Math.random() * 2.2;
      g.beginPath();
      for (let x = 0; x <= c.width; x += 8) {
        const y = y0 + Math.sin(x * freq + phase) * amp;
        if (x === 0) g.moveTo(x, y);
        else g.lineTo(x, y);
      }
      g.stroke();
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    return tex;
  }, []);
}

type DragState = {
  index: number;
  start: THREE.Vector3;
  axis: THREE.Vector3;
  pointer: { x: number; y: number };
  dir: { x: number; y: number };
  pxPerUnit: number;
  disp: number;
  lastCreak: number;
};

function Tower({
  disabled,
  onExtract,
  onCollapse,
  onBlocked,
  controls,
}: {
  disabled: boolean;
  onExtract: (index: number) => void;
  onCollapse: () => void;
  onBlocked: () => void;
  controls: React.RefObject<OrbitControlsImpl | null>;
}) {
  const blocks = useMemo(buildBlocks, []);
  const wood = useWoodTexture();
  const bodies = useRef<(RapierRigidBody | null)[]>([]);
  const [removed, setRemoved] = useState<Set<number>>(() => new Set());
  const [dragging, setDragging] = useState<number | null>(null);
  const drag = useRef<DragState | null>(null);
  const collapsed = useRef(false);
  const settled = useRef(false);
  const checkTimer = useRef(0);
  const { camera, size } = useThree();

  // Laisse la tour se poser avant de surveiller la chute
  useEffect(() => {
    const t = setTimeout(() => (settled.current = true), 1200);
    return () => clearTimeout(t);
  }, []);

  const topLayer = useMemo(() => {
    let top = 0;
    blocks.forEach((b) => {
      if (!removed.has(b.index)) top = Math.max(top, b.layer);
    });
    return top;
  }, [blocks, removed]);

  function toScreen(v: THREE.Vector3) {
    const p = v.clone().project(camera);
    return { x: ((p.x + 1) / 2) * size.width, y: ((1 - p.y) / 2) * size.height };
  }

  function onDown(e: ThreeEvent<PointerEvent>, b: BlockDef) {
    if (disabled || collapsed.current || drag.current) return;
    e.stopPropagation();
    if (b.layer === topLayer) {
      sfx.knock();
      onBlocked();
      return;
    }
    const body = bodies.current[b.index];
    if (!body) return;
    const t = body.translation();
    const start = new THREE.Vector3(t.x, t.y, t.z);
    const a = toScreen(start);
    const bScr = toScreen(start.clone().add(b.axis));
    let dx = bScr.x - a.x;
    let dy = bScr.y - a.y;
    let px = Math.hypot(dx, dy);
    if (px < 18) {
      // Axe presque face à la caméra : on utilise le glissement vertical
      dx = 0;
      dy = -1;
      px = 70;
    } else {
      dx /= px;
      dy /= px;
    }
    body.setBodyType(KINEMATIC_POSITION, true);
    drag.current = { index: b.index, start, axis: b.axis.clone(), pointer: { x: e.clientX, y: e.clientY }, dir: { x: dx, y: dy }, pxPerUnit: px, disp: 0, lastCreak: 0 };
    if (controls.current) controls.current.enabled = false;
    setDragging(b.index);
    sfx.knock();
    vibrate(12);
  }

  useEffect(() => {
    function move(e: PointerEvent) {
      const d = drag.current;
      if (!d) return;
      const body = bodies.current[d.index];
      if (!body) return;
      const along = ((e.clientX - d.pointer.x) * d.dir.x + (e.clientY - d.pointer.y) * d.dir.y) / d.pxPerUnit;
      d.disp = Math.max(-L * 1.15, Math.min(L * 1.15, along));
      const target = d.start.clone().addScaledVector(d.axis, d.disp);
      body.setNextKinematicTranslation(target);
      const now = performance.now();
      if (now - d.lastCreak > 200) {
        d.lastCreak = now;
        sfx.creak();
      }
    }
    function up() {
      const d = drag.current;
      if (!d) return;
      drag.current = null;
      setDragging(null);
      if (controls.current) controls.current.enabled = true;
      const body = bodies.current[d.index];
      if (Math.abs(d.disp) >= L * 0.82) {
        sfx.knock();
        vibrate([20, 40, 20]);
        setRemoved((r) => new Set(r).add(d.index));
        onExtract(d.index);
      } else if (body) {
        body.setBodyType(DYNAMIC, true);
      }
    }
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, [onExtract, controls]);

  // Détection de la chute : un bloc a perdu presque un étage de hauteur
  useFrame((_, delta) => {
    if (collapsed.current || !settled.current) return;
    checkTimer.current += delta;
    if (checkTimer.current < 0.2) return;
    checkTimer.current = 0;
    for (const b of blocks) {
      if (removed.has(b.index) || drag.current?.index === b.index) continue;
      const body = bodies.current[b.index];
      if (!body) continue;
      const t = body.translation();
      if (b.position.y - t.y > H * 0.85 || Math.abs(t.x) > 4.5 || Math.abs(t.z) > 4.5) {
        collapsed.current = true;
        if (controls.current) controls.current.enabled = true;
        sfx.crash();
        vibrate([120, 60, 200, 60, 300]);
        onCollapse();
        return;
      }
    }
  });

  return (
    <>
      {blocks.map((b) =>
        removed.has(b.index) ? null : (
          <RigidBody
            key={b.index}
            ref={(r) => {
              bodies.current[b.index] = r;
            }}
            position={b.position.toArray()}
            rotation={[0, b.rotationY, 0]}
            colliders="cuboid"
            friction={0.55}
            restitution={0}
            linearDamping={0.25}
            angularDamping={0.5}
          >
            <mesh castShadow receiveShadow onPointerDown={(e) => onDown(e, b)}>
              <boxGeometry args={[L, H - 0.01, W]} />
              <meshStandardMaterial
                map={wood}
                color={b.tint}
                roughness={0.7}
                emissive={dragging === b.index ? "#FF2E4D" : "#000000"}
                emissiveIntensity={dragging === b.index ? 0.35 : 0}
              />
              <Edges color="#141414" threshold={15} />
            </mesh>
          </RigidBody>
        ),
      )}

      <RigidBody type="fixed" colliders={false} position={[0, -0.25, 0]}>
        <CuboidCollider args={[30, 0.25, 30]} friction={0.9} />
        <mesh receiveShadow>
          <boxGeometry args={[60, 0.5, 60]} />
          <meshStandardMaterial color="#FFA3C7" roughness={1} />
        </mesh>
      </RigidBody>
    </>
  );
}

export default function TowerScene({
  resetKey,
  disabled,
  onExtract,
  onCollapse,
  onBlocked,
}: {
  resetKey: number;
  disabled: boolean;
  onExtract: (index: number) => void;
  onCollapse: () => void;
  onBlocked: () => void;
}) {
  const controls = useRef<OrbitControlsImpl | null>(null);

  return (
    <Canvas
      shadows
      dpr={[1, 1.6]}
      camera={{ position: [15, 13, 17], fov: 40 }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      style={{ touchAction: "none" }}
    >
      <color attach="background" args={["#1E0F1F"]} />
      <fog attach="fog" args={["#1E0F1F", 34, 60]} />
      <ambientLight intensity={0.75} />
      <hemisphereLight args={["#FFF3E6", "#FF2E4D", 0.45]} />
      <directionalLight
        position={[8, 18, 6]}
        intensity={1.6}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={14}
        shadow-camera-bottom={-4}
      />
      <Physics key={resetKey} gravity={[0, -9.81, 0]} numSolverIterations={10}>
        <Tower disabled={disabled} onExtract={onExtract} onCollapse={onCollapse} onBlocked={onBlocked} controls={controls} />
      </Physics>
      <OrbitControls
        ref={controls}
        target={[0, 5.6, 0]}
        enablePan={false}
        minDistance={12}
        maxDistance={32}
        minPolarAngle={0.25}
        maxPolarAngle={1.45}
        rotateSpeed={0.7}
      />
    </Canvas>
  );
}
