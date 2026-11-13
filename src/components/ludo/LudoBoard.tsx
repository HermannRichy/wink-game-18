"use client";

import { CORNER_XY, HOME_COLUMN, HOT, SAFE, TRACK, pawnXY, type Corners, type Pawns } from "@/lib/ludo";

const C = 22;
/** Marge autour du plateau : les pions posés sur les cases du bord ne sont plus coupés */
const M = 14;
const NEUTRAL = "#EADFD2";
export const CORNER_NAME = ["en haut à gauche", "en haut à droite", "en bas à droite", "en bas à gauche"];

export const LUDO_COLORS: { id: string; name: string }[] = [
  { id: "#FFA3C7", name: "Rose" },
  { id: "#FF7A1A", name: "Orange" },
  { id: "#FF2E4D", name: "Rouge" },
  { id: "#FFD93D", name: "Jaune" },
  { id: "#3A86FF", name: "Bleu" },
  { id: "#2EC4B6", name: "Turquoise" },
  { id: "#9B5DE5", name: "Violet" },
  { id: "#7BD389", name: "Vert" },
];
export const DEFAULT_COLORS: [string, string] = ["#FFA3C7", "#FF7A1A"];
export const colorName = (c: string) => LUDO_COLORS.find((x) => x.id === c)?.name ?? "";

const STAR = "M0 -7 2 -2.2 7 -2.2 3 1 4.5 6 0 3 -4.5 6 -3 1 -7 -2.2 -2 -2.2Z";
const FLAME = "M0 -7C4 -3 6 0 4 4 3 7-3 7-4 4-6 0-2-2 0-7Z";
const TRI = ["M132 132 165 165 132 198Z", "M132 132 198 132 165 165Z", "M198 132 198 198 165 165Z", "M132 198 198 198 165 165Z"];
const ARMS: [number, number, number, number][] = [
  [0, 132, 132, 66],
  [198, 132, 132, 66],
  [132, 0, 66, 132],
  [132, 198, 66, 132],
];

function Pawn({ color, highlight }: { color: string; highlight: boolean }) {
  return (
    <g transform="translate(-10 -21)">
      {highlight && <circle cx="10" cy="20" r="13" fill="none" stroke="#141414" strokeWidth="2.5" strokeDasharray="4 3" className="animate-pulse" />}
      <ellipse cx="10" cy="22.5" rx="8" ry="3" fill={color} stroke="#141414" strokeWidth="1.6" />
      <path d="M5.5 22 7.6 11.5H12.4L14.5 22Z" fill={color} stroke="#141414" strokeWidth="1.6" strokeLinejoin="round" />
      <circle cx="10" cy="7" r="5" fill={color} stroke="#141414" strokeWidth="1.6" />
      <circle cx="8.3" cy="5.4" r="1.5" fill="#FFFFFF" />
    </g>
  );
}

