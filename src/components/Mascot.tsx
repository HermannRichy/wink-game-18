"use client";

import { useEffect, useRef, useState } from "react";

/** Poses de la mascotte (public/mascot/0..5.webp) */
export const POSES = {
  dynamique: 0,
  v: 1,
  joyeuse: 2,
  salut: 3,
  brasOuverts: 4,
  clin: 5,
} as const;

/**
 * Mascotte Wink (cœur 3D). Sous 64 px, le cœur plat du logo est utilisé (le personnage entier serait illisible).
 * interactive : la tête s'incline et le visage suit le doigt, la souris ou le gyroscope.
 */
export function Mascot({
  size = 160,
  interactive = false,
  shadow = true,
  className = "",
  label,
  pose = POSES.salut,
}: {
  size?: number;
  interactive?: boolean;
  shadow?: boolean;
  className?: string;
  label?: string;
  pose?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [look, setLook] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!interactive) return;
    const update = (clientX: number, clientY: number) => {
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const dx = (clientX - (r.left + r.width / 2)) / (window.innerWidth / 2);
      const dy = (clientY - (r.top + r.height / 2)) / (window.innerHeight / 2);
      setLook({ x: Math.max(-1, Math.min(1, dx)), y: Math.max(-1, Math.min(1, dy)) });
    };
    const onPointer = (e: PointerEvent) => update(e.clientX, e.clientY);
    const onOrient = (e: DeviceOrientationEvent) => {
      if (e.gamma == null || e.beta == null) return;
      setLook({
        x: Math.max(-1, Math.min(1, e.gamma / 30)),
        y: Math.max(-1, Math.min(1, (e.beta - 45) / 30)),
      });
    };
    window.addEventListener("pointermove", onPointer);
    window.addEventListener("pointerdown", onPointer);
    window.addEventListener("deviceorientation", onOrient);
    return () => {
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("deviceorientation", onOrient);
    };
  }, [interactive]);

  const tilt = `rotateY(${look.x * 16}deg) rotateX(${-look.y * 12}deg)`;
  const small = size < 64;
  const src = small ? "/mascot/heart.webp" : `/mascot/${pose}.webp`;

  return (
    <div
      ref={ref}
      className={className}
      style={{ width: size, height: size, perspective: 600 }}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        width={size}
        height={size}
        draggable={false}
        style={{
          width: size,
          height: size,
          objectFit: "contain",
          transform: tilt,
          transition: "transform 180ms ease-out",
          filter: shadow ? "drop-shadow(0 6px 0 rgba(20,20,20,.22))" : undefined,
        }}
      />
    </div>
  );
}
