"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Settings } from "@/lib/db";
import { GAMES, type GameId } from "@/data/games";
import { getBackend, newRoomCode, type PlayerInfo, type QEntry, type RoomData } from "@/lib/online/backend";
import { useRoom } from "@/lib/online/session";
import { forgetChatKeys } from "@/lib/online/chat-crypto";
import { DUO_GAMES, OnlineDuoGame } from "@/components/games/registry";
import {
  MOOD_LABEL,
  bestMatch,
  entryCard,
  genderWord,
  loadProfile,
  moodLevel,
  parseSingle,
  sharedMood,
  skip,
  stage,
  toCard,
  toEntry,
  type Card,
  type SingleProfile,
  type SingleRoom,
} from "@/lib/singles";
import { saveBlob, shareBlob, shareImage } from "@/lib/singles-share";
import { stat, statHour } from "@/lib/stats";
import { sfx } from "@/lib/sound";
import { vibrate } from "@/lib/deck";
import { Mascot, POSES } from "@/components/Mascot";
import { Screen, Spinner, TopBar } from "@/components/ui";
import { SinglesProfile } from "@/components/singles/Profile";
import { ReportSheet, SinglesCtx } from "@/components/singles/Report";

const SINGLE_GAMES = GAMES.filter((g) => g.distance && DUO_GAMES[g.id]);

const Chip = ({ children, on }: { children: React.ReactNode; on?: boolean }) => (
  <span className={`rounded-full border-[2.5px] border-ink px-2.5 py-1 text-[11.5px] font-extrabold ${on ? "bg-pop" : "bg-white"}`}>{children}</span>
);

