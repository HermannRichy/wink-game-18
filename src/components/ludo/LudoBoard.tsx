"use client";

import { HOT, SAFE, TRACK, pawnXY, type Pawns } from "@/lib/ludo";

const PLAYER_COLORS = ["#FFA3C7", "#FF7A1A"];
const C = 22;

const STAR = "M0 -7 2 -2.2 7 -2.2 3 1 4.5 6 0 3 -4.5 6 -3 1 -7 -2.2 -2 -2.2Z";
const FLAME = "M0 -7C4 -3 6 0 4 4 3 7-3 7-4 4-6 0-2-2 0-7Z";
const STARTS: Record<number, string> = { 0: "#FFA3C7", 13: "#FFD93D", 26: "#FF7A1A", 39: "#FF2E4D" };

function Pawn({ color, highlight }: { color: string; highlight: boolean }) {
  return (
    <g transform="translate(-10 -21)">
      {highlight && <circle cx="10" cy="20" r="13" fill="none" stroke="#141414" strokeWidth="2.5" className="animate-pulse" />}
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
}: {
  pawns: Pawns;
  movable: number[];
  player: number;
  onPick: (pawn: number) => void;
  names: [string, string];
}) {
  // Décale légèrement les pions qui partagent une case
  const occupancy = new Map<string, number>();

  return (
    <svg viewBox="0 0 330 330" className="block h-auto w-full" role="img" aria-label={`Plateau de Ludo : ${names[0]} en rose, ${names[1]} en orange`}>
      <defs>
        <pattern id="ludo-grid" width="22" height="22" patternUnits="userSpaceOnUse">
          <path d="M22 0H0V22" fill="none" stroke="#141414" strokeWidth="1.4" />
        </pattern>
      </defs>
      <rect width="330" height="330" fill="#FFF3E6" />

      {/* Maisons */}
      {[
        [0, 0, "#FFA3C7"],
        [198, 0, "#FFD93D"],
        [0, 198, "#FF2E4D"],
        [198, 198, "#FF7A1A"],
      ].map(([x, y, color]) => (
        <g key={`${x}-${y}`}>
          <rect x={x} y={y} width="132" height="132" fill={color as string} stroke="#141414" strokeWidth="2" />
          <rect x={(x as number) + 22} y={(y as number) + 22} width="88" height="88" rx="10" fill="#FFF3E6" stroke="#141414" strokeWidth="2.5" />
          {[
            [44, 44],
            [88, 44],
            [44, 88],
            [88, 88],
          ].map(([dx, dy]) => (
            <circle key={`${dx}${dy}`} cx={(x as number) + dx} cy={(y as number) + dy} r="13" fill={color as string} stroke="#141414" strokeWidth="2.5" />
          ))}
        </g>
      ))}

      {/* Couloirs d'arrivée */}
      <rect x="22" y="154" width="110" height="22" fill="#FFA3C7" />
      <rect x="154" y="22" width="22" height="110" fill="#FFD93D" />
      <rect x="198" y="154" width="110" height="22" fill="#FF7A1A" />
      <rect x="154" y="198" width="22" height="110" fill="#FF2E4D" />

      {/* Cases spéciales du parcours */}
      {TRACK.map(([r, c], i) => {
        const fill = STARTS[i] ?? (HOT.has(i) ? "#141414" : null);
        return fill ? <rect key={i} x={c * C} y={r * C} width={C} height={C} fill={fill} /> : null;
      })}

      {/* Quadrillage des bras */}
      <rect x="0" y="132" width="132" height="66" fill="url(#ludo-grid)" />
      <rect x="198" y="132" width="132" height="66" fill="url(#ludo-grid)" />
      <rect x="132" y="0" width="66" height="132" fill="url(#ludo-grid)" />
      <rect x="132" y="198" width="66" height="132" fill="url(#ludo-grid)" />
      <path d="M0 132H132V0H198V132H330V198H198V330H132V198H0Z" fill="none" stroke="#141414" strokeWidth="2" />

      {/* Centre */}
      <path d="M132 132 165 165 132 198Z" fill="#FFA3C7" stroke="#141414" strokeWidth="2" strokeLinejoin="round" />
      <path d="M132 132 198 132 165 165Z" fill="#FFD93D" stroke="#141414" strokeWidth="2" strokeLinejoin="round" />
      <path d="M198 132 198 198 165 165Z" fill="#FF7A1A" stroke="#141414" strokeWidth="2" strokeLinejoin="round" />
      <path d="M132 198 198 198 165 165Z" fill="#FF2E4D" stroke="#141414" strokeWidth="2" strokeLinejoin="round" />

      {/* Étoiles (cases protégées) et flammes (cases Brûlantes) */}
      {TRACK.map(([r, c], i) => {
        const x = c * C + C / 2;
        const y = r * C + C / 2;
        if (HOT.has(i)) return <path key={`f${i}`} transform={`translate(${x} ${y})`} d={FLAME} fill="#FFD93D" />;
        if (SAFE.has(i) && STARTS[i] === undefined)
          return <path key={`s${i}`} transform={`translate(${x} ${y})`} d={STAR} fill="none" stroke="#141414" strokeWidth="1.6" strokeLinejoin="round" />;
        return null;
      })}

      {/* Pions : le joueur actif est dessiné par-dessus */}
      {[1 - player, player].map((pl) =>
        pawns[pl].map((progress, i) => {
          let [x, y] = pawnXY(pl, i, progress);
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
              <Pawn color={PLAYER_COLORS[pl]} highlight={canPick} />
            </g>
          );
        }),
      )}
    </svg>
  );
}
