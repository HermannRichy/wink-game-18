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

export const TAGS = ["Musique", "Foot", "Séries", "Cuisine", "Voyage", "Danse", "Mode", "Jeux vidéo", "Cinéma", "Sport", "Lecture", "Fête"];

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

/** Étape de la recherche : 0 = même ville, 1 = même pays, 2 = partout */
export function stage(elapsedMs: number) {
  return elapsedMs < 20000 ? 0 : elapsedMs < 40000 ? 1 : 2;
}

/**
 * Meilleure personne à réserver parmi la file.
 * Seul le dernier arrivé réserve (on ne prend que des entrées plus anciennes que la sienne) : pas de double match.
 */
export function bestMatch(myUid: string, me: QEntry, queue: Record<string, QEntry>, elapsedMs: number): string | null {
  const st = stage(elapsedMs);
  // Après une minute sans personne, on assouplit l'âge (meilleur profil disponible)
  const slack = elapsedMs > 60000 ? 5 : 0;
  const av = avoided();
  const myTags = new Set(me.i.split(",").filter(Boolean));
  let best: { uid: string; score: number } | null = null;
  for (const [uid, o] of Object.entries(queue)) {
    if (uid === myUid || !o || o.x !== "" || o.t >= me.t) continue;
    if (av.has(uid) || skipped.has(uid)) continue;
    if (o.g !== me.s || o.s !== me.g) continue;
    if (o.a < me.lo - slack || o.a > me.hi + slack || me.a < o.lo - slack || me.a > o.hi + slack) continue;
    if (Date.now() - o.t > 30 * 60000) continue; // entrée abandonnée
    const tier = me.c && o.c === me.c ? 0 : me.p && o.p === me.p ? 1 : 2;
    if (tier > st) continue;
    const common = o.i.split(",").filter((x) => myTags.has(x)).length;
    const score = tier * 10 - common;
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
