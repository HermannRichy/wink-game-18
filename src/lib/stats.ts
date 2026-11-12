"use client";

import { getBackend, periodKeys } from "@/lib/online/backend";

/**
 * Statistiques anonymes : uniquement des compteurs agrégés par jour.
 * Aucun nom, code de salle, identifiant ni contenu de message n'est envoyé.
 */

/** Comptes anonymes déjà présents dans Firebase Authentication au 13/11/2026 */
export const SIGNUPS_BASELINE = 350;

/** Compte +1 pour l'événement du jour (silencieux en cas d'erreur) */
export function stat(name: string) {
  if (typeof window === "undefined") return;
  getBackend()
    .then((b) => b.bump(periodKeys().day, name))
    .catch(() => {});
}

/**
 * Joueurs actifs : un appareil compte une fois par jour / semaine / mois.
 * Les drapeaux restent sur l'appareil.
 */
export function statOpen() {
  if (typeof window === "undefined") return;
  try {
    const k = periodKeys();
    const raw = localStorage.getItem("wink-stat-flags");
    const f = (raw ? JSON.parse(raw) : {}) as { d?: string; w?: string; m?: string; n?: number };
    const todo: string[][] = [];
    if (!f.n) todo.push([k.day, "new_device"]);
    if (f.d !== k.day) todo.push([k.day, "active"]);
    if (f.w !== k.week) todo.push([k.week, "active"]);
    if (f.m !== k.month) todo.push([k.month, "active"]);
    if (!todo.length) return;
    localStorage.setItem("wink-stat-flags", JSON.stringify({ d: k.day, w: k.week, m: k.month, n: 1 }));
    getBackend()
      .then((b) => Promise.all(todo.map(([p, n]) => b.bump(p, n))))
      .catch(() => {});
  } catch {
    /* ignore */
  }
}
