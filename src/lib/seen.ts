"use client";

import { db } from "@/lib/db";

/**
 * Mémoire anti-répétition : chaque question, défi ou gage joué est retenu (par portée),
 * et ne revient qu'une fois tout le stock de cette portée épuisé.
 * Cache en mémoire (lecture synchrone) + sauvegarde dans IndexedDB.
 */
let cache = new Set<string>();
let loaded: Promise<void> | null = null;

export function loadSeen() {
  loaded ??= db.seen
    .toArray()
    .then((rows) => {
      cache = new Set(rows.map((r) => r.key));
    })
    .catch(() => {});
  return loaded;
}

const k = (scope: string, id: string) => `${scope}:${id}`;

export function isSeen(scope: string, id: string) {
  return cache.has(k(scope, id));
}

export function markSeen(scope: string, id: string) {
  const key = k(scope, id);
  if (cache.has(key)) return;
  cache.add(key);
  void db.seen.put({ key, at: Date.now() }).catch(() => {});
}

function reset(scope: string, ids: string[]) {
  const keys = ids.map((id) => k(scope, id));
  keys.forEach((key) => cache.delete(key));
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

export function resetScope(scope: string, ids: string[]) {
  reset(scope, ids);
}
