import type { GameId } from "@/data/games";
import { getBackend } from "@/lib/online/backend";

const KEY = "wink-rooms";
/** Une partie de plus de 24 h est supprimée automatiquement */
export const ROOM_TTL = 24 * 60 * 60 * 1000;

export interface KnownRoom {
  code: string;
  game: GameId;
  t: number;
}

function read(): KnownRoom[] {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) ?? "[]") as KnownRoom[];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}
function write(list: KnownRoom[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* stockage indisponible */
  }
}

export function rememberRoom(code: string, game: GameId) {
  const list = read();
  if (list.some((r) => r.code === code)) return;
  write([...list, { code, game, t: Date.now() }]);
}

export function forgetRoom(code: string) {
  write(read().filter((r) => r.code !== code));
}

/** Dernière partie encore reprenable (moins de 24 h) */
export function lastRoom(): KnownRoom | null {
  const fresh = read().filter((r) => Date.now() - r.t < ROOM_TTL);
  return fresh.length ? fresh[fresh.length - 1] : null;
}

/** Supprime les parties de ce téléphone qui ont plus de 24 h (le serveur n'a pas de ménage automatique) */
export async function sweepOldRooms() {
  const old = read().filter((r) => Date.now() - r.t >= ROOM_TTL);
  if (!old.length || (typeof navigator !== "undefined" && !navigator.onLine)) return;
  try {
    const b = await getBackend();
    await b.uid();
    for (const r of old) {
      try {
        await b.remove(r.code);
        forgetRoom(r.code);
      } catch {
        /* on réessaiera au prochain lancement */
      }
    }
  } catch {
    /* hors ligne ou connexion impossible */
  }
}

const ACTIVE = "wink-active-room";

/** Partie en cours : à la réouverture de l'app, on y retourne directement */
export function setActiveRoom(code: string | null) {
  try {
    if (code) localStorage.setItem(ACTIVE, code);
    else localStorage.removeItem(ACTIVE);
  } catch {
    /* stockage indisponible */
  }
}

export function activeRoom(): KnownRoom | null {
  try {
    const code = localStorage.getItem(ACTIVE);
    return read().find((r) => r.code === code && Date.now() - r.t < ROOM_TTL) ?? null;
  } catch {
    return null;
  }
}