export function LudoBoard({
  pawns,
  movable,
  player,
  onPick,
  names,
  corners,
  colors,
  onCorner,
  labels,
}: {
  pawns: Pawns;
  movable: number[];
  player: number;
  onPick: (pawn: number) => void;
  names: [string, string];
  corners: Corners;
  colors: [string, string];
  /** Mode « choix des maisons » : touche un coin libre */
  onCorner?: (corner: number) => void;
  labels?: boolean;
}) {
  const occupancy = new Map<string, number>();
  const owner = (k: number) => (corners[0] === k ? 0 : corners[1] === k ? 1 : -1);
  const colorOf = (k: number) => {
    const o = owner(k);
    return o < 0 ? NEUTRAL : colors[o as 0 | 1];
  };

  return (
    <svg
      viewBox={`${-M} ${-M - 6} ${330 + 2 * M} ${330 + 2 * M + 6}`}
      className="block h-auto w-full"
      role="img"
      aria-label={`Plateau de Ludo : ${names[0]} en ${colorName(colors[0]).toLowerCase()}, ${names[1]} en ${colorName(colors[1]).toLowerCase()}`}
    >
      <defs>
        <pattern id="ludo-grid" width="22" height="22" patternUnits="userSpaceOnUse">
          <path d="M22 0H0V22" fill="none" stroke="#141414" strokeWidth="1.4" />
        </pattern>
      </defs>
      <rect x={-M} y={-M - 6} width={330 + 2 * M} height={330 + 2 * M + 6} fill="#FFF3E6" />

      {/* Maisons */}
      {CORNER_XY.map(([x, y], k) => {
        const o = owner(k);
        const color = colorOf(k);
        return (
          <g
            key={k}
            onClick={onCorner && o < 0 ? () => onCorner(k) : undefined}
            role={onCorner && o < 0 ? "button" : undefined}
            aria-label={onCorner && o < 0 ? `Installer la maison ${CORNER_NAME[k]}` : undefined}
            tabIndex={onCorner && o < 0 ? 0 : undefined}
            onKeyDown={onCorner && o < 0 ? (e) => (e.key === "Enter" || e.key === " ") && onCorner(k) : undefined}
            style={{ cursor: onCorner && o < 0 ? "pointer" : undefined }}
          >
            <rect x={x} y={y} width="132" height="132" fill={color} stroke="#141414" strokeWidth="2" />
            <rect x={x + 22} y={y + 22} width="88" height="88" rx="12" fill="#FFF3E6" stroke="#141414" strokeWidth="2.5" />
            {o < 0 && onCorner ? (
              <>
                <text x={x + 66} y={y + 68} textAnchor="middle" fontWeight="900" fontSize="34">
                  +
                </text>
                <text x={x + 66} y={y + 90} textAnchor="middle" fontWeight="800" fontSize="14">
                  Libre
                </text>
              </>
            ) : (
              [
                [44, 44],
                [88, 44],
                [44, 88],
                [88, 88],
              ].map(([dx, dy]) => (
                <circle
                  key={`${dx}${dy}`}
                  cx={x + dx}
                  cy={y + dy}
                  r="13"
                  fill={o < 0 ? "#F3EBE1" : color}
                  stroke="#141414"
                  strokeWidth="2.5"
                  strokeDasharray={o < 0 ? "3 3" : undefined}
                />
              ))
            )}
            {o >= 0 && HOME_COLUMN[k].map(([r, c]) => <rect key={`${r}-${c}`} x={c * C} y={r * C} width={C} height={C} fill={color} />)}
          </g>
        );
      })}

      {/* Cases de départ et cases Brûlantes */}
      {TRACK.map(([r, c], i) => {
        const fill = i % 13 === 0 ? (owner(i / 13) >= 0 ? colorOf(i / 13) : null) : HOT.has(i) ? "#141414" : null;
        return fill ? <rect key={i} x={c * C} y={r * C} width={C} height={C} fill={fill} /> : null;
      })}

      {ARMS.map(([x, y, w, h]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width={w} height={h} fill="url(#ludo-grid)" pointerEvents="none" />
      ))}
      <path d="M0 132H132V0H198V132H330V198H198V330H132V198H0Z" fill="none" stroke="#141414" strokeWidth="2.5" />

      {/* Centre */}
      {TRI.map((d, k) => (
        <path key={k} d={d} fill={colorOf(k)} stroke="#141414" strokeWidth="2" strokeLinejoin="round" />
      ))}

      {/* Étoiles (cases protégées) et flammes (cases Brûlantes) */}
      {TRACK.map(([r, c], i) => {
        const x = c * C + C / 2;
        const y = r * C + C / 2;
        if (HOT.has(i)) return <path key={`f${i}`} transform={`translate(${x} ${y})`} d={FLAME} fill="#FFD93D" />;
        if (SAFE.has(i) && i % 13 !== 0)
          return <path key={`s${i}`} transform={`translate(${x} ${y})`} d={STAR} fill="none" stroke="#141414" strokeWidth="1.6" strokeLinejoin="round" />;
        return null;
      })}
      <rect x="0" y="0" width="330" height="330" fill="none" stroke="#141414" strokeWidth="3" pointerEvents="none" />

      {/* Prénoms sur les maisons (écran de choix) */}
      {labels &&
        ([0, 1] as const).map((pl) => {
          const [x, y] = CORNER_XY[corners[pl]];
          return (
            <g key={pl} pointerEvents="none">
              <rect x={x + 18} y={y + 50} width="96" height="32" rx="16" fill="#141414" />
              <text x={x + 66} y={y + 72} textAnchor="middle" fontWeight="900" fontSize="16" fill="#FFD93D">
                {names[pl].slice(0, 9)}
              </text>
            </g>
          );
        })}

      {/* Pions : le joueur actif est dessiné par-dessus */}
      {!labels &&
        [1 - player, player].map((pl) =>
          pawns[pl].map((progress, i) => {
            let [x, y] = pawnXY(corners[pl], i, progress);
            if (progress >= 0 && progress < 56) {
              const key = `${x},${y}`;
              const n = occupancy.get(key) ?? 0;
              occupancy.set(key, n + 1);
              x += n * 4;
              y -= n * 3;
            }
            const canPick = pl === player && movable.includes(i);
            return (
              <g
                key={`${pl}-${i}`}
                style={{ transform: `translate(${x}px, ${y}px)`, transition: "transform 150ms ease-out", cursor: canPick ? "pointer" : "default" }}
                onClick={canPick ? () => onPick(i) : undefined}
                role={canPick ? "button" : undefined}
                aria-label={canPick ? `Avancer le pion ${i + 1} de ${names[pl]}` : undefined}
                tabIndex={canPick ? 0 : undefined}
                onKeyDown={canPick ? (e) => (e.key === "Enter" || e.key === " ") && onPick(i) : undefined}
              >
                {canPick && <rect x="-16" y="-22" width="32" height="34" fill="transparent" />}
                <Pawn color={colors[pl]} highlight={canPick} />
              </g>
            );
          }),
        )}
    </svg>
  );
}
