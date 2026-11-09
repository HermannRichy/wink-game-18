import { LEVEL_ORDER, gagesFor, type Level } from "@/data/cards";
import { AOV, AOV_DISTANCE, DISTANCE_DUO, DUO_CHALLENGES, type AovKind } from "@/data/aov";
import { freshIndex, isSeen } from "@/lib/seen";
import type { GameModule, InitOpts } from "@/lib/online/session";

const rnd = (n: number) => Math.floor(Math.random() * n);
const other = (p: 0 | 1) => (1 - p) as 0 | 1;
/** Gage pas encore vu, dans la bonne liste (sur place ou à distance) */
const gageIdx = (distance?: boolean) => freshIndex(distance ? "gages-distance" : "gages", gagesFor(distance).length);
export const duoChallenges = (distance?: boolean) => (distance ? DISTANCE_DUO : DUO_CHALLENGES);

// ————————————————————— Action ou Vérité —————————————————————

export interface AovState {
  turn: 0 | 1;
  phase: "choose" | "show" | "gage";
  kind: AovKind | null;
  cardId: string | null;
  gageIdx: number;
  used: string[];
  count: number;
  maxLevel: Level;
  distance?: boolean;
}
export type AovAction = { t: "choose"; kind: AovKind } | { t: "done" } | { t: "refuse" } | { t: "gageDone" };

export function aovPool(distance?: boolean) {
  // À distance : les vérités restent les mêmes, les actions sont adaptées
  return distance ? [...AOV.filter((c) => c.kind === "verite"), ...AOV_DISTANCE] : AOV;
}

function pickAov(kind: AovKind, s: AovState) {
  const maxIdx = LEVEL_ORDER.indexOf(s.maxLevel);
  // L'intensité monte toutes les 6 cartes, sans dépasser le niveau max
  const reach = Math.min(maxIdx, Math.floor(s.count / 6));
  const all = aovPool(s.distance).filter((c) => c.kind === kind);
  const fresh = (c: (typeof all)[number]) => !s.used.includes(c.id) && !isSeen("aov", c.id);
  let pool = all.filter((c) => LEVEL_ORDER.indexOf(c.level) <= reach && fresh(c));
  if (pool.length === 0) pool = all.filter((c) => LEVEL_ORDER.indexOf(c.level) <= maxIdx && fresh(c));
  if (pool.length === 0) pool = all.filter((c) => LEVEL_ORDER.indexOf(c.level) <= maxIdx);
  const top = pool.filter((c) => LEVEL_ORDER.indexOf(c.level) === reach);
  const from = top.length && Math.random() < 0.65 ? top : pool;
  return from[rnd(from.length)];
}

export const aovModule: GameModule<AovState, AovAction> = {
  init: (o: InitOpts) => ({ turn: o.starter, phase: "choose", kind: null, cardId: null, gageIdx: 0, used: [], count: 0, maxLevel: o.maxLevel, distance: o.distance }),
  reduce(s, a, actor) {
    if (actor !== s.turn) return s;
    switch (a.t) {
      case "choose": {
        if (s.phase !== "choose") return s;
        const card = pickAov(a.kind, s);
        return { ...s, phase: "show", kind: a.kind, cardId: card.id, used: [...s.used, card.id].slice(-60) };
      }
      case "done":
        if (s.phase !== "show") return s;
        return { ...s, phase: "choose", kind: null, cardId: null, turn: other(s.turn), count: s.count + 1 };
      case "refuse":
        if (s.phase !== "show") return s;
        return { ...s, phase: "gage", gageIdx: gageIdx(s.distance) };
      case "gageDone":
        if (s.phase !== "gage") return s;
        return { ...s, phase: "choose", kind: null, cardId: null, turn: other(s.turn), count: s.count + 1 };
    }
  },
};

// ————————————————————— Morpion —————————————————————

export const LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

export interface MorpionState {
  board: (0 | 1 | null)[];
  turn: 0 | 1;
  starter: 0 | 1;
  winner: 0 | 1 | "draw" | null;
  line: number[] | null;
  score: [number, number];
  gageIdx: number;
  round: number;
  distance?: boolean;
}
export type MorpionAction = { t: "play"; cell: number } | { t: "next" };

