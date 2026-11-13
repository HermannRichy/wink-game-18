"use client";

import { CARDS, DISTANCE_GAGES, GAGES, type Level } from "@/data/cards";
import { QUIZ } from "@/data/quiz";
import { AOV, AOV_DISTANCE, DISTANCE_DUO, DUO_CHALLENGES } from "@/data/aov";
import { TOWER_ACTIONS, TOWER_FINAL_GAGES } from "@/data/tower";
import { LUDO_CAPTURE, LUDO_FINAL, LUDO_HOME, LUDO_HOT_CELL, LUDO_SIX } from "@/data/ludo";
import { CHAT_CHALLENGES_DISTANCE, CHAT_CHALLENGES_DUO } from "@/data/chat-challenges";

/**
 * Contenus modifiables depuis le dashboard.
 * Les textes d'origine restent dans le code (base, et hors ligne) ; Firebase ne garde que les modifications.
 * Les modifications sont appliquées directement dans les tableaux exportés par src/data :
 * tous les jeux en profitent sans changer leur code.
 */

export interface ContentItem {
  id: string;
  text: string;
  level?: Level;
  kind?: string;
  seconds?: number;
  joker?: string;
}

export interface Override extends Partial<Omit<ContentItem, "id">> {
  /** Ajouté depuis le dashboard (n'existe pas dans le code) */
  added?: boolean;
  /** Masqué, réactivable */
  disabled?: boolean;
  /** Supprimé (contenu d'origine : masqué, restaurable) */
  deleted?: boolean;
  updatedAt?: number;
}

export type Overrides = Record<string, Record<string, Override>>;

export interface Collection {
  id: string;
  game: string;
  label: string;
  /** Rappel des variables pour cette collection */
  help: string;
  levels?: boolean;
  kinds?: { id: string; label: string }[];
  seconds?: boolean;
  /** Tableau de chaînes (sans niveau ni type) */
  strings?: boolean;
  arr: unknown[];
}

const T_MOI_TOI = "{moi} = celui ou celle qui joue (« tu »), {toi} = le ou la partenaire.";

export const COLLECTIONS: Collection[] = [
  { id: "cards", game: "Cartes", label: "Cartes (questions, défis, jokers)", help: T_MOI_TOI, levels: true, seconds: true, kinds: [{ id: "question", label: "Question" }, { id: "defi", label: "Défi" }, { id: "joker", label: "Joker" }], arr: CARDS },
  { id: "gages", game: "Tous les jeux", label: "Gages (refus, perdant)", help: T_MOI_TOI, strings: true, arr: GAGES },
  { id: "distance_gages", game: "Tous les jeux", label: "Gages à distance", help: T_MOI_TOI, strings: true, arr: DISTANCE_GAGES },
  { id: "quiz", game: "Quiz", label: "Questions du Quiz", help: "{moi} = celui qui pose la question, {toi} = celui qui répond.", levels: true, arr: QUIZ },
  { id: "aov", game: "Action ou Vérité", label: "Actions et vérités", help: T_MOI_TOI, levels: true, seconds: true, kinds: [{ id: "verite", label: "Vérité" }, { id: "action", label: "Action" }], arr: AOV },
  { id: "aov_distance", game: "Action ou Vérité", label: "Actions à distance (aussi défis des Cartes à distance)", help: T_MOI_TOI, levels: true, seconds: true, kinds: [{ id: "verite", label: "Vérité" }, { id: "action", label: "Action" }], arr: AOV_DISTANCE },
  { id: "tower", game: "La Tour", label: "Défis des blocs", help: "{moi} = celui qui a retiré le bloc, {toi} = le ou la partenaire.", seconds: true, arr: TOWER_ACTIONS },
  { id: "tower_final", game: "La Tour", label: "Gages finaux", help: "{moi} = celui qui a fait tomber la tour, {toi} = le ou la partenaire.", strings: true, arr: TOWER_FINAL_GAGES },
  { id: "ludo_hot", game: "Ludo Hot", label: "Cases Brûlantes", help: T_MOI_TOI, seconds: true, arr: LUDO_HOT_CELL },
  { id: "ludo_capture", game: "Ludo Hot", label: "Gages de capture", help: T_MOI_TOI, seconds: true, arr: LUDO_CAPTURE },
  { id: "ludo_six", game: "Ludo Hot", label: "Bonus du 6", help: T_MOI_TOI, seconds: true, arr: LUDO_SIX },
  { id: "ludo_home", game: "Ludo Hot", label: "Récompenses (pion arrivé)", help: T_MOI_TOI, seconds: true, arr: LUDO_HOME },
  { id: "ludo_final", game: "Ludo Hot", label: "Récompenses finales", help: T_MOI_TOI, seconds: true, arr: LUDO_FINAL },
  { id: "duo_challenges", game: "Morpion", label: "Défis à deux (match nul)", help: "Texte libre.", strings: true, arr: DUO_CHALLENGES },
  { id: "distance_duo", game: "Morpion", label: "Défis à deux à distance (match nul)", help: "Texte libre.", strings: true, arr: DISTANCE_DUO },
  { id: "chat_duo", game: "Chat", label: "Défis du chat (Duo)", help: "Texte libre, envoyé tel quel.", strings: true, arr: CHAT_CHALLENGES_DUO },
  { id: "chat_distance", game: "Chat", label: "Défis du chat (Distance)", help: "Texte libre, envoyé tel quel.", strings: true, arr: CHAT_CHALLENGES_DISTANCE },
];

