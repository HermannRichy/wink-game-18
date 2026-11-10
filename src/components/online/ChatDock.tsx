"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { getBackend, type RoomData } from "@/lib/online/backend";
import { decryptText, deriveShared, encryptText, getMyKeys, type MyKeys } from "@/lib/online/chat-crypto";
import { sfx } from "@/lib/sound";

const MAX = 300;
const REACTIONS = ["😏", "🔥", "😂", "😳", "❤️", "😈", "👏"];
const EMOJIS = ["😀", "😁", "🥰", "😍", "😘", "😉", "🤭", "🙈", "😇", "🥵", "🤤", "😌", "🫣", "😬", "🤪", "😅", "🥺", "😢", "😡", "🤩", "💋", "💘", "💕", "🍑", "🍆", "🍷", "🌶️", "💦", "✨", "👀", "🙏", "👍"];

interface Msg {
  id: string;
  from: 0 | 1;
  text: string | null;
  kind: "m" | "r";
  t: number;
}

interface Ctx {
  open: () => void;
  unread: number;
}
const ChatCtx = createContext<Ctx | null>(null);

/** Bouton 💬 affiché dans le cadre du jeu (rien en dehors d'une partie en ligne) */
export function ChatButton() {
  const c = useContext(ChatCtx);
  if (!c) return null;
  return (
    <button
      type="button"
      aria-label={c.unread ? `Ouvrir le chat, ${c.unread} nouveau(x) message(s)` : "Ouvrir le chat"}
      onClick={c.open}
      className="brutal-sm press relative flex h-9 shrink-0 items-center gap-1 rounded-full bg-pop px-3 text-xs font-extrabold"
    >
      💬 CHAT
      {c.unread > 0 && (
        <span className="absolute -right-1.5 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-ink bg-passion px-1 text-[11px] font-black">{c.unread}</span>
      )}
    </button>
  );
}

export function ChatProvider({ room, me, names, children }: { room: RoomData; me: 0 | 1; names: [string, string]; children: ReactNode }) {
  const code = room.code;
  const partner = (1 - me) as 0 | 1;
  const myPubInRoom = room.keys?.[`p${me}`];
  const partnerPub = room.keys?.[`p${partner}`];

  const [mine, setMine] = useState<MyKeys | null>(null);
  const [shared, setShared] = useState<CryptoKey | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState(0);
  const [float, setFloat] = useState<{ id: number; emoji: string } | null>(null);
  const firstLoad = useRef(true);
  const known = useRef(new Set<string>());

  // 1. Ma paire de clés, publiée dans le salon (seule la clé publique)
  useEffect(() => {
    let live = true;
    getMyKeys(code, me).then((k) => live && setMine(k));
    return () => {
      live = false;
    };
  }, [code, me]);
  useEffect(() => {
    if (mine && myPubInRoom !== mine.pub) void getBackend().then((b) => b.setChatKey(code, me, mine.pub));
  }, [mine, myPubInRoom, code, me]);

  // 2. Secret commun, calculé sur ce téléphone
  useEffect(() => {
    if (!mine || !partnerPub) {
      setShared(null);
      return;
    }
    let live = true;
    deriveShared(mine.priv, partnerPub)
      .then((k) => live && setShared(k))
      .catch(() => live && setShared(null));
    return () => {
      live = false;
    };
  }, [mine, partnerPub]);

  // 3. Déchiffrement des messages reçus
  const chat = room.chat;
  useEffect(() => {
    if (!shared) return;
    let live = true;
    const entries = Object.entries(chat ?? {})
      .sort(([, a], [, b]) => a.t - b.t)
      .slice(-100);
    Promise.all(
      entries.map(async ([id, m]) => {
        const plain = await decryptText(shared, m.iv, m.ct);
        let kind: "m" | "r" = "m";
        let text: string | null = plain;
        if (plain) {
          try {
            const p = JSON.parse(plain) as { k: "m" | "r"; x: string };
            kind = p.k === "r" ? "r" : "m";
            text = String(p.x).slice(0, MAX);
          } catch {
            text = null;
          }
        }
        return { id, from: m.f, text, kind, t: m.t } satisfies Msg;
      }),
    ).then((list) => {
      if (!live) return;
      setMsgs(list);
      if (firstLoad.current) {
        firstLoad.current = false;
        list.forEach((m) => known.current.add(m.id));
        return;
      }
      const fresh = list.filter((m) => !known.current.has(m.id));
      fresh.forEach((m) => known.current.add(m.id));
      const incoming = fresh.filter((m) => m.from !== me);
      if (incoming.length) {
        sfx.sparkle();
        const r = [...incoming].reverse().find((m) => m.kind === "r" && m.text);
        if (r) setFloat({ id: Date.now(), emoji: r.text! });
      }
    });
    return () => {
      live = false;
    };
  }, [chat, shared, me]);

  useEffect(() => {
    if (!float) return;
    const t = setTimeout(() => setFloat(null), 2200);
    return () => clearTimeout(t);
  }, [float]);

  const unread = open ? 0 : msgs.filter((m) => m.from !== me && m.kind === "m" && m.t > seen).length;
  const openPanel = useCallback(() => {
    setOpen(true);
    setSeen(Date.now() + 5000);
  }, []);

  const send = useCallback(
    async (kind: "m" | "r", text: string) => {
      const x = text.trim().slice(0, MAX);
      if (!x || !shared) return;
      const { iv, ct } = await encryptText(shared, JSON.stringify({ k: kind, x }));
      const b = await getBackend();
      await b.sendChat(code, { f: me, iv, ct, t: Date.now() });
    },
    [shared, code, me],
  );

  const ctx = useMemo(() => ({ open: openPanel, unread }), [openPanel, unread]);

  return (
    <ChatCtx.Provider value={ctx}>
      {children}
      {float && (
        <div key={float.id} aria-hidden className="pointer-events-none fixed inset-x-0 bottom-24 z-40 flex justify-center">
          <span className="float-up text-[72px]">{float.emoji}</span>
        </div>
      )}
      {open && <ChatPanel msgs={msgs} me={me} partnerName={names[partner]} ready={!!shared} onSend={send} onClose={() => setOpen(false)} />}
    </ChatCtx.Provider>
  );
}

