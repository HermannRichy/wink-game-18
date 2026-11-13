"use client";

import { useEffect, useRef, useState } from "react";

// Points de chaque face, sur une grille 3 × 3 (index 0..8)
const PIPS: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

// Orientation de chaque face sur le cube, et rotation du cube pour la montrer
const FACE_TRANSFORM: Record<number, string> = {
  1: "rotateY(0deg)",
  6: "rotateY(180deg)",
  2: "rotateY(90deg)",
  5: "rotateY(-90deg)",
  3: "rotateX(90deg)",
  4: "rotateX(-90deg)",
};
const SHOW: Record<number, [number, number]> = {
  1: [0, 0],
  6: [0, 180],
  2: [0, -90],
  5: [0, 90],
  3: [-90, 0],
  4: [90, 0],
};

export function Dice3D({ value, rollId, size = 64 }: { value: number; rollId: number; size?: number }) {
  const [rot, setRot] = useState<[number, number]>(() => [SHOW[value][0] - 20, SHOW[value][1] + 25]);
  const spins = useRef(0);

  useEffect(() => {
    if (rollId === 0) return;
    spins.current += 1;
    const [x, y] = SHOW[value];
    // Quelques tours complets puis la bonne face, légèrement inclinée pour l'effet 3D
    setRot([x - 20 + 720 * spins.current, y + 25 + 720 * spins.current]);
  }, [rollId, value]);

  const half = size / 2;
  return (
    <div style={{ width: size, height: size, perspective: size * 6 }} aria-hidden="true">
      <div
        style={{
          width: size,
          height: size,
          position: "relative",
          transformStyle: "preserve-3d",
          transform: `rotateX(${rot[0]}deg) rotateY(${rot[1]}deg)`,
          transition: rollId ? "transform 900ms cubic-bezier(0.2, 0.75, 0.25, 1)" : "none",
        }}
      >
        {/* Noyau plein : on ne voit plus au travers des coins arrondis */}
        {[1, 2, 3, 4, 5, 6].map((f) => (
          <div
            key={`core${f}`}
            className="absolute bg-[#D9CBB8]"
            style={{ inset: size * 0.05, transform: `${FACE_TRANSFORM[f]} translateZ(${half * 0.9}px)` }}
          />
        ))}
        {[1, 2, 3, 4, 5, 6].map((f) => (
          <div
            key={f}
            className="absolute inset-0 grid grid-cols-3 grid-rows-3 rounded-[22%] border-[3px] border-ink bg-[#FFFDF8] p-[14%]"
            style={{ transform: `${FACE_TRANSFORM[f]} translateZ(${half}px)`, backfaceVisibility: "hidden" }}
          >
            {Array.from({ length: 9 }, (_, i) => (
              <span key={i} className="flex items-center justify-center">
                {PIPS[f].includes(i) && <span className={`block h-[70%] w-[70%] rounded-full ${f === 1 || f === 6 ? "bg-passion" : "bg-ink"}`} />}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
