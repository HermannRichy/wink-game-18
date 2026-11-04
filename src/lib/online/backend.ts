"use client";

import type { Gender } from "@/data/cards";
import type { GameId } from "@/data/games";

/**
 * Couche « en ligne ». Deux implémentations :
 * - Firebase Realtime Database (production)
 * - locale (localStorage + BroadcastChannel) pour tester à deux onglets : ajouter ?backend=local à l'URL
 *
 * L'état du jeu est stocké en JSON (chaîne) : Firebase supprime les valeurs nulles des tableaux.
 */

export interface PlayerInfo {
  uid: string;
  name: string;
  gender: Gender;
  online: boolean;
}

export interface RoomData {
  code: string;
  game: GameId;
  createdAt: number;
  players: { p0?: PlayerInfo; p1?: PlayerInfo };
  stateJson: string;
  /** Données temps réel légères (ex. : niveau de l'eau pendant qu'on verse) */
  live?: string;
}

export type JoinResult = { ok: true; index: 0 | 1 } | { ok: false; reason: "missing" | "full" };

export interface Backend {
  uid(): Promise<string>;
  create(room: RoomData): Promise<void>;
  join(code: string, player: PlayerInfo): Promise<JoinResult>;
  subscribe(code: string, cb: (room: RoomData | null) => void): () => void;
  /** Modifie l'état du jeu de façon atomique */
  transact(code: string, fn: (stateJson: string) => string): Promise<void>;
  setLive(code: string, live: string): void;
  /** Marque le joueur en ligne, et hors ligne s'il perd la connexion */
  presence(code: string, index: 0 | 1): () => void;
  remove(code: string): Promise<void>;
}

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export function newRoomCode() {
  let c = "";
  for (let i = 0; i < 5; i++) c += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return c;
}
export function normalizeCode(input: string) {
  return input
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 5);
}

// ———————————————————— Firebase ————————————————————

const firebaseConfig = {
  apiKey: "AIzaSyAzXkqrhZNPM3N7RrStzV0BkTq8Y-0xYA8",
  authDomain: "wink-games-c024b.firebaseapp.com",
  databaseURL: "https://wink-games-c024b-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "wink-games-c024b",
  storageBucket: "wink-games-c024b.firebasestorage.app",
  messagingSenderId: "909568191660",
  appId: "1:909568191660:web:eb17eab3d378cf17cb4309",
};

async function firebaseBackend(): Promise<Backend> {
  const { initializeApp, getApps } = await import("firebase/app");
  const { getAuth, signInAnonymously, onAuthStateChanged } = await import("firebase/auth");
  const db = await import("firebase/database");

  const app = getApps()[0] ?? initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const database = db.getDatabase(app);

  let uidPromise: Promise<string> | null = null;
  const uid = () =>
    (uidPromise ??= new Promise<string>((resolve, reject) => {
      const off = onAuthStateChanged(auth, (user) => {
        if (user) {
          off();
          resolve(user.uid);
        }
      });
      signInAnonymously(auth).catch((e) => {
        off();
        uidPromise = null;
        reject(e);
      });
    }));

  const roomRef = (code: string) => db.ref(database, `rooms/${code}`);

  return {
    uid,
    async create(room) {
      await uid();
      await db.set(roomRef(room.code), room);
    },
    async join(code, player) {
      await uid();
      const snap = await db.get(roomRef(code));
      if (!snap.exists()) return { ok: false, reason: "missing" };
      let result: JoinResult = { ok: false, reason: "full" };
      await db.runTransaction(roomRef(code), (room: RoomData | null) => {
        if (!room) {
          result = { ok: false, reason: "missing" };
          return room;
        }
        if (room.players.p0?.uid === player.uid) {
          result = { ok: true, index: 0 };
          room.players.p0 = { ...room.players.p0, online: true };
          return room;
        }
        if (room.players.p1?.uid === player.uid || !room.players.p1) {
          result = { ok: true, index: 1 };
          room.players.p1 = player;
          return room;
        }
        result = { ok: false, reason: "full" };
        return undefined;
      });
      return result;
    },
    subscribe(code, cb) {
      return db.onValue(roomRef(code), (snap) => cb(snap.exists() ? (snap.val() as RoomData) : null));
    },
    async transact(code, fn) {
      await db.runTransaction(db.ref(database, `rooms/${code}/stateJson`), (current: string | null) => (current === null ? undefined : fn(current)));
    },
    setLive(code, live) {
      void db.set(db.ref(database, `rooms/${code}/live`), live);
    },
    presence(code, index) {
      const onlineRef = db.ref(database, `rooms/${code}/players/p${index}/online`);
      void db.set(onlineRef, true);
      void db.onDisconnect(onlineRef).set(false);
      return () => {
        void db.set(onlineRef, false);
      };
    },
    async remove(code) {
      await db.remove(roomRef(code));
    },
  };
}