export const morpionModule: GameModule<MorpionState, MorpionAction> = {
  init: (o) => ({ board: Array(9).fill(null), turn: o.starter, starter: o.starter, winner: null, line: null, score: [0, 0], gageIdx: 0, round: 1, distance: o.distance }),
  reduce(s, a, actor) {
    if (a.t === "next") {
      if (s.winner === null) return s;
      const starter = other(s.starter);
      return { ...s, board: Array(9).fill(null), turn: starter, starter, winner: null, line: null, round: s.round + 1 };
    }
    if (s.winner !== null || actor !== s.turn || s.board[a.cell] !== null) return s;
    const board = [...s.board];
    board[a.cell] = actor;
    const line = LINES.find((l) => l.every((i) => board[i] === actor)) ?? null;
    if (line) {
      const score: [number, number] = [...s.score];
      score[actor] += 1;
      return { ...s, board, line, winner: actor, score, gageIdx: gageIdx(s.distance) };
    }
    if (board.every((c) => c !== null))
      return { ...s, board, winner: "draw", gageIdx: freshIndex(s.distance ? "duo-distance" : "duo", duoChallenges(s.distance).length) };
    return { ...s, board, turn: other(actor) };
  },
};

// ————————————————————— Pierre-Papier-Ciseaux —————————————————————

export type Hand = "pierre" | "papier" | "ciseaux";
const BEATS: Record<Hand, Hand> = { pierre: "ciseaux", papier: "pierre", ciseaux: "papier" };

export interface PpcState {
  picks: [Hand | null, Hand | null];
  score: [number, number];
  round: number;
  phase: "pick" | "reveal" | "over";
  last: { picks: [Hand, Hand]; winner: 0 | 1 | null } | null;
  target: number;
  gageIdx: number;
  /** Prêts pour la manche suivante (en ligne, les deux doivent valider) */
  ready: [boolean, boolean];
  distance?: boolean;
}
export type PpcAction = { t: "pick"; hand: Hand } | { t: "continue" } | { t: "rematch" };

export const ppcModule: GameModule<PpcState, PpcAction> = {
  init: (o) => ({ picks: [null, null], score: [0, 0], round: 1, phase: "pick", last: null, target: 3, gageIdx: 0, ready: [false, false], distance: o.distance }),
  reduce(s, a, actor) {
    if (a.t === "pick") {
      if (s.phase !== "pick" || s.picks[actor]) return s;
      const picks: [Hand | null, Hand | null] = [...s.picks];
      picks[actor] = a.hand;
      if (!picks[0] || !picks[1]) return { ...s, picks };
      const [h0, h1] = picks as [Hand, Hand];
      const winner = h0 === h1 ? null : BEATS[h0] === h1 ? 0 : 1;
      const score: [number, number] = [...s.score];
      if (winner !== null) score[winner] += 1;
      const over = score[0] >= s.target || score[1] >= s.target;
      return { ...s, picks, score, phase: over ? "over" : "reveal", last: { picks: [h0, h1], winner }, gageIdx: gageIdx(s.distance), ready: [false, false] };
    }
    if (a.t === "continue") {
      if (s.phase !== "reveal") return s;
      return { ...s, picks: [null, null], round: s.round + 1, phase: "pick", ready: [false, false] };
    }
    // rematch
    if (s.phase !== "over") return s;
    return ppcModule.init({ maxLevel: "doux", starter: 0, distance: s.distance });
  },
};

// ————————————————————— Le Verre —————————————————————

export interface VerreState {
  turn: 0 | 1;
  starter: 0 | 1;
  /** Remplissage, en fraction de la hauteur du verre (1 = au ras du bord) */
  level: number;
  phase: "pour" | "over";
  loser: 0 | 1 | null;
  pours: number;
  gageIdx: number;
  round: number;
  /** Graine de la partie : forme du verre, niveau de départ */
  seed: number;
}
export type VerreAction = { t: "commit"; level: number; overflow: boolean } | { t: "next" };

const newVerre = (starter: 0 | 1, round: number): VerreState => ({
  turn: starter,
  starter,
  level: 0.38 + Math.random() * 0.2,
  phase: "pour",
  loser: null,
  pours: 0,
  gageIdx: 0,
  round,
  seed: rnd(1_000_000),
});

export const verreModule: GameModule<VerreState, VerreAction> = {
  init: (o) => newVerre(o.starter, 1),
  reduce(s, a, actor) {
    if (a.t === "next") return s.phase === "over" ? newVerre(other(s.starter), s.round + 1) : s;
    if (s.phase !== "pour" || actor !== s.turn) return s;
    if (a.overflow) return { ...s, level: a.level, phase: "over", loser: actor, gageIdx: gageIdx(false), pours: s.pours + 1 };
    return { ...s, level: a.level, turn: other(actor), pours: s.pours + 1 };
  },
};