function ChatPanel({
  msgs,
  me,
  partnerName,
  ready,
  onSend,
  onClose,
}: {
  msgs: Msg[];
  me: 0 | 1;
  partnerName: string;
  ready: boolean;
  onSend: (kind: "m" | "r", text: string) => Promise<void>;
  onClose: () => void;
}) {
  const [text, setText] = useState("");
  const [emojis, setEmojis] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [msgs.length]);

  function submit() {
    if (!text.trim() || !ready) return;
    sfx.click();
    void onSend("m", text);
    setText("");
    setEmojis(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40" onClick={onClose}>
      <section
        role="dialog"
        aria-label="Chat"
        onClick={(e) => e.stopPropagation()}
        className="flex h-[78dvh] w-full max-w-md flex-col gap-3 rounded-t-[28px] border-[3px] border-b-0 border-ink bg-cream p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
      >
        <header className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-xl font-black">Chat avec {partnerName}</span>
            <span className="text-[11px] font-bold">🔒 Chiffré de bout en bout · effacé à la fin de la partie</span>
          </div>
          <button type="button" aria-label="Fermer le chat" onClick={onClose} className="brutal-sm press h-10 w-10 rounded-xl bg-pop text-lg font-black">
            ✕
          </button>
        </header>

        <div className="flex flex-1 flex-col gap-2 overflow-y-auto rounded-2xl border-[3px] border-ink bg-white/60 p-3">
          {!ready && <p className="m-auto text-center text-sm font-bold">🔐 Sécurisation de la conversation…</p>}
          {ready && msgs.length === 0 && <p className="m-auto text-center text-sm font-semibold">Dis quelque chose de gentil 😏</p>}
          {msgs.map((m) =>
            m.kind === "r" && m.text ? (
              <div key={m.id} className={`flex ${m.from === me ? "justify-end" : "justify-start"}`}>
                <span className="text-[40px] leading-none">{m.text}</span>
              </div>
            ) : (
              <div key={m.id} className={`flex ${m.from === me ? "justify-end" : "justify-start"}`}>
                <span
                  className={`max-w-[80%] whitespace-pre-wrap break-words rounded-2xl border-[2.5px] border-ink px-3 py-2 text-[15px] font-semibold ${
                    m.from === me ? "bg-candy" : "bg-flame"
                  }`}
                >
                  {m.text ?? "🔒 Message illisible"}
                </span>
              </div>
            ),
          )}
          <div ref={end} />
        </div>

        <div className="flex justify-between gap-1" role="group" aria-label="Réactions rapides">
          {REACTIONS.map((r) => (
            <button
              key={r}
              type="button"
              disabled={!ready}
              aria-label={`Envoyer ${r}`}
              onClick={() => {
                sfx.click();
                void onSend("r", r);
              }}
              className="brutal-sm press flex h-11 w-11 items-center justify-center rounded-xl bg-cream text-[22px] disabled:opacity-50"
            >
              {r}
            </button>
          ))}
        </div>

        {emojis && (
          <div className="grid grid-cols-8 gap-1 rounded-2xl border-[3px] border-ink bg-white/60 p-2">
            {EMOJIS.map((e) => (
              <button key={e} type="button" aria-label={e} onClick={() => setText((t) => (t + e).slice(0, MAX))} className="h-9 text-[22px]">
                {e}
              </button>
            ))}
          </div>
        )}

        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <button type="button" aria-label="Emojis" aria-pressed={emojis} onClick={() => setEmojis((v) => !v)} className={`brutal-sm press h-12 w-12 shrink-0 rounded-2xl text-xl ${emojis ? "bg-pop" : "bg-cream"}`}>
            😊
          </button>
          <input
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, MAX))}
            placeholder="Ton message…"
            maxLength={MAX}
            autoComplete="off"
            className="min-w-0 flex-1 rounded-2xl border-[3px] border-ink bg-white px-3 text-base font-semibold"
          />
          <button type="submit" disabled={!ready || !text.trim()} className="brutal-sm press h-12 shrink-0 rounded-2xl bg-passion px-4 text-base font-extrabold disabled:opacity-50">
            OK
          </button>
        </form>
      </section>
    </div>
  );
}