// ———————————————————— Local (tests à deux onglets) ————————————————————

function localBackend(): Backend {
  const channel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("wink-rooms") : null;
  const key = (code: string) => `wink-room-${code}`;
  const read = (code: string): RoomData | null => {
    try {
      const raw = localStorage.getItem(key(code));
      return raw ? (JSON.parse(raw) as RoomData) : null;
    } catch {
      return null;
    }
  };
  const write = (code: string, room: RoomData | null) => {
    if (room) localStorage.setItem(key(code), JSON.stringify(room));
    else localStorage.removeItem(key(code));
    channel?.postMessage(code);
    window.dispatchEvent(new CustomEvent("wink-room", { detail: code }));
  };
  let myUid = sessionStorage.getItem("wink-local-uid");
  if (!myUid) {
    myUid = `local-${Math.random().toString(36).slice(2, 10)}`;
    sessionStorage.setItem("wink-local-uid", myUid);
  }
  const uidValue = myUid;

  return {
    uid: async () => uidValue,
    async create(room) {
      write(room.code, room);
    },
    async join(code, player) {
      const room = read(code);
      if (!room) return { ok: false, reason: "missing" };
      if (room.players.p0?.uid === player.uid) return { ok: true, index: 0 };
      if (room.players.p1?.uid === player.uid || !room.players.p1) {
        room.players.p1 = player;
        write(code, room);
        return { ok: true, index: 1 };
      }
      return { ok: false, reason: "full" };
    },
    subscribe(code, cb) {
      let last = "";
      const emit = () => {
        const raw = localStorage.getItem(key(code)) ?? "";
        if (raw === last) return;
        last = raw;
        cb(read(code));
      };
      const onMsg = (e: MessageEvent) => e.data === code && emit();
      const onLocal = (e: Event) => (e as CustomEvent).detail === code && emit();
      const onStorage = (e: StorageEvent) => e.key === key(code) && emit();
      channel?.addEventListener("message", onMsg);
      window.addEventListener("wink-room", onLocal);
      window.addEventListener("storage", onStorage);
      const poll = setInterval(emit, 400);
      last = "\u0000";
      emit();
      return () => {
        clearInterval(poll);
        channel?.removeEventListener("message", onMsg);
        window.removeEventListener("wink-room", onLocal);
        window.removeEventListener("storage", onStorage);
      };
    },
    async transact(code, fn) {
      const room = read(code);
      if (!room) return;
      room.stateJson = fn(room.stateJson);
      write(code, room);
    },
    setLive(code, live) {
      const room = read(code);
      if (!room) return;
      room.live = live;
      write(code, room);
    },
    presence(code, index) {
      const set = (online: boolean) => {
        const room = read(code);
        const p = room?.players[`p${index}`];
        if (room && p) {
          p.online = online;
          write(code, room);
        }
      };
      set(true);
      const off = () => set(false);
      window.addEventListener("pagehide", off);
      return () => {
        window.removeEventListener("pagehide", off);
        off();
      };
    },
    async remove(code) {
      write(code, null);
    },
  };
}

let backendPromise: Promise<Backend> | null = null;

export function getBackend(): Promise<Backend> {
  if (!backendPromise) {
    let local = false;
    try {
      local = new URLSearchParams(window.location.search).get("backend") === "local" || sessionStorage.getItem("wink-backend") === "local";
      if (local) sessionStorage.setItem("wink-backend", "local");
    } catch {
      /* ignore */
    }
    backendPromise = local ? Promise.resolve(localBackend()) : firebaseBackend();
  }
  return backendPromise;
}