function Avatar({ card, size = 54 }: { card: Card; size?: number }) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full border-[3px] border-ink font-black ${card.g === "f" ? "bg-flame" : "bg-candy"}`}
      style={{ width: size, height: size, fontSize: size * 0.44 }}
    >
      {card.n.slice(0, 1).toUpperCase()}
    </span>
  );
}

function ProfileCard({ card, mine }: { card: Card; mine?: Card | null }) {
  const common = new Set(mine?.i ?? []);
  return (
    <div className="brutal rounded-[22px] bg-white p-4">
      <div className="flex items-center gap-3">
        <Avatar card={card} />
        <div className="min-w-0">
          <div className="truncate text-[20px] font-black leading-tight">{card.n}</div>
          <div className="text-[13px] font-extrabold">
            {card.a} ans{card.c ? ` · ${card.c}` : ""}
          </div>
        </div>
      </div>
      <div className="mb-1.5 mt-3 text-xs font-extrabold">{mine ? "Centres d'intérêt (en jaune : en commun)" : "Centres d'intérêt"}</div>
      <div className="flex flex-wrap gap-1.5">
        {card.i.map((t) => (
          <Chip key={t} on={!mine || common.has(t)}>
            {t}
          </Chip>
        ))}
      </div>
      <div className="mt-2.5 text-xs font-extrabold">Envie : {MOOD_LABEL[card.m]}</div>
    </div>
  );
}

/** Point d'entrée du mode Célibataires (depuis l'accueil) */
export function Singles({ settings, onExit }: { settings: Settings; onExit: () => void }) {
  const [profile, setProfile] = useState<SingleProfile | null>(() => loadProfile());
  const [editing, setEditing] = useState(!profile);
  const [room, setRoom] = useState<{ code: string; me: 0 | 1 } | null>(null);
  const [run, setRun] = useState(0);

  if (editing || !profile) {
    return (
      <SinglesProfile
        initial={profile}
        defaults={{ nick: settings.player1, gender: settings.player1Gender }}
        onBack={() => (profile ? setEditing(false) : onExit())}
        onSave={(p) => {
          setProfile(p);
          setEditing(false);
        }}
      />
    );
  }
  if (room) {
    return (
      <SinglesRoom
        key={room.code}
        code={room.code}
        me={room.me}
        settings={settings}
        onExit={onExit}
        onSearchAgain={() => {
          setRoom(null);
          setRun((n) => n + 1);
        }}
      />
    );
  }
  return <Search key={run} profile={profile} onExit={onExit} onEdit={() => setEditing(true)} onRoom={setRoom} />;
}

// ——————————————————— Recherche ———————————————————

function Search({ profile, onExit, onEdit, onRoom }: { profile: SingleProfile; onExit: () => void; onEdit: () => void; onRoom: (r: { code: string; me: 0 | 1 }) => void }) {
  const [elapsed, setElapsed] = useState(0);
  const [online, setOnline] = useState(0);
  const [blocked, setBlocked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const done = useRef(false);
  const creating = useRef<string | null>(null);

  useEffect(() => {
    let alive = true;
    let offWatch = () => {};
    let timer: ReturnType<typeof setInterval> | undefined;
    const start = Date.now();
    const entry: QEntry = toEntry(profile);

    const finish = (r: { code: string; me: 0 | 1 }) => {
      if (done.current) return;
      done.current = true;
      sfx.sparkle();
      vibrate([40, 40, 80]);
      if (r.me === 0) stat("s_match"); // compté une fois par match (par celui qui réserve)
      onRoom(r);
    };

    void (async () => {
      const b = await getBackend();
      try {
        if (await b.isBlocked()) {
          setBlocked(true);
          return;
        }
      } catch {
        /* on tente quand même */
      }
      const myUid = await b.uid();
      try {
        await b.qPut(entry);
      } catch {
        setError("Impossible de rejoindre la file. Vérifie ta connexion.");
        return;
      }
      stat("s_search");
      statHour("sh");

      // Quelqu'un m'a réservé : je rejoins sa partie
      offWatch = b.qWatch(myUid, (e) => {
        if (!alive || done.current || !e?.x || e.x === creating.current) return;
        const code = e.x;
        void (async () => {
          const info: PlayerInfo = { uid: myUid, name: profile.nick, gender: profile.gender, online: true };
          const res = await b.join(code, info).catch(() => null);
          if (res?.ok) {
            await b.qPut(null).catch(() => {});
            finish({ code, me: res.index });
          } else await b.qRelease();
        })();
      });

      // Je cherche parmi ceux qui attendent déjà
      const tick = async () => {
        if (!alive || done.current || creating.current) return;
        setElapsed(Date.now() - start);
        let q: Record<string, QEntry>;
        try {
          q = await b.qRead();
        } catch {
          return;
        }
        const now = Date.now();
        setOnline(Object.entries(q).filter(([u, e]) => u !== myUid && e && now - e.t < 30 * 60000).length);
        const cand = bestMatch(myUid, entry, q, now - start);
        if (!cand || done.current) return;
        const code = newRoomCode();
        creating.current = code;
        try {
          if (!(await b.qClaim(myUid, code))) return; // quelqu'un vient de me réserver : qWatch s'en occupe
          const other = q[cand];
          const single: SingleRoom = { status: "match", seek: entry.s, cards: [toCard(myUid, profile), entryCard(cand, other)] };
          const room: RoomData = {
            code,
            game: "aov",
            createdAt: Date.now(),
            players: {
              p0: { uid: myUid, name: profile.nick, gender: profile.gender, online: true },
              p1: { uid: cand, name: other.n, gender: other.g, online: false },
            },
            stateJson: "{}",
            single: JSON.stringify(single),
          };
          await b.create(room);
          if (await b.qClaim(cand, code)) {
            await b.qPut(null).catch(() => {});
            finish({ code, me: 0 });
          } else {
            await b.remove(code).catch(() => {});
            await b.qRelease();
          }
        } catch {
          await b.qRelease().catch(() => {});
        } finally {
          creating.current = null;
        }
      };
      void tick();
      timer = setInterval(() => void tick(), 2500);
    })();

    return () => {
      alive = false;
      offWatch();
      if (timer) clearInterval(timer);
      if (!done.current) void getBackend().then((b) => b.qPut(null).catch(() => {}));
    };
  }, [profile, onRoom]);

  async function shareGame() {
    setBusy(true);
    try {
      const b = await getBackend();
      done.current = true;
      await b.qPut(null).catch(() => {});
      const myUid = await b.uid();
      const code = newRoomCode();
      const single: SingleRoom = { status: "open", seek: profile.gender === "h" ? "f" : "h", cards: [toCard(myUid, profile), null] };
      await b.create({
        code,
        game: "aov",
        createdAt: Date.now(),
        players: { p0: { uid: myUid, name: profile.nick, gender: profile.gender, online: true } },
        stateJson: "{}",
        single: JSON.stringify(single),
      });
      onRoom({ code, me: 0 });
    } catch {
      done.current = false;
      setError("Impossible de créer la partie. Vérifie ta connexion.");
    } finally {
      setBusy(false);
    }
  }

  if (blocked) {
    return (
      <Screen>
        <TopBar onBack={onExit} title="Célibataires" />
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
          <Mascot size={130} pose={POSES.v} />
          <h1 className="text-[28px] font-black leading-tight">Accès suspendu</h1>
          <p className="font-medium">Ton accès au mode Célibataires a été suspendu après plusieurs signalements. Les autres jeux restent disponibles.</p>
        </div>
      </Screen>
    );
  }

  const st = stage(elapsed);
  const steps: [string, number][] = [
    [profile.city || "Ta ville", 0],
    [profile.country ? `Tout le pays (${profile.country})` : "Ton pays", 1],
    ["Partout", 2],
  ];

  return (
    <Screen>
      <TopBar onBack={onExit} right={<span className="rounded-full bg-ink px-3 py-1 text-[11px] font-extrabold uppercase text-pop">Célibataires</span>} />
      <div className="flex flex-col items-center text-center">
        <Mascot size={150} pose={POSES.dynamique} className="float" />
        <h1 className="mt-1 text-[30px] font-black leading-[1] tracking-[-1.5px]">
          On te cherche
          <br />
          quelqu&apos;un…
        </h1>
      </div>
      <div className="flex flex-col gap-2" aria-live="polite">
        {steps.map(([label, i]) => {
          const state = i < st ? "PERSONNE" : i === st ? "EN COURS" : "ENSUITE";
          return (
            <div key={i} className={`flex items-center gap-2.5 rounded-2xl border-[3px] border-ink px-3 py-2.5 ${i === st ? "bg-pop" : "bg-white opacity-60"}`}>
              <span className="flex h-7 w-7 items-center justify-center rounded-full border-[2.5px] border-ink bg-white text-xs font-black">{i < st ? "✓" : i === st ? <Spinner /> : i + 1}</span>
              <span className="truncate text-[14px] font-extrabold">{label}</span>
              <span className="ml-auto font-mono text-[11px] font-bold">{state}</span>
            </div>
          );
        })}
      </div>
      <p className="text-center text-[13px] font-extrabold">
        🟢 {online} célibataire{online > 1 ? "s" : ""} en ligne en ce moment
      </p>
      {error && <p className="rounded-xl border-[3px] border-ink bg-candy p-2.5 text-sm font-bold">{error}</p>}
      <div className="mt-auto flex flex-col gap-2 pt-2">
        <p className="text-center text-[12.5px] font-bold">Personne pour l&apos;instant ? Partage ta partie sur ton statut.</p>
        <button type="button" disabled={busy} onClick={shareGame} className="brutal press h-14 rounded-[18px] bg-ink text-[15px] font-black uppercase text-pop disabled:opacity-60">
          {busy ? "…" : "Créer une partie à partager"}
        </button>
        <button type="button" onClick={onEdit} className="text-sm font-semibold underline">
          Modifier mon profil
        </button>
      </div>
    </Screen>
  );
}

// ——————————————————— Salle ———————————————————

export function SinglesRoom({ code, me, settings, onExit, onSearchAgain }: { code: string; me: 0 | 1; settings: Settings; onExit: () => void; onSearchAgain: () => void }) {
  const room = useRoom(code);
  const single = useMemo(() => parseSingle(room?.single), [room?.single]);
  const [myUid, setMyUid] = useState("");
  const [profile, setProfile] = useState<SingleProfile | null>(() => loadProfile());
  const [needProfile, setNeedProfile] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [left, setLeft] = useState(false);
  const loaded = useRef(false);
  if (room) loaded.current = true;

  useEffect(() => {
    let off = () => {};
    void getBackend().then(async (b) => {
      setMyUid(await b.uid());
      off = b.presence(code, me);
    });
    return () => off();
  }, [code, me]);

  async function patch(p: Record<string, unknown>) {
    await (await getBackend()).updateRoom(code, p);
  }
  const setSingle = (s: SingleRoom, extra: Record<string, unknown> = {}) => patch({ single: JSON.stringify(s), ...extra });

  /** Tout s'efface : la salle (et son chat) disparaît pour les deux */
  async function leave(after: "home" | "search") {
    setLeft(true);
    try {
      await (await getBackend()).remove(code);
    } catch {
      /* déjà supprimée */
    }
    forgetChatKeys(code);
    if (after === "home") onExit();
    else onSearchAgain();
  }

  // Arrivée par code : on envoie sa carte à l'hôte
  const sent = useRef(false);
  useEffect(() => {
    if (me !== 1 || !single || !myUid || single.status !== "open" || sent.current) return;
    if (single.refused?.includes(myUid)) return;
    if (!profile) {
      setNeedProfile(true);
      return;
    }
    if (profile.gender !== single.seek) return;
    sent.current = true;
    void setSingle({ ...single, status: "pending", cards: [single.cards[0], toCard(myUid, profile)] }, { "players/p1/name": profile.nick, "players/p1/gender": profile.gender });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me, single, myUid, profile]);

  const mine = single?.cards[me] ?? null;
  const other = single?.cards[1 - me] ?? null;

  if (needProfile && !profile) {
    return (
      <SinglesProfile
        initial={null}
        defaults={{ nick: settings.player1, gender: settings.player1Gender }}
        cta="Envoyer mon profil"
        onBack={() => void patch({ "players/p1": null }).then(onExit)}
        onSave={(p) => {
          setProfile(p);
          setNeedProfile(false);
        }}
      />
    );
  }

  // Salle supprimée par l'autre : fin, tout est effacé
  if ((room === null && loaded.current) || (room === null && left)) {
    return (
      <Screen>
        <TopBar onBack={onExit} title="Célibataires" />
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
          <Mascot size={130} pose={POSES.clin} />
          <h1 className="text-[28px] font-black leading-tight">La partie est terminée.</h1>
          <p className="font-medium">Tout a été effacé : la partie et le chat.</p>
        </div>
        <div className="flex flex-col gap-2.5">
          <button type="button" onClick={onSearchAgain} className="brutal press h-14 rounded-2xl bg-passion font-black uppercase text-cream">
            Chercher quelqu&apos;un d&apos;autre
          </button>
          <button type="button" onClick={onExit} className="h-12 rounded-2xl border-[3px] border-ink font-black uppercase">
            Accueil
          </button>
        </div>
      </Screen>
    );
  }
  if (room === null) {
    return (
      <Screen>
        <TopBar onBack={onExit} title="Célibataires" />
        <p className="m-auto text-center font-bold">Cette partie n&apos;existe plus.</p>
      </Screen>
    );
  }
  if (!room || !single) {
    return (
      <Screen>
        <TopBar onBack={onExit} title="Célibataires" />
        <p className="m-auto flex items-center gap-2 font-bold">
          <Spinner /> Connexion…
        </p>
      </Screen>
    );
  }

  // ——— Partie lancée ———
  if (single.status === "ok" && other && room.players.p0 && room.players.p1) {
    return (
      <SinglesCtx.Provider value={{ partnerUid: other.uid, partnerNick: other.n, leave: () => void leave("home") }}>
        <OnlineDuoGame room={room} me={me} soundOn={settings.soundOn} onExit={() => setConfirm(true)} />
        {confirm && (
          <div className="fixed inset-0 z-[70] flex items-end justify-center bg-ink/60 p-4" role="dialog" aria-modal="true" aria-labelledby="sleave">
            <div className="pop-in flex w-full max-w-md flex-col gap-3 rounded-[26px] border-[3px] border-ink bg-cream p-5 shadow-[6px_6px_0_#141414]">
              <h2 id="sleave" className="text-[26px] font-black leading-tight">
                Quitter la partie ?
              </h2>
              <p className="text-sm font-medium">La partie et le chat seront effacés pour vous deux. Si vous voulez garder contact, échangez vos numéros avant.</p>
              <button type="button" onClick={() => void leave("search")} className="brutal press h-14 rounded-2xl bg-passion font-black uppercase text-cream">
                Quitter et chercher quelqu&apos;un
              </button>
              <button type="button" onClick={() => void leave("home")} className="h-12 rounded-2xl border-[3px] border-ink font-black uppercase">
                Quitter et revenir à l&apos;accueil
              </button>
              <button type="button" onClick={() => setConfirm(false)} className="text-sm font-semibold underline">
                Rester
              </button>
            </div>
          </div>
        )}
      </SinglesCtx.Provider>
    );
  }

  // ——— Match : choix du jeu ———
  if (single.status === "match" && other) {
    const mood = sharedMood(mine?.m ?? "discuter", other.m);
    return (
      <MatchScreen
        other={other}
        mine={mine}
        mood={mood}
        partnerHere={!!room.players[`p${1 - me}` as "p0" | "p1"]?.online}
        onPick={(game) => {
          sfx.go();
          const entry = DUO_GAMES[game]!;
          const state = entry.module.init({ maxLevel: moodLevel(mood), starter: Math.random() < 0.5 ? 0 : 1, distance: true });
          void setSingle({ ...single, status: "ok" }, { game, stateJson: JSON.stringify(state) });
        }}
        onNext={() => {
          skip(other.uid);
          void leave("search");
        }}
      />
    );
  }

  // ——— Partie partagée (hôte) ———
  if (me === 0 && (single.status === "open" || single.status === "pending")) {
    if (single.status === "pending" && other) {
      return (
        <Screen>
          <TopBar onBack={() => void leave("home")} title={`Ma partie · ${code}`} />
          <div>
            <span className="font-mono text-[11px] font-bold tracking-[0.14em]">VIA TON CODE</span>
            <h1 className="text-[30px] font-black leading-none tracking-[-1.5px]">Quelqu&apos;un veut jouer avec toi</h1>
          </div>
          <ProfileCard card={other} mine={mine} />
          <p className="text-[13px] font-bold">{other.g === "f" ? "Elle" : "Il"} ne voit rien de toi tant que tu n&apos;as pas accepté.</p>
          <div className="mt-auto flex gap-2.5">
            <button
              type="button"
              onClick={() => void setSingle({ ...single, status: "open", cards: [mine, null], refused: [...(single.refused ?? []), other.uid] }, { "players/p1": null })}
              className="h-16 flex-1 rounded-[18px] border-[3px] border-ink bg-cream text-sm font-black uppercase"
            >
              Refuser
            </button>
            <button
              type="button"
              onClick={() => {
                sfx.sparkle();
                void setSingle({ ...single, status: "match" });
              }}
              className="brutal press h-16 flex-[2] rounded-[18px] bg-passion text-lg font-black uppercase text-cream"
            >
              Accepter
            </button>
          </div>
        </Screen>
      );
    }
    return <ShareScreen code={code} card={mine} onCancel={() => void leave("home")} />;
  }

  // ——— Arrivée par code (invité) ———
  const refused = single.refused?.includes(myUid);
  const wrongGender = profile && profile.gender !== single.seek;
  return (
    <Screen>
      <TopBar onBack={() => void patch({ "players/p1": null }).then(onExit)} title="Célibataires" />
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
        <Mascot size={130} pose={refused || wrongGender ? POSES.v : POSES.clin} className={refused || wrongGender ? "" : "float"} />
        {refused ? (
          <>
            <h1 className="text-[26px] font-black leading-tight">Pas de suite cette fois.</h1>
            <p className="font-medium">Cette personne n&apos;a pas donné suite. Il y a plein d&apos;autres célibataires !</p>
          </>
        ) : wrongGender ? (
          <>
            <h1 className="text-[26px] font-black leading-tight">Partie réservée</h1>
            <p className="font-medium">Cette partie cherche {genderWord(single.seek)}.</p>
          </>
        ) : (
          <>
            <h1 className="text-[26px] font-black leading-tight">Profil envoyé 😏</h1>
            <p className="flex items-center gap-2 font-medium">
              <Spinner /> En attente de la réponse de {single.cards[0]?.n ?? "l'hôte"}…
            </p>
          </>
        )}
      </div>
      {(refused || wrongGender) && (
        <button
          type="button"
          onClick={() => void patch({ "players/p1": null }).then(onSearchAgain)}
          className="brutal press h-14 rounded-2xl bg-passion font-black uppercase text-cream"
        >
          Chercher quelqu&apos;un
        </button>
      )}
    </Screen>
  );
}

function MatchScreen({ other, mine, mood, partnerHere, onPick, onNext }: { other: Card; mine: Card | null; mood: ReturnType<typeof sharedMood>; partnerHere: boolean; onPick: (g: GameId) => void; onNext: () => void }) {
  const [report, setReport] = useState(false);
  return (
    <Screen>
      <TopBar
        onBack={onNext}
        right={
          <button type="button" onClick={() => setReport(true)} aria-label={`Signaler ${other.n}`} className="brutal-sm flex h-10 w-10 items-center justify-center rounded-[12px] bg-passion font-black text-cream">
            ⚑
          </button>
        }
      />
      <div className="flex flex-col items-center text-center">
        <Mascot size={120} pose={POSES.brasOuverts} interactive />
        <h1 className="text-[40px] font-black leading-none tracking-[-2px]">Match !</h1>
      </div>
      <ProfileCard card={other} mine={mine} />
      <div className="rounded-[18px] border-[3px] border-ink bg-pop px-3.5 py-2.5">
        <div className="font-mono text-[10px] font-bold tracking-[0.12em]">AMBIANCE DE LA PARTIE</div>
        <div className="text-[18px] font-black">{MOOD_LABEL[mood]}</div>
        <div className="text-xs font-bold">
          Toi : {MOOD_LABEL[mine?.m ?? "discuter"]} · {other.n} : {MOOD_LABEL[other.m]}. On prend toujours la plus douce des deux.
        </div>
      </div>
      <div>
        <div className="mb-1.5 text-sm font-black">
          Choisis le jeu {partnerHere ? "" : <span className="font-semibold opacity-60">({other.n} se connecte…)</span>}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {SINGLE_GAMES.map((g) => (
            <button key={g.id} type="button" onClick={() => onPick(g.id)} className={`brutal-sm press h-12 rounded-xl px-2 text-[13px] font-black ${g.bg === "bg-cream" ? "bg-white" : g.bg}`}>
              {g.name}
            </button>
          ))}
        </div>
      </div>
      <button type="button" onClick={onNext} className="mt-auto h-12 shrink-0 rounded-2xl border-[3px] border-ink bg-cream text-sm font-black uppercase">
        Suivant
      </button>
      {report && <ReportSheet ctx={{ partnerUid: other.uid, partnerNick: other.n, leave: onNext }} onClose={() => setReport(false)} />}
    </Screen>
  );
}

function ShareScreen({ code, card, onCancel }: { code: string; card: Card | null; onCancel: () => void }) {
  const [url, setUrl] = useState<string | null>(null);
  const blob = useRef<Blob | null>(null);
  const [note, setNote] = useState<string | null>(null);
  useEffect(() => {
    if (!card) return;
    let u = "";
    void shareImage(code, card).then((b) => {
      blob.current = b;
      u = URL.createObjectURL(b);
      setUrl(u);
    });
    return () => {
      if (u) URL.revokeObjectURL(u);
    };
  }, [code, card]);

  return (
    <Screen>
      <TopBar onBack={onCancel} title="Partager ma partie" />
      <div className="mx-auto w-[62%] max-w-[240px] overflow-hidden rounded-[20px] border-[3px] border-ink shadow-[5px_5px_0_#141414]">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={`Visuel à partager avec le code ${code}`} className="block w-full" />
        ) : (
          <div className="flex aspect-[9/16] items-center justify-center bg-candy">
            <Spinner />
          </div>
        )}
      </div>
      <p className="text-center text-[12.5px] font-bold">Format statut. Seuls ton pseudo, ton âge et ta ville apparaissent.</p>
      <p className="flex items-center justify-center gap-2 text-center text-sm font-extrabold" aria-live="polite">
        <Spinner /> En attente de quelqu&apos;un · code <span className="font-mono">{code}</span>
      </p>
      {note && <p className="text-center text-xs font-bold">{note}</p>}
      <div className="mt-auto flex gap-2.5">
        <button
          type="button"
          disabled={!url}
          onClick={() => {
            if (blob.current) saveBlob(blob.current, code);
            setNote("Image enregistrée.");
          }}
          className="h-14 flex-1 rounded-[18px] border-[3px] border-ink bg-cream text-sm font-black uppercase"
        >
          Enregistrer
        </button>
        <button
          type="button"
          disabled={!url}
          onClick={async () => {
            if (!blob.current) return;
            stat("s_share");
            const r = await shareBlob(blob.current, code);
            if (r === "saved") setNote("Image enregistrée : publie-la sur ton statut.");
          }}
          className="brutal press h-14 flex-[2] rounded-[18px] bg-ink text-lg font-black uppercase text-pop disabled:opacity-60"
        >
          Partager
        </button>
      </div>
    </Screen>
  );
}
