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

/** Message chiffré : le serveur ne voit que du texte illisible */
export interface ChatMsg {
  f: 0 | 1;
  iv: string;
  ct: string;
  t: number;
}

export interface RoomData {
  code: string;
  game: GameId;
  createdAt: number;
  players: { p0?: PlayerInfo; p1?: PlayerInfo };
  stateJson: string;
  /** Données temps réel légères (ex. : niveau de l'eau pendant qu'on verse) */
  live?: string;
  /** Clés publiques du chat (JWK en JSON) */
  keys?: { p0?: string; p1?: string };
  chat?: Record<string, ChatMsg>;
  /** « écrit… » : valeur qui change à chaque frappe (aucun contenu) */
  typing?: { p0?: number; p1?: number };
  /** Un joueur est parti faire un défi hors de l'app (vocal, appel vidéo…) */
  away?: { p0?: number; p1?: number };
  /** Dernier message de l'autre vu par ce joueur (horodatage du message) */
  seen?: { p0?: number; p1?: number };
  /** Questions et défis déjà vus par chaque joueur (anti-répétition commune aux deux téléphones) */
  history?: { p0?: string; p1?: string };
}

export type JoinResult =
  { ok: true; index: 0 | 1 } | { ok: false; reason: "missing" | "full" };

export interface Backend {
  uid(): Promise<string>;
  create(room: RoomData): Promise<void>;
  join(code: string, player: PlayerInfo): Promise<JoinResult>;
  subscribe(code: string, cb: (room: RoomData | null) => void): () => void;
  /** Modifie l'état du jeu de façon atomique */
  transact(code: string, fn: (stateJson: string) => string): Promise<void>;
  setLive(code: string, live: string): void;
  setChatKey(code: string, index: 0 | 1, pub: string): Promise<void>;
  sendChat(code: string, msg: ChatMsg): Promise<void>;
  setTyping(code: string, index: 0 | 1): void;
  setAway(code: string, index: 0 | 1, away: boolean): void;
  setSeen(code: string, index: 0 | 1, t: number): void;
  setHistory(code: string, index: 0 | 1, json: string): void;
  /** Marque le joueur en ligne, et hors ligne s'il perd la connexion */
  presence(code: string, index: 0 | 1): () => void;
  remove(code: string): Promise<void>;
  /** État de la connexion au serveur */
  connection(cb: (connected: boolean) => void): () => void;
  /** Statistiques anonymes : +1 sur un compteur (jour/semaine/mois), jamais de données perso */
  bump(period: string, name: string): Promise<void>;
  /** Admin : connexion Google, renvoie l'e-mail */
  adminLogin(): Promise<string>;
  /** Admin : lecture de tous les compteurs */
  readStats(): Promise<Stats>;
  /** Admin : date de création (ms) de chaque compte anonyme, lue dans Firebase Authentication */
  readAnonUsers(): Promise<number[]>;
  /** Modifications des contenus (questions, défis…), lisibles par tous */
  readContent(): Promise<Record<string, Record<string, Record<string, unknown>>>>;
  /** Admin : écrit (ou supprime avec null) la modification d'un contenu */
  writeContent(col: string, id: string, value: Record<string, unknown> | null): Promise<void>;
}

/** { "2026-11-13": { active: 12, … }, "2026-W46": {…}, "2026-11": {…} } */
export type Stats = Record<string, Record<string, number>>;

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export function newRoomCode() {
  let c = "";
  for (let i = 0; i < 5; i++)
    c += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
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
  databaseURL:
    "https://wink-games-c024b-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "wink-games-c024b",
  storageBucket: "wink-games-c024b.firebasestorage.app",
  messagingSenderId: "909568191660",
  appId: "1:909568191660:web:eb17eab3d378cf17cb4309",
};

