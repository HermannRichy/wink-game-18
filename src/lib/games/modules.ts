import { CARDS, LEVEL_ORDER, gagesFor, type Card, type Level } from "@/data/cards";
import { quizFor } from "@/data/quiz";
import { buildDeck } from "@/lib/deck";
import { AOV, AOV_DISTANCE, DISTANCE_DUO, DUO_CHALLENGES, type AovKind } from "@/data/aov";
import { freshIndex, isFresh } from "@/lib/seen";
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
  // Départ sur Flirt et Doux (pas toujours les mêmes Flirt), puis un cran toutes les 6 cartes
  const reach = Math.min(maxIdx, 1 + Math.floor(s.count / 6));
  const all = aovPool(s.distance).filter((c) => c.kind === kind);
  // Ni déjà joué dans la partie, ni vu sur l'un des deux téléphones, ni vu dans les Cartes (même texte)
  const fresh = (c: (typeof all)[number]) => !s.used.includes(c.id) && isFresh("aov", c.id, c.text);
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

// ————————————————————— Cartes (Duo / Distance) —————————————————————


/** Questions des Cartes qui ne marchent pas à distance */
const NOT_REMOTE = new Set(["c10", "b06"]);

/** Toutes les cartes jouables dans ce mode (à distance : questions + défis adaptés + jokers) */
export function cartesPool(distance?: boolean): Card[] {
  if (!distance) return CARDS;
  const remoteDefis: Card[] = AOV_DISTANCE.map((c) => ({ id: c.id, level: c.level, kind: "defi", text: c.text, seconds: c.seconds }));
  return [...CARDS.filter((c) => (c.kind !== "defi" && !NOT_REMOTE.has(c.id))), ...remoteDefis];
}

export interface CartesState {
  deck: string[];
  index: number;
  turn: 0 | 1;
  phase: "draw" | "show" | "gage" | "done";
  gageIdx: number;
  passes: [number, number];
  together: boolean;
  distance?: boolean;
}
export type CartesAction = { t: "draw" } | { t: "done" } | { t: "refuse" } | { t: "usePass" } | { t: "joker" } | { t: "gageDone" } | { t: "restart" };

function cartesDeck(maxLevel: Level, distance?: boolean) {
  return buildDeck(maxLevel, cartesPool(distance)).map((c) => c.id);
}

const nextCard = (s: CartesState, samePlayer = false): CartesState => {
  const index = s.index + 1;
  return { ...s, index, phase: index >= s.deck.length ? "done" : "draw", turn: samePlayer ? s.turn : other(s.turn) };
};

export const cartesModule: GameModule<CartesState, CartesAction> = {
  init: (o) => ({ deck: cartesDeck(o.maxLevel, o.distance), index: 0, turn: o.starter, phase: "draw", gageIdx: 0, passes: [0, 0], together: false, distance: o.distance }),
  reduce(s, a, actor) {
    if (a.t === "restart") {
      if (s.phase !== "done") return s;
      return { ...s, index: 0, phase: "draw", passes: [0, 0], together: false };
    }
    if (actor !== s.turn) return s;
    const card = cartesPool(s.distance).find((c) => c.id === s.deck[s.index]);
    switch (a.t) {
      case "draw": {
        if (s.phase !== "draw") return s;
        // Le paquet a été préparé par le premier téléphone : on évite aussi ce que l'autre a déjà vu
        const pool = cartesPool(s.distance);
        const freshAt = (i: number) => {
          const c = pool.find((x) => x.id === s.deck[i]);
          return !c || isFresh("cartes", c.id, c.text);
        };
        if (!freshAt(s.index)) {
          for (let j = s.index + 1; j < Math.min(s.deck.length, s.index + 20); j++) {
            if (freshAt(j)) {
              const deck = [...s.deck];
              [deck[s.index], deck[j]] = [deck[j], deck[s.index]];
              return { ...s, deck, phase: "show" };
            }
          }
        }
        return { ...s, phase: "show" };
      }
      case "done":
        return s.phase === "show" ? { ...nextCard(s), together: false } : s;
      case "refuse":
        return s.phase === "show" ? { ...s, phase: "gage", gageIdx: gageIdx(s.distance) } : s;
      case "usePass": {
        if (s.phase !== "show" || s.passes[actor] < 1) return s;
        const passes: [number, number] = [...s.passes];
        passes[actor] -= 1;
        return { ...nextCard({ ...s, passes }), together: false };
      }
      case "gageDone":
        return s.phase === "gage" ? { ...nextCard(s), together: false } : s;
      case "joker": {
        if (s.phase !== "show" || card?.kind !== "joker") return s;
        if (card.joker === "passer") {
          const passes: [number, number] = [...s.passes];
          passes[actor] += 1;
          return nextCard({ ...s, passes });
        }
        if (card.joker === "ensemble") return { ...nextCard(s), together: true };
        return nextCard(s, true);
      }
    }
  },
};

// ————————————————————— Quiz (Duo / Distance) —————————————————————

export interface QuizDuoState {
  ids: string[];
  played: string[];
  turn: 0 | 1;
  current: number | null;
  distance?: boolean;
}
export type QuizDuoAction = { t: "open"; index: number } | { t: "answered" } | { t: "skip" } | { t: "reset" };

export const quizDuoModule: GameModule<QuizDuoState, QuizDuoAction> = {
  init: (o) => ({ ids: quizFor(o.maxLevel).map((q) => q.id), played: [], turn: o.starter, current: null, distance: o.distance }),
  reduce(s, a, actor) {
    if (a.t === "reset") return { ...s, played: [], current: null };
    if (actor !== s.turn) return s;
    switch (a.t) {
      case "open":
        if (s.current !== null || s.played.includes(s.ids[a.index])) return s;
        return { ...s, current: a.index };
      case "answered":
        if (s.current === null) return s;
        return { ...s, played: [...s.played, s.ids[s.current]], current: null, turn: other(s.turn) };
      case "skip":
        return { ...s, current: null };
    }
  },
};
