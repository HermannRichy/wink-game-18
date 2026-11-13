/**
 * Moteur de Ludo à deux joueurs (logique pure, sans interface).
 * Progression d'un pion : -1 = maison, 0..50 = parcours, 51..55 = couloir d'arrivée, 56 = arrivé.
 */

export const CELL = 22; // taille d'une case dans le SVG (plateau 15 × 15 = 330)
export const FINISH = 56;
const TRACK_LEN = 52;

/** Parcours principal (ligne, colonne), en partant de la case de départ du joueur 0. */
export const TRACK: [number, number][] = [
  [6, 1], [6, 2], [6, 3], [6, 4], [6, 5],
  [5, 6], [4, 6], [3, 6], [2, 6], [1, 6], [0, 6],
  [0, 7],
  [0, 8], [1, 8], [2, 8], [3, 8], [4, 8], [5, 8],
  [6, 9], [6, 10], [6, 11], [6, 12], [6, 13], [6, 14],
  [7, 14],
  [8, 14], [8, 13], [8, 12], [8, 11], [8, 10], [8, 9],
  [9, 8], [10, 8], [11, 8], [12, 8], [13, 8], [14, 8],
  [14, 7],
  [14, 6], [13, 6], [12, 6], [11, 6], [10, 6], [9, 6],
  [8, 5], [8, 4], [8, 3], [8, 2], [8, 1], [8, 0],
  [7, 0],
  [6, 0],
];

/**
 * Les maisons sont les 4 coins : 0 = haut-gauche, 1 = haut-droite, 2 = bas-droite, 3 = bas-gauche.
 * Chaque joueur choisit son coin ; la case de départ du coin k est l'index 13 × k du parcours.
 */
export type Corners = [number, number];
export const DEFAULT_CORNERS: Corners = [0, 2];
export const CORNER_XY: [number, number][] = [
  [0, 0],
  [198, 0],
  [198, 198],
  [0, 198],
];
export const HOME_COLUMN: [number, number][][] = [
  [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5]],
  [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7]],
  [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9]],
  [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7]],
];
export const BASE_SPOTS: [number, number][][] = CORNER_XY.map(([x, y]) => [
  [x + 44, y + 44],
  [x + 88, y + 44],
  [x + 44, y + 88],
  [x + 88, y + 88],
]);
export const FINISH_SPOTS: [number, number][][] = [
  [[146, 156], [146, 174], [154, 165], [138, 165]],
  [[156, 146], [174, 146], [165, 154], [165, 138]],
  [[184, 156], [184, 174], [176, 165], [192, 165]],
  [[156, 184], [174, 184], [165, 176], [165, 192]],
];

/** Cases protégées (étoiles + cases de départ) et cases Brûlantes, en index absolu du parcours. */
export const SAFE = new Set([0, 8, 13, 21, 26, 34, 39, 47]);
export const HOT = new Set([3, 10, 16, 23, 29, 36, 42, 49]);

export type Pawns = [number[], number[]];

export function newPawns(): Pawns {
  return [
    [-1, -1, -1, -1],
    [-1, -1, -1, -1],
  ];
}

/** Index absolu sur le parcours pour un pion d'une maison (coin) donnée */
export function absIndex(corner: number, progress: number) {
  return (13 * corner + progress) % TRACK_LEN;
}

/** Position (x, y) au centre de la case, en unités du SVG. */
export function pawnXY(corner: number, pawn: number, progress: number): [number, number] {
  if (progress < 0) return BASE_SPOTS[corner][pawn];
  if (progress >= FINISH) return FINISH_SPOTS[corner][pawn];
  const [r, c] = progress <= 50 ? TRACK[absIndex(corner, progress)] : HOME_COLUMN[corner][progress - 51];
  return [c * CELL + CELL / 2, r * CELL + CELL / 2];
}

export function canMove(progress: number, dice: number) {
  if (progress >= FINISH) return false;
  if (progress < 0) return dice === 6;
  return progress + dice <= FINISH;
}

export function movablePawns(pawns: Pawns, player: number, dice: number) {
  return pawns[player].map((p, i) => (canMove(p, dice) ? i : -1)).filter((i) => i >= 0);
}

/** Étapes successives d'un déplacement (pour l'animation case par case). */
export function pathOf(progress: number, dice: number): number[] {
  if (progress < 0) return [0];
  const steps: number[] = [];
  for (let s = 1; s <= dice; s++) steps.push(progress + s);
  return steps;
}

export interface MoveResult {
  pawns: Pawns;
  captured: number[];
  hot: boolean;
  reachedHome: boolean;
  won: boolean;
}

export function applyMove(pawns: Pawns, player: number, pawn: number, dice: number, corners: Corners = DEFAULT_CORNERS): MoveResult {
  const next: Pawns = [[...pawns[0]], [...pawns[1]]];
  const from = next[player][pawn];
  const to = from < 0 ? 0 : from + dice;
  next[player][pawn] = to;

  const captured: number[] = [];
  let hot = false;
  if (to <= 50) {
    const idx = absIndex(corners[player], to);
    hot = HOT.has(idx);
    if (!SAFE.has(idx)) {
      const other = 1 - player;
      next[other].forEach((p, i) => {
        if (p >= 0 && p <= 50 && absIndex(corners[other], p) === idx) {
          next[other][i] = -1;
          captured.push(i);
        }
      });
    }
  }
  const reachedHome = to === FINISH;
  const won = next[player].every((p) => p === FINISH);
  return { pawns: next, captured, hot, reachedHome, won };
}