async function firebaseBackend(): Promise<Backend> {
  const { initializeApp, getApps } = await import("firebase/app");
  const { getAuth, signInAnonymously, onAuthStateChanged, GoogleAuthProvider, signInWithPopup } =
    await import("firebase/auth");
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
      signInAnonymously(auth)
        .catch((e) => {
          off();
          uidPromise = null;
          reject(e);
        });
    }));

  let adminToken: string | null = null;
  const roomRef = (code: string) => db.ref(database, `rooms/${code}`);

  async function bump(period: string, name: string) {
    try {
      await db.update(db.ref(database, `stats/${period}`), { [name]: db.increment(1) });
    } catch {
      /* les statistiques ne doivent jamais gêner */
    }
  }

  /** Attend que la connexion à Firebase soit rétablie (retour d'une autre appli, réseau qui revient) */
  const whenConnected = () =>
    new Promise<void>((resolve) => {
      let off: () => void = () => {};
      const done = () => {
        off();
        clearTimeout(timer);
        resolve();
      };
      const timer = setTimeout(done, 7000);
      off = db.onValue(db.ref(database, ".info/connected"), (snap) => {
        if (snap.val() === true) done();
      });
    });

  /** Réessaie 3 fois avant de baisser les bras : une reconnexion prend souvent quelques secondes */
  async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
    for (let i = 0; ; i++) {
      try {
        await whenConnected();
        return await fn();
      } catch (e) {
        if (i >= 2) throw e;
        await new Promise((r) => setTimeout(r, 1200 * (i + 1)));
      }
    }
  }

  async function joinOnce(
    code: string,
    player: PlayerInfo,
  ): Promise<JoinResult> {
    await uid();
    // Lecture ciblée (players seulement) et écritures ciblées : réécrire toute la salle
    // est refusé par les règles dès qu'il existe des messages de chat.
    const pSnap = await db.get(db.ref(database, `rooms/${code}/players`));
    if (!pSnap.exists()) return { ok: false, reason: "missing" };
    const players = pSnap.val() as RoomData["players"];
    if (players.p0?.uid === player.uid) {
      await db.set(db.ref(database, `rooms/${code}/players/p0/online`), true);
      return { ok: true, index: 0 };
    }
    if (players.p1?.uid === player.uid) {
      await db.set(db.ref(database, `rooms/${code}/players/p1`), player);
      return { ok: true, index: 1 };
    }
    if (players.p1) return { ok: false, reason: "full" };
    let result: JoinResult = { ok: false, reason: "full" };
    await db.runTransaction(
      db.ref(database, `rooms/${code}/players/p1`),
      (cur: PlayerInfo | null) => {
        if (cur && cur.uid !== player.uid) {
          result = { ok: false, reason: "full" };
          return undefined;
        }
        result = { ok: true, index: 1 };
        return player;
      },
    );
    return result;
  }

  return {
    uid,
    create(room) {
      return withRetry(async () => {
        await uid();
        await db.set(roomRef(room.code), room);
      });
    },
    join(code, player) {
      return withRetry(() => joinOnce(code, player));
    },
    subscribe(code, cb) {
      return db.onValue(roomRef(code), (snap) =>
        cb(snap.exists() ? (snap.val() as RoomData) : null),
      );
    },
    async transact(code, fn) {
      await db.runTransaction(
        db.ref(database, `rooms/${code}/stateJson`),
        (current: string | null) =>
          current === null ? undefined : fn(current),
      );
    },
    setLive(code, live) {
      void db.set(db.ref(database, `rooms/${code}/live`), live);
    },
    async setChatKey(code, index, pub) {
      await db.set(db.ref(database, `rooms/${code}/keys/p${index}`), pub);
    },
    async sendChat(code, msg) {
      await db.push(db.ref(database, `rooms/${code}/chat`), msg);
    },
    setAway(code, index, away) {
      const r = db.ref(database, `rooms/${code}/away/p${index}`);
      void (away ? db.set(r, Date.now()) : db.remove(r));
    },
    setTyping(code, index) {
      void db.set(db.ref(database, `rooms/${code}/typing/p${index}`), Date.now());
    },
    setSeen(code, index, t) {
      void db.set(db.ref(database, `rooms/${code}/seen/p${index}`), t);
    },
    setHistory(code, index, json) {
      void db.set(db.ref(database, `rooms/${code}/history/p${index}`), json).catch(() => {});
    },
    presence(code, index) {
      const onlineRef = db.ref(
        database,
        `rooms/${code}/players/p${index}/online`,
      );
      // À chaque (re)connexion : on se remet « en ligne » et on réarme la détection de coupure
      const stopConn = db.onValue(
        db.ref(database, ".info/connected"),
        (snap) => {
          if (snap.val() === true) {
            void db.onDisconnect(onlineRef).set(false);
            void db.set(onlineRef, true);
          }
        },
      );
      // Retour de l'app au premier plan
      const onVisible = () => {
        if (document.visibilityState === "visible")
          void db.set(onlineRef, true);
      };
      document.addEventListener("visibilitychange", onVisible);
      return () => {
        stopConn();
        document.removeEventListener("visibilitychange", onVisible);
        void db.set(onlineRef, false);
      };
    },
    async remove(code) {
      await db.remove(roomRef(code));
    },
    connection(cb) {
      return db.onValue(db.ref(database, ".info/connected"), (snap) => cb(snap.val() === true));
    },
    bump,
    async adminLogin() {
      const provider = new GoogleAuthProvider();
      // Permet de lister les comptes (Identity Toolkit) : réservé aux propriétaires du projet
      provider.addScope("https://www.googleapis.com/auth/cloud-platform");
      const cred = await signInWithPopup(auth, provider);
      adminToken = GoogleAuthProvider.credentialFromResult(cred)?.accessToken ?? null;
      return cred.user.email ?? "";
    },
    async readAnonUsers() {
      if (!adminToken) throw new Error("no-token");
      const out: number[] = [];
      let page = "";
      do {
        const res = await fetch(
          `https://identitytoolkit.googleapis.com/v1/projects/${firebaseConfig.projectId}/accounts:batchGet?maxResults=1000${page ? `&nextPageToken=${encodeURIComponent(page)}` : ""}`,
          { headers: { Authorization: `Bearer ${adminToken}` } },
        );
        if (!res.ok) throw new Error(`users-${res.status}`);
        const j = (await res.json()) as {
          users?: { createdAt?: string; providerUserInfo?: unknown[] }[];
          nextPageToken?: string;
        };
        for (const u of j.users ?? []) {
          if (!u.providerUserInfo?.length && u.createdAt) out.push(Number(u.createdAt));
        }
        page = j.nextPageToken ?? "";
      } while (page);
      return out;
    },
    async readStats() {
      const snap = await db.get(db.ref(database, "stats"));
      return (snap.val() ?? {}) as Stats;
    },
    async readContent() {
      const snap = await db.get(db.ref(database, "content"));
      return snap.val() ?? {};
    },
    async writeContent(col, id, value) {
      await db.set(db.ref(database, `content/${col}/${id}`), value);
    },
  };
}

