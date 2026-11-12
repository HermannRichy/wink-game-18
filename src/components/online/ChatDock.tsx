"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { CHAT_CHALLENGES_DISTANCE, CHAT_CHALLENGES_DUO } from "@/data/chat-challenges";
import { getBackend, type RoomData } from "@/lib/online/backend";
import { decryptText, deriveShared, encryptText, getMyKeys, type MyKeys } from "@/lib/online/chat-crypto";
import { sfx } from "@/lib/sound";
import { Icon, Spinner } from "@/components/ui";

const MAX = 300;
const REACTIONS = ["😏", "🔥", "😂", "😳", "❤️", "😈", "👏"];
const EMOJIS = ["😀", "😁", "🥰", "😍", "😘", "😉", "🤭", "🙈", "😇", "🥵", "🤤", "😌", "🫣", "😬", "🤪", "😅", "🥺", "😢", "😡", "🤩", "💋", "💘", "💕", "🍑", "🍆", "🍷", "🌶️", "💦", "✨", "👀", "🙏", "👍"];
const MSG_REACTIONS = ["❤️", "😂", "🔥", "😳", "👍"];

/** m : message · c : défi · r : réaction flottante · e : réaction à un message */
type Kind = "m" | "c" | "r" | "e";

interface Quote {
  id: string;
  text: string;
  from: 0 | 1;
}
interface Msg {
  id: string;
  from: 0 | 1;
  text: string | null;
  kind: Kind;
  t: number;
  q?: Quote;
  to?: string;
}
interface Pending {
  id: string;
  text: string;
  kind: "m" | "c";
  q?: Quote;
  status: "sending" | "failed";
}
interface Preview {
  id: number;
  name: string;
  text: string;
}

interface Ctx {
  open: () => void;
  unread: number;
}
const ChatCtx = createContext<Ctx | null>(null);

/** Bouton « chat » affiché dans le cadre du jeu (rien en dehors d'une partie en ligne) */
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
      <Icon name="chat" size={18} /> CHAT
      {c.unread > 0 && (
        <span className="absolute -right-1.5 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-ink bg-passion px-1 text-[11px] font-black">{c.unread}</span>
      )}
    </button>
  );
}

