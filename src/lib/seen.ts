"use client";

import { db } from "@/lib/db";

/**
 * Mémoire anti-répétition : chaque question, défi ou gage joué est retenu (par portée),
 * et ne revient qu'une fois tout le stock de cette portée épuisé.
 * - Le texte est aussi retenu : un texte déjà vu dans un jeu (Cartes) n'est pas reproposé dans un autre (Action ou Vérité).
 * - En ligne, la mémoire de l'autre téléphone s'ajoute à la nôtre (voir setPartnerSeen).
 * Cache en mémoire (lecture synchrone) + sauvegarde dans IndexedDB.
 */
const when = new Map<string, number>();
let partner = new Set<string>();
let loaded: Promise<void> | null = null;

export function loadSeen() {
  loaded ??= db.seen
    .toArray()
    .then((rows) => {
      for (const r of rows) when.set(r.key, r.at ?? 0);
    })
    .catch(() => {});
  return loaded;
}

const k = (scope: string, id: string) => `${scope}:${id}`;

/** Empreinte d'un texte (sans accents, ponctuation ni prénoms) pour reconnaître le même texte d'un jeu à l'autre */
export function textKey(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\{(moi|toi)\}/g, "")
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 80);
}

export function isSeen(scope: string, id: string) {
  const key = k(scope, id);
  return when.has(key) || partner.has(key);
}

export function isSeenText(text: string) {
  return when.has(k("txt", textKey(text)));
}

/** Pas encore vu, ni par son identifiant, ni par son texte */
export function isFresh(scope: string, id: string, text?: string) {
  return !isSeen(scope, id) && !(text && isSeenText(text));
}

function put(key: string) {
  if (when.has(key)) return;
  const at = Date.now();
  when.set(key, at);
  void db.seen.put({ key, at }).catch(() => {});
}

export function markSeen(scope: string, id: string, text?: string) {
  put(k(scope, id));
  if (text) put(k("txt", textKey(text)));
}

function reset(scope: string, ids: string[], texts: string[] = []) {
  const keys = [...ids.map((id) => k(scope, id)), ...texts.map((t) => k("txt", textKey(t)))];
  keys.forEach((key) => {
    when.delete(key);
    partner.delete(key);
  });
  void db.seen.bulkDelete(keys).catch(() => {});
}

function shuffle<T>(list: T[]) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Choisit un élément pas encore vu (et le marque comme vu). Tout vu : on repart de zéro. */
export function pickFresh<T>(scope: string, list: T[], id: (t: T) => string, mark = true): T {
  let pool = list.filter((t) => !isSeen(scope, id(t)));
  if (pool.length === 0) {
    reset(scope, list.map(id));
    pool = list;
  }
  const item = pool[Math.floor(Math.random() * pool.length)];
  if (mark) markSeen(scope, id(item));
  return item;
}

/** Index d'un élément pas encore vu dans une liste de textes (gages…) */
export function freshIndex(scope: string, length: number) {
  const ids = Array.from({ length }, (_, i) => String(i));
  return Number(pickFresh(scope, ids, (x) => x));
}

/** Ordonne une liste : les éléments jamais vus d'abord (mélangés), puis les autres. */
export function orderFresh<T>(scope: string, list: T[], id: (t: T) => string): T[] {
  const fresh = list.filter((t) => !isSeen(scope, id(t)));
  const old = list.filter((t) => isSeen(scope, id(t)));
  if (fresh.length === 0) reset(scope, list.map(id));
  return [...shuffle(fresh), ...shuffle(old)];
}

export function resetScope(scope: string, ids: string[], texts?: string[]) {
  reset(scope, ids, texts);
}

/** En ligne : ce que l'autre téléphone a déjà vu (identifiants « portée:id ») */
export function setPartnerSeen(keys: string[]) {
  partner = new Set(keys);
}

/** Ce que ce téléphone a vu récemment, à partager avec l'autre en ligne */
export function recentSeenKeys(scopes = ["cartes", "aov", "gages", "gages-distance"], n = 300) {
  return [...when.entries()]
    .filter(([key]) => scopes.some((s) => key.startsWith(`${s}:`)))
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([key]) => key);
}