/** Clés de période (UTC) : jour, semaine ISO, mois */
export function periodKeys(d = new Date()) {
  const day = d.toISOString().slice(0, 10);
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dow = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - dow);
  const yStart = Date.UTC(t.getUTCFullYear(), 0, 1);
  const wk = Math.ceil(((t.getTime() - yStart) / 86400000 + 1) / 7);
  return { day, week: `${t.getUTCFullYear()}-W${String(wk).padStart(2, "0")}`, month: day.slice(0, 7) };
}

// ———————————————————— Local (tests à deux onglets) ————————————————————

function localBackend(): Backend {
  const channel =
    typeof BroadcastChannel !== "undefined"
      ? new BroadcastChannel("wink-rooms")
      : null;
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
      const onLocal = (e: Event) =>
        (e as CustomEvent).detail === code && emit();
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
    async setChatKey(code, index, pub) {
      const room = read(code);
      if (!room) return;
      room.keys = { ...room.keys, [`p${index}`]: pub };
      write(code, room);
    },
    setAway(code, index, away) {
      const room = read(code);
      if (!room) return;
      const next = { ...room.away } as Record<string, number | undefined>;
      if (away) next[`p${index}`] = Date.now();
      else delete next[`p${index}`];
      room.away = next;
      write(code, room);
    },
    setTyping(code, index) {
      const room = read(code);
      if (!room) return;
      room.typing = { ...room.typing, [`p${index}`]: Date.now() };
      write(code, room);
    },
    setHistory(code, index, json) {
      const room = read(code);
      if (!room) return;
      room.history = { ...room.history, [`p${index}`]: json };
      write(code, room);
    },
    setSeen(code, index, t) {
      const room = read(code);
      if (!room) return;
      room.seen = { ...room.seen, [`p${index}`]: t };
      write(code, room);
    },
    async sendChat(code, msg) {
      const room = read(code);
      if (!room) return;
      room.chat = {
        ...room.chat,
        [`${msg.t}-${Math.random().toString(36).slice(2, 8)}`]: msg,
      };
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
      const onVisible = () => {
        if (document.visibilityState === "visible") set(true);
      };
      window.addEventListener("pagehide", off);
      document.addEventListener("visibilitychange", onVisible);
      return () => {
        window.removeEventListener("pagehide", off);
        document.removeEventListener("visibilitychange", onVisible);
        off();
      };
    },
    async remove(code) {
      write(code, null);
    },
    async bump(period, name) {
      try {
        const st = JSON.parse(localStorage.getItem("wink-stats") ?? "{}") as Stats;
        st[period] = { ...st[period], [name]: (st[period]?.[name] ?? 0) + 1 };
        localStorage.setItem("wink-stats", JSON.stringify(st));
      } catch {
        /* ignore */
      }
    },
    async adminLogin() {
      return "admin@local";
    },
    async readAnonUsers() {
      const now = Date.now();
      return [now - 3 * 86400000, now - 2 * 86400000, now - 2 * 86400000, now - 86400000, now];
    },
    async readStats() {
      try {
        return JSON.parse(localStorage.getItem("wink-stats") ?? "{}") as Stats;
      } catch {
        return {};
      }
    },
    async readContent() {
      try {
        return JSON.parse(localStorage.getItem("wink-content-remote") ?? "{}");
      } catch {
        return {};
      }
    },
    async writeContent(col, id, value) {
      const all = JSON.parse(localStorage.getItem("wink-content-remote") ?? "{}");
      all[col] = { ...all[col] };
      if (value === null) delete all[col][id];
      else all[col][id] = value;
      localStorage.setItem("wink-content-remote", JSON.stringify(all));
    },
    connection(cb) {
      cb(true);
      return () => {};
    },
  };
}

let backendPromise: Promise<Backend> | null = null;

export function getBackend(): Promise<Backend> {
  if (!backendPromise) {
    let local = false;
    try {
      local =
        new URLSearchParams(window.location.search).get("backend") ===
          "local" || sessionStorage.getItem("wink-backend") === "local";
      if (local) sessionStorage.setItem("wink-backend", "local");
    } catch {
      /* ignore */
    }
    backendPromise = local
      ? Promise.resolve(localBackend())
      : firebaseBackend();
  }
  return backendPromise;
}