export function ChatProvider({ room, me, names, distance, children }: { room: RoomData; me: 0 | 1; names: [string, string]; distance: boolean; children: ReactNode }) {
  const code = room.code;
  const partner = (1 - me) as 0 | 1;
  const myPubInRoom = room.keys?.[`p${me}`];
  const partnerPub = room.keys?.[`p${partner}`];
  const partnerTyping = room.typing?.[`p${partner}`];
  const partnerSeen = room.seen?.[`p${partner}`] ?? 0;

  const [mine, setMine] = useState<MyKeys | null>(null);
  const [shared, setShared] = useState<CryptoKey | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [open, setOpen] = useState(false);
  const [read, setRead] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState<Pending[]>([]);
  const [float, setFloat] = useState<{ id: number; emoji: string } | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [typingNow, setTypingNow] = useState(false);
  const firstLoad = useRef(true);
  const known = useRef(new Set<string>());
  const openRef = useRef(open);
  openRef.current = open;

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
      .slice(-200);
    Promise.all(
      entries.map(async ([id, m]) => {
        const plain = await decryptText(shared, m.iv, m.ct);
        let kind: Kind = "m";
        let text: string | null = plain;
        let q: Quote | undefined;
        let to: string | undefined;
        if (plain) {
          try {
            const p = JSON.parse(plain) as { k: Kind; x: string; q?: Quote; to?: string };
            kind = p.k === "r" || p.k === "c" || p.k === "e" ? p.k : "m";
            text = String(p.x).slice(0, MAX);
            if (p.q) q = { id: String(p.q.id), text: String(p.q.text).slice(0, 80), from: p.q.from === 1 ? 1 : 0 };
            if (p.to) to = String(p.to);
          } catch {
            text = null;
          }
        }
        return { id, from: m.f, text, kind, t: m.t, q, to } satisfies Msg;
      }),
    ).then((list) => {
      if (!live) return;
      setMsgs(list);
      if (firstLoad.current) {
        firstLoad.current = false;
        list.forEach((m) => known.current.add(m.id));
        // Ce qui était déjà là à l'ouverture de l'app compte comme lu
        setRead((r) => new Set([...r, ...list.map((m) => m.id)]));
        return;
      }
      const fresh = list.filter((m) => !known.current.has(m.id));
      fresh.forEach((m) => known.current.add(m.id));
      const incoming = fresh.filter((m) => m.from !== me);
      if (!incoming.length) return;
      sfx.sparkle();
      const r = [...incoming].reverse().find((m) => m.kind === "r" && m.text);
      if (r) setFloat({ id: Date.now(), emoji: r.text! });
      const last = [...incoming].reverse().find((m) => (m.kind === "m" || m.kind === "c") && m.text);
      if (last && !openRef.current) setPreview({ id: Date.now(), name: names[last.from], text: last.text! });
    });
    return () => {
      live = false;
    };
  }, [chat, shared, me, names]);

  useEffect(() => {
    if (!float) return;
    const t = setTimeout(() => setFloat(null), 2200);
    return () => clearTimeout(t);
  }, [float]);
  useEffect(() => {
    if (!preview) return;
    const t = setTimeout(() => setPreview(null), 4500);
    return () => clearTimeout(t);
  }, [preview]);

  // « écrit… » : on réagit au changement de valeur (pas à l'horloge de l'autre téléphone)
  useEffect(() => {
    if (!partnerTyping) return;
    setTypingNow(true);
    const t = setTimeout(() => setTypingNow(false), 4000);
    return () => clearTimeout(t);
  }, [partnerTyping]);

  // Lu / vu : les messages de l'autre sont lus quand le chat est ouvert
  const visible = useMemo(() => msgs.filter((m) => m.kind === "m" || m.kind === "c"), [msgs]);
  useEffect(() => {
    if (!open) return;
    const unreadIds = visible.filter((m) => m.from !== me && !read.has(m.id)).map((m) => m.id);
    if (unreadIds.length) setRead((r) => new Set([...r, ...unreadIds]));
    const theirs = visible.filter((m) => m.from !== me);
    const latest = theirs.length ? Math.max(...theirs.map((m) => m.t)) : 0;
    if (latest) void getBackend().then((b) => b.setSeen(code, me, latest));
  }, [open, visible, read, me, code]);

  const unread = open ? 0 : visible.filter((m) => m.from !== me && !read.has(m.id)).length;
  const openPanel = useCallback(() => {
    setOpen(true);
    setPreview(null);
  }, []);

  const send = useCallback(
    async (payload: { k: "m" | "c" | "r" | "e"; x: string; q?: Quote; to?: string }, retryId?: string) => {
      const x = payload.x.trim().slice(0, MAX);
      if (!x || !shared) return;
      const pid = retryId ?? `p${Date.now()}${Math.random().toString(36).slice(2, 6)}`;
      const showPending = payload.k === "m" || payload.k === "c";
      if (showPending) {
        setPending((list) =>
          list.some((i) => i.id === pid)
            ? list.map((i) => (i.id === pid ? { ...i, status: "sending" } : i))
            : [...list, { id: pid, text: x, kind: payload.k as "m" | "c", q: payload.q, status: "sending" }],
        );
      }
      try {
        const { iv, ct } = await encryptText(shared, JSON.stringify({ ...payload, x }));
        const b = await getBackend();
        await b.sendChat(code, { f: me, iv, ct, t: Date.now() });
        setPending((list) => list.filter((i) => i.id !== pid));
      } catch {
        setPending((list) => list.map((i) => (i.id === pid ? { ...i, status: "failed" } : i)));
      }
    },
    [shared, code, me],
  );
  const retry = useCallback(
    (id: string) => {
      const p = pending.find((i) => i.id === id);
      if (p) void send({ k: p.kind, x: p.text, q: p.q }, id);
    },
    [pending, send],
  );

  const lastTypingSent = useRef(0);
  const onTyping = useCallback(() => {
    const now = Date.now();
    if (now - lastTypingSent.current < 2500) return;
    lastTypingSent.current = now;
    void getBackend().then((b) => b.setTyping(code, me));
  }, [code, me]);

  const ctx = useMemo(() => ({ open: openPanel, unread }), [openPanel, unread]);

  return (
    <ChatCtx.Provider value={ctx}>
      {children}
      {float && (
        <div key={float.id} aria-hidden className="pointer-events-none fixed inset-x-0 bottom-24 z-40 flex justify-center">
          <span className="float-up text-[72px]">{float.emoji}</span>
        </div>
      )}
      {preview && !open && (
        <button
          key={preview.id}
          type="button"
          onClick={openPanel}
          className="pop-in brutal-sm fixed inset-x-3 top-20 z-40 mx-auto flex max-w-md flex-col items-start gap-0.5 rounded-2xl bg-pop p-3 text-left"
        >
          <span className="text-xs font-extrabold">💬 {preview.name}</span>
          <span className="line-clamp-2 text-sm font-semibold">{preview.text}</span>
        </button>
      )}
      {open && (
        <ChatPanel
          msgs={msgs}
          pending={pending}
          me={me}
          names={names}
          distance={distance}
          partnerSeen={partnerSeen}
          partnerTyping={typingNow}
          ready={!!shared}
          onSend={send}
          onRetry={retry}
          onTyping={onTyping}
          onClose={() => setOpen(false)}
        />
      )}
    </ChatCtx.Provider>
  );
}

