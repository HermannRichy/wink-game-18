"use client";

import type { Level } from "@/data/cards";
import type { QEntry } from "@/lib/online/backend";

/**
 * Mode Célibataires.
 * Le profil complet reste sur le téléphone (localStorage). Seul le minimum (QEntry) part dans la file
 * d'attente le temps de trouver quelqu'un, puis il est effacé.
 */

export type Mood = "jouer" | "discuter" | "coquin";

export interface SingleProfile {
  nick: string;
  age: number;
  gender: "h" | "f";
  ageMin: number;
  ageMax: number;
  city: string;
  country: string;
  tags: string[];
  mood: Mood;
  /** Sexe choisi explicitement (les anciens profils, pré-remplis, doivent le reconfirmer) */
  gc?: true;
}

/** Résumé montré à l'autre (match, ou arrivée par code) */
export interface Card {
  uid: string;
  n: string;
  a: number;
  g: "h" | "f";
  c: string;
  i: string[];
  m: Mood;
}

/** Données de la salle Célibataires (champ « single », en JSON) */
export interface SingleRoom {
  /** open : partie partagée en attente ; pending : quelqu'un attend ta réponse ; match : on choisit le jeu ; ok : partie lancée */
  status: "open" | "pending" | "match" | "ok";
  /** Ce que cherche l'hôte (partie partagée) */
  seek: "h" | "f";
  cards: (Card | null)[];
  refused?: string[];
}

export const TAGS = ["Musique", "Foot", "Séries", "Cuisine", "Voyage", "Danse", "Mode", "Jeux vidéo", "Cinéma", "Sport", "Lecture", "Fête", "Manga/Anime", "Numérique", "Autres"];

export const MOODS: { id: Mood; label: string; desc: string }[] = [
  { id: "discuter", label: "Discuter", desc: "Faire connaissance, tout en douceur" },
  { id: "jouer", label: "Jouer", desc: "Des défis fun, un peu de flirt" },
  { id: "coquin", label: "Coquin 🔥", desc: "Directement chaud (si l'autre aussi)" },
];
export const MOOD_LABEL: Record<Mood, string> = { discuter: "Discuter", jouer: "Jouer", coquin: "Coquin" };
const MOOD_RANK: Record<Mood, number> = { discuter: 0, jouer: 1, coquin: 2 };
const MOOD_LEVEL: Record<Mood, Level> = { discuter: "flirt", jouer: "doux", coquin: "brulant" };

/** L'ambiance de la partie : la plus douce des deux envies */
export function sharedMood(a: Mood, b: Mood): Mood {
  return MOOD_RANK[a] <= MOOD_RANK[b] ? a : b;
}
export const moodLevel = (m: Mood) => MOOD_LEVEL[m];

const KEY = "wink-single-profile";

export function loadProfile(): SingleProfile | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as SingleProfile) : null;
  } catch {
    return null;
  }
}
export function saveProfile(p: SingleProfile) {
  localStorage.setItem(KEY, JSON.stringify(p));
}

export const norm = (s: string) =>
  s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .slice(0, 40);

export const seekOf = (g: "h" | "f"): "h" | "f" => (g === "h" ? "f" : "h");

export function toEntry(p: SingleProfile): QEntry {
  return {
    g: p.gender,
    s: seekOf(p.gender),
    a: p.age,
    lo: p.ageMin,
    hi: p.ageMax,
    c: norm(p.city),
    p: norm(p.country),
    i: p.tags.join(","),
    m: p.mood,
    n: p.nick.slice(0, 20),
    t: Date.now(),
    x: "",
  };
}

export function toCard(uid: string, p: SingleProfile): Card {
  return { uid, n: p.nick, a: p.age, g: p.gender, c: p.city, i: p.tags, m: p.mood };
}
export function entryCard(uid: string, e: QEntry): Card {
  const city = e.c ? e.c.charAt(0).toUpperCase() + e.c.slice(1) : "";
  return { uid, n: e.n, a: e.a, g: e.g, c: city, i: e.i ? e.i.split(",") : [], m: e.m as Mood };
}

// ——— Personnes à ne plus jamais croiser (bloquées ou passées) ———
const AVOID = "wink-single-avoid";
export function avoided(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(AVOID) ?? "[]") as string[]);
  } catch {
    return new Set();
  }
}
export function avoid(uid: string) {
  const s = avoided();
  s.add(uid);
  localStorage.setItem(AVOID, JSON.stringify([...s].slice(-300)));
}
/** Passées seulement le temps de la session (on peut retomber dessus plus tard) */
const skipped = new Set<string>();
export const skip = (uid: string) => skipped.add(uid);

/**
 * Étape de la recherche : 0 = même ville, 1 = même pays, 2 = partout (âge respecté),
 * 3 = n'importe qui du sexe opposé qui est libre. L'important, c'est de trouver quelqu'un.
 */
export function stage(waitMs: number) {
  return waitMs < 10000 ? 0 : waitMs < 20000 ? 1 : waitMs < 30000 ? 2 : 3;
}

/** Personne libre, du sexe que je cherche, qui me cherche, encore là */
export function available(myUid: string, me: QEntry, uid: string, o: QEntry | undefined, now: number) {
  return !!o && uid !== myUid && o.x === "" && o.g === me.s && o.s === me.g && now - o.t < 30 * 60000;
}

/**
 * Meilleure personne à réserver parmi la file.
 * - Un seul des deux réserve, choisi par l'ordre des identifiants (pas par l'heure des téléphones) : pas de double match.
 * - Les critères (ville, pays, âge) servent au premier choix ; ils s'élargissent selon l'attente
 *   du plus ancien des deux, jusqu'à n'importe qui de libre au bout de 30 s.
 */
export function bestMatch(myUid: string, me: QEntry, queue: Record<string, QEntry>, now: number): string | null {
  const av = avoided();
  const myTags = new Set(me.i.split(",").filter(Boolean));
  let best: { uid: string; score: number } | null = null;
  for (const [uid, o] of Object.entries(queue)) {
    if (!available(myUid, me, uid, o, now) || myUid > uid) continue;
    if (av.has(uid) || skipped.has(uid)) continue;
    const ageOk = o.a >= me.lo && o.a <= me.hi && me.a >= o.lo && me.a <= o.hi;
    const geo = me.c && o.c === me.c ? 0 : me.p && o.p === me.p ? 1 : 2;
    const level = ageOk ? geo : 3;
    if (level > stage(now - Math.min(me.t, o.t))) continue;
    const common = o.i.split(",").filter((x) => myTags.has(x)).length;
    const score = level * 10 - common;
    if (!best || score < best.score) best = { uid, score };
  }
  return best?.uid ?? null;
}

export function parseSingle(json?: string): SingleRoom | null {
  if (!json) return null;
  try {
    return JSON.parse(json) as SingleRoom;
  } catch {
    return null;
  }
}

export const genderWord = (g: "h" | "f") => (g === "h" ? "un homme" : "une femme");
