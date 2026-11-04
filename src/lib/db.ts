import Dexie, { type EntityTable } from "dexie";
import type { Level } from "@/data/cards";

export interface Settings {
  id: "main";
  ageConfirmed: boolean;
  player1: string;
  player2: string;
  maxLevel: Level;
  soundOn: boolean;
  /** L'utilisateur a choisi de continuer dans le navigateur sans installer */
  installSkipped: boolean;
}

export interface Favorite {
  cardId: string;
  addedAt: number;
}

export interface QuizPlayed {
  questionId: string;
  playedAt: number;
}

export const db = new Dexie("wink") as Dexie & {
  settings: EntityTable<Settings, "id">;
  favorites: EntityTable<Favorite, "cardId">;
  quizPlayed: EntityTable<QuizPlayed, "questionId">;
};

db.version(1).stores({
  settings: "id",
  favorites: "cardId, addedAt",
});
db.version(2).stores({
  quizPlayed: "questionId, playedAt",
});

export const DEFAULT_SETTINGS: Settings = {
  id: "main",
  ageConfirmed: false,
  player1: "",
  player2: "",
  maxLevel: "coquin",
  soundOn: true,
  installSkipped: false,
};

export async function saveSettings(patch: Partial<Omit<Settings, "id">>) {
  const current = (await db.settings.get("main")) ?? DEFAULT_SETTINGS;
  await db.settings.put({ ...DEFAULT_SETTINGS, ...current, ...patch, id: "main" });
}

export async function toggleFavorite(cardId: string) {
  const existing = await db.favorites.get(cardId);
  if (existing) await db.favorites.delete(cardId);
  else await db.favorites.put({ cardId, addedAt: Date.now() });
}