/** Copie des textes d'origine, prise au chargement */
const BASE: Record<string, ContentItem[]> = Object.fromEntries(
  COLLECTIONS.map((c) => [
    c.id,
    c.strings ? (c.arr as string[]).map((text, i) => ({ id: `s${i}`, text })) : (c.arr as ContentItem[]).map((x) => ({ ...x })),
  ]),
);

export function baseItems(col: string): ContentItem[] {
  return BASE[col] ?? [];
}

export type RowStatus = "origine" | "modifié" | "ajouté" | "désactivé" | "supprimé";
export interface Row {
  item: ContentItem;
  status: RowStatus;
  override?: Override;
}

const FIELDS = ["text", "level", "kind", "seconds", "joker"] as const;

function merge(base: ContentItem, o: Override): ContentItem {
  const out: ContentItem = { ...base };
  for (const f of FIELDS) {
    if (o[f] !== undefined && o[f] !== null) (out as unknown as Record<string, unknown>)[f] = o[f];
  }
  if (o.seconds === 0) delete out.seconds;
  return out;
}

/** Vue du dashboard : contenu d'origine + modifications, avec leur état */
export function rows(col: string, overrides: Overrides): Row[] {
  const ov = overrides[col] ?? {};
  const out: Row[] = baseItems(col).map((b) => {
    const o = ov[b.id];
    if (!o) return { item: b, status: "origine" };
    return { item: merge(b, o), override: o, status: o.deleted ? "supprimé" : o.disabled ? "désactivé" : "modifié" };
  });
  for (const [id, o] of Object.entries(ov)) {
    if (!o.added) continue;
    const item = merge({ id, text: "" }, o);
    out.push({ item, override: o, status: o.deleted ? "supprimé" : o.disabled ? "désactivé" : "ajouté" });
  }
  return out;
}

/** Contenu effectivement jouable */
function playable(col: string, overrides: Overrides): ContentItem[] {
  return rows(col, overrides)
    .filter((r) => r.status !== "désactivé" && r.status !== "supprimé" && r.item.text.trim())
    .map((r) => r.item);
}

/** Applique les modifications dans les tableaux des jeux (en place) */
export function applyContent(overrides: Overrides) {
  for (const c of COLLECTIONS) {
    const items = playable(c.id, overrides);
    if (!items.length) continue; // jamais de jeu vide
    if (c.strings) c.arr.splice(0, c.arr.length, ...items.map((i) => i.text));
    else
      c.arr.splice(
        0,
        c.arr.length,
        ...items.map((i) => {
          const o: ContentItem = { id: i.id, text: i.text };
          if (i.level) o.level = i.level;
          if (i.kind) o.kind = i.kind;
          if (i.seconds) o.seconds = i.seconds;
          if (i.joker) o.joker = i.joker;
          return o;
        }),
      );
  }
}

const CACHE = "wink-content";
let busy = false;
let lastJson = "";

/** Une partie est en cours : on n'applique pas de nouvelles modifications (les index changeraient) */
export function setContentBusy(b: boolean) {
  busy = b;
  if (!b && pending) {
    applyContent(pending);
    pending = null;
  }
}
let pending: Overrides | null = null;

/** Au démarrage : dernière version connue, disponible hors ligne */
export function applyCachedContent() {
  try {
    lastJson = localStorage.getItem(CACHE) ?? "";
    if (lastJson) applyContent(JSON.parse(lastJson) as Overrides);
  } catch {
    /* ignore */
  }
}

/** Récupère les modifications (Firebase) et les garde pour le hors ligne */
export async function refreshContent(read: () => Promise<Overrides>) {
  try {
    const ov = await read();
    const json = JSON.stringify(ov ?? {});
    if (json === lastJson) return;
    lastJson = json;
    localStorage.setItem(CACHE, json);
    if (busy) pending = ov ?? {};
    else applyContent(ov ?? {});
  } catch {
    /* hors ligne : on garde le cache */
  }
}

if (typeof window !== "undefined") applyCachedContent();