function ChatPanel({
  msgs,
  pending,
  me,
  names,
  distance,
  partnerSeen,
  partnerTyping,
  ready,
  onSend,
  onRetry,
  onTyping,
  onClose,
}: {
  msgs: Msg[];
  pending: Pending[];
  me: 0 | 1;
  names: [string, string];
  distance: boolean;
  partnerSeen: number;
  partnerTyping: boolean;
  ready: boolean;
  onSend: (payload: { k: "m" | "c" | "r" | "e"; x: string; q?: Quote; to?: string }, retryId?: string) => Promise<void>;
  onRetry: (id: string) => void;
  onTyping: () => void;
  onClose: () => void;
}) {
  const [text, setText] = useState("");
  const [emojis, setEmojis] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<Quote | null>(null);
  const end = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);

  const bubbles = msgs.filter((m) => m.kind === "m" || m.kind === "c");
  const reactionsOf = (id: string) => {
    const out = new Map<string, number>();
    msgs.filter((m) => m.kind === "e" && m.to === id && m.text).forEach((m) => out.set(m.text!, (out.get(m.text!) ?? 0) + 1));
    return [...out.entries()];
  };
  const lastMine = [...bubbles].reverse().find((m) => m.from === me);

  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [msgs.length, pending.length, partnerTyping]);

  function submit() {
    if (!text.trim() || !ready) return;
    sfx.click();
    void onSend({ k: "m", x: text, q: replyTo ?? undefined });
    setText("");
    setEmojis(false);
    setReplyTo(null);
  }

  function sendChallenge() {
    const list = distance ? CHAT_CHALLENGES_DISTANCE : CHAT_CHALLENGES_DUO;
    sfx.go();
    void onSend({ k: "c", x: list[Math.floor(Math.random() * list.length)] });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40" onClick={onClose}>
      <section
        role="dialog"
        aria-label="Chat"
        onClick={(e) => e.stopPropagation()}
        className="flex h-[78dvh] w-full max-w-md flex-col gap-3 rounded-t-[28px] border-[3px] border-b-0 border-ink bg-cream p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
      >
        <header className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-xl font-black">Chat avec {names[(1 - me) as 0 | 1]}</span>
            <span className="text-[11px] font-bold">🔒 Chiffré de bout en bout · effacé quand la partie est terminée</span>
          </div>
          <button
            type="button"
            aria-label="Envoyer un défi rapide"
            disabled={!ready}
            onClick={sendChallenge}
            className="brutal-sm press flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-flame px-2.5 text-xs font-extrabold disabled:opacity-50"
          >
            <Icon name="dice" size={18} /> DÉFI
          </button>
          <button type="button" aria-label="Fermer le chat" onClick={onClose} className="brutal-sm press h-10 w-10 shrink-0 rounded-xl bg-pop text-lg font-black">
            ✕
          </button>
        </header>

        <div className="flex flex-1 flex-col gap-2.5 overflow-y-auto rounded-2xl border-[3px] border-ink bg-white/60 p-3">
          {!ready && (
            <p className="m-auto flex items-center gap-2.5 text-center text-sm font-bold">
              <Spinner /> Sécurisation de la conversation…
            </p>
          )}
          {ready && bubbles.length === 0 && pending.length === 0 && <p className="m-auto text-center text-sm font-semibold">Dis quelque chose de gentil 😏</p>}

          {msgs.map((m) => {
            if (m.kind === "r" && m.text) {
              return (
                <div key={m.id} className={`flex ${m.from === me ? "justify-end" : "justify-start"}`}>
                  <span className="text-[40px] leading-none">{m.text}</span>
                </div>
              );
            }
            if (m.kind !== "m" && m.kind !== "c") return null;
            const mineMsg = m.from === me;
            const rx = reactionsOf(m.id);
            const isSel = selected === m.id;
            return (
              <div key={m.id} className={`flex flex-col gap-1 ${mineMsg ? "items-end" : "items-start"}`}>
                <button
                  type="button"
                  aria-label="Répondre ou réagir à ce message"
                  aria-expanded={isSel}
                  onClick={() => setSelected(isSel ? null : m.id)}
                  className={`max-w-[82%] whitespace-pre-wrap break-words rounded-2xl border-[2.5px] border-ink px-3 py-2 text-left text-[15px] font-semibold ${
                    m.kind === "c" ? "bg-pop" : mineMsg ? "bg-candy" : "bg-flame"
                  }`}
                >
                  {m.kind === "c" && <span className="mb-1 flex items-center gap-1 text-[11px] font-black tracking-wide">🎲 DÉFI</span>}
                  {m.q && (
                    <span className="mb-1.5 block rounded-lg border-l-4 border-ink bg-ink/10 px-2 py-1 text-xs font-semibold">
                      <span className="block font-extrabold">{names[m.q.from]}</span>
                      <span className="line-clamp-2">{m.q.text}</span>
                    </span>
                  )}
                  {m.text ?? "🔒 Message illisible"}
                </button>
                {rx.length > 0 && (
                  <span className="-mt-2 flex gap-1">
                    {rx.map(([e, n]) => (
                      <span key={e} className="rounded-full border-2 border-ink bg-cream px-1.5 text-sm font-bold">
                        {e}
                        {n > 1 ? ` ${n}` : ""}
                      </span>
                    ))}
                  </span>
                )}
                {isSel && m.text && (
                  <span className="brutal-sm flex flex-wrap items-center gap-1 rounded-2xl bg-cream p-1.5">
                    {MSG_REACTIONS.map((e) => (
                      <button
                        key={e}
                        type="button"
                        aria-label={`Réagir avec ${e}`}
                        onClick={() => {
                          sfx.click();
                          void onSend({ k: "e", x: e, to: m.id });
                          setSelected(null);
                        }}
                        className="h-9 w-9 text-xl"
                      >
                        {e}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        setReplyTo({ id: m.id, text: m.text!.slice(0, 80), from: m.from });
                        setSelected(null);
                        input.current?.focus();
                      }}
                      className="h-9 rounded-xl border-2 border-ink bg-pop px-2.5 text-xs font-extrabold"
                    >
                      Répondre
                    </button>
                  </span>
                )}
                {m.id === lastMine?.id && pending.length === 0 && <span className="text-[11px] font-bold">{partnerSeen >= m.t ? "Vu ✓✓" : "Envoyé ✓"}</span>}
              </div>
            );
          })}

          {pending.map((p) => (
            <div key={p.id} className="flex flex-col items-end gap-0.5">
              <span
                className={`max-w-[82%] whitespace-pre-wrap break-words rounded-2xl border-[2.5px] border-ink px-3 py-2 text-[15px] font-semibold ${
                  p.status === "failed" ? "bg-flame" : "bg-candy opacity-60"
                }`}
              >
                {p.q && (
                  <span className="mb-1.5 block rounded-lg border-l-4 border-ink bg-ink/10 px-2 py-1 text-xs font-semibold">
                    <span className="line-clamp-2">{p.q.text}</span>
                  </span>
                )}
                {p.text}
              </span>
              {p.status === "sending" ? (
                <span className="text-[11px] font-bold">envoi…</span>
              ) : (
                <button type="button" onClick={() => onRetry(p.id)} className="text-[11px] font-extrabold underline">
                  Échec · toucher pour réessayer
                </button>
              )}
            </div>
          ))}

          {partnerTyping && (
            <div className="flex items-center gap-1.5 text-xs font-bold" role="status">
              {names[(1 - me) as 0 | 1]} écrit
              <span className="typing-dots" aria-hidden>
                <i />
                <i />
                <i />
              </span>
            </div>
          )}
          <div ref={end} />
        </div>

        {replyTo && (
          <div className="flex items-center gap-2 rounded-xl border-[2.5px] border-ink bg-pop px-3 py-1.5 text-xs font-semibold">
            <span className="min-w-0 flex-1">
              <span className="block font-extrabold">Réponse à {names[replyTo.from]}</span>
              <span className="line-clamp-1">{replyTo.text}</span>
            </span>
            <button type="button" aria-label="Annuler la réponse" onClick={() => setReplyTo(null)} className="h-7 w-7 text-base font-black">
              ✕
            </button>
          </div>
        )}

        {emojis && (
          <div className="grid grid-cols-8 gap-1 rounded-2xl border-[3px] border-ink bg-white/60 p-2">
            {EMOJIS.map((e) => (
              <button key={e} type="button" aria-label={e} onClick={() => setText((t) => (t + e).slice(0, MAX))} className="h-9 text-[22px]">
                {e}
              </button>
            ))}
          </div>
        )}

        <div className="grid grid-cols-8 gap-1.5" role="group" aria-label="Réactions rapides et emojis">
          {REACTIONS.map((r) => (
            <button
              key={r}
              type="button"
              disabled={!ready}
              aria-label={`Envoyer ${r}`}
              onClick={() => {
                sfx.click();
                void onSend({ k: "r", x: r });
              }}
              className="brutal-sm press flex aspect-square items-center justify-center rounded-xl bg-cream text-[21px] disabled:opacity-50"
            >
              {r}
            </button>
          ))}
          <button
            type="button"
            aria-label="Plus d'emojis"
            aria-pressed={emojis}
            onClick={() => setEmojis((v) => !v)}
            className={`brutal-sm press flex aspect-square items-center justify-center rounded-xl text-[21px] ${emojis ? "bg-pop" : "bg-cream"}`}
          >
            😊
          </button>
        </div>

        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <input
            ref={input}
            value={text}
            onChange={(e) => {
              setText(e.target.value.slice(0, MAX));
              onTyping();
            }}
            placeholder="Ton message…"
            maxLength={MAX}
            autoComplete="off"
            className="min-w-0 flex-1 rounded-2xl border-[3px] border-ink bg-white px-3 text-base font-semibold"
          />
          <button type="submit" aria-label="Envoyer" disabled={!ready || !text.trim()} className="brutal-sm press flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-passion disabled:opacity-50">
            <Icon name="send" size={22} />
          </button>
        </form>
      </section>
    </div>
  );
}
