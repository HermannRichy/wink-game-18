"use client";

import { useEffect, useId, useRef, useState } from "react";

const FACE =
  "M36 18c0 9.941-8.059 18-18 18S0 27.941 0 18 8.059 0 18 0s18 8.059 18 18";
const FEATURES =
  "M24.327 23.622c-.153-.132-.368-.159-.551-.069l-4 2c-1.871.935-6.727.947-6.776.947-.276 0-.5.224-.5.5 0 .185.101.347.25.433v.001h.001v.001c.071.04.153.063.24.065h7.008c2.658 0 4.089-2.185 4.475-3.342.064-.192.006-.403-.147-.536zM31.001 16c-.305 0-.604-.138-.801-.4-2.641-3.521-6.061-3.599-6.206-3.6-.55-.006-.994-.456-.991-1.005.003-.551.447-.995.997-.995.184 0 4.537.05 7.8 4.4.332.442.242 1.069-.2 1.4-.18.135-.39.2-.599.2zM4.999 16c-.208 0-.419-.065-.599-.2-.442-.331-.531-.958-.2-1.4C7.462 10.05 11.816 10 12 10c.552 0 1 .448 1 1 0 .551-.445.998-.996 1-.156.002-3.569.086-6.205 3.6-.195.262-.496.4-.8.4zm10.898 1.396c.023-.052.059-.096.073-.154.134-.536-.192-1.079-.727-1.213-.18-.045-4.467-1.08-7.797 1.138-.459.306-.583.927-.277 1.387.192.29.509.446.832.446.19 0 .383-.055.554-.168 1.092-.729 2.362-.995 3.468-1.061-.009.076-.023.151-.023.229 0 1.104.896 2 2 2s2-.896 2-2c0-.212-.042-.412-.103-.604zm11.999-.001c.023-.052.059-.095.073-.152.135-.536-.191-1.079-.727-1.213-.18-.045-4.466-1.08-7.797 1.138-.46.306-.584.927-.277 1.387.192.289.51.445.833.445.19 0 .383-.055.554-.168 1.092-.729 2.361-.994 3.469-1.06-.009.076-.024.15-.024.228 0 1.104.896 2 2 2s2-.896 2-2c0-.212-.042-.413-.104-.605z";

/**
 * Mascotte 😏 (dessin Twemoji, CC-BY 4.0) en pseudo-3D.
 * interactive : la tête s'incline et le visage suit le doigt, la souris ou le gyroscope.
 */
export function Mascot({
  size = 160,
  interactive = false,
  shadow = true,
  className = "",
  label,
}: {
  size?: number;
  interactive?: boolean;
  shadow?: boolean;
  className?: string;
  label?: string;
}) {
  const gid = useId().replace(/:/g, "");
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

  const tilt = `rotateY(${look.x * 22}deg) rotateX(${-look.y * 18}deg)`;

  return (
    <div
      ref={ref}
      className={className}
      style={{ width: size, height: size * 1.08, perspective: 600 }}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <svg
        viewBox="-2 -1 40 42"
        width={size}
        height={size * 1.08}
        style={{ transform: tilt, transition: "transform 180ms ease-out", overflow: "visible" }}
      >
        <defs>
          <radialGradient id={`${gid}-g`} cx={`${35 + look.x * 8}%`} cy={`${30 + look.y * 8}%`} r="80%">
            <stop offset="0" stopColor="#FFF2B3" />
            <stop offset=".45" stopColor="#FFCC4D" />
            <stop offset="1" stopColor="#E59A1E" />
          </radialGradient>
        </defs>
        {shadow && <ellipse cx={18.5 + look.x * 1.5} cy="39.2" rx="13" ry="1.8" fill="#141414" opacity=".28" />}
        <path fill={`url(#${gid}-g)`} d={FACE} />
        <ellipse
          cx={11 + look.x * 1.2}
          cy={7.5 + look.y * 1}
          rx="5"
          ry="2.6"
          fill="#fff"
          opacity=".55"
          transform={`rotate(-28 ${11 + look.x * 1.2} ${7.5 + look.y})`}
        />
        <path
          fill="#664500"
          d={FEATURES}
          style={{ transform: `translate(${look.x * 1.6}px, ${look.y * 1.2}px)`, transition: "transform 180ms ease-out" }}
        />
      </svg>
    </div>
  );
}
