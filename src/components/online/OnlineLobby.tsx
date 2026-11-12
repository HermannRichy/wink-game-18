"use client";

import { useEffect, useRef, useState } from "react";
import { GAMES, type GameId } from "@/data/games";
import type { Settings } from "@/lib/db";
import { getBackend, newRoomCode, normalizeCode, type PlayerInfo } from "@/lib/online/backend";
import { forgetRoom, rememberRoom, setActiveRoom } from "@/lib/online/last-room";
import { useRoom } from "@/lib/online/session";
import { sfx } from "@/lib/sound";
import { vibrate } from "@/lib/deck";
import { DUO_GAMES, OnlineDuoGame } from "@/components/games/registry";
import { Mascot } from "@/components/Mascot";
import { Icon, Screen, Spinner, TopBar } from "@/components/ui";

export function OnlineLobby({
  settings,
  create,
  mode = "duo",
  initialCode,
  autoJoin,
  onExit,
}: {
  settings: Settings;
  /** Jeu à créer (hôte), ou undefined pour rejoindre */
  create?: GameId;
  /** Mode de la partie créée */
  mode?: "duo" | "distance";
  initialCode?: string;
  /** Rejoint tout de suite avec le code (reprise d'une partie) */
  autoJoin?: boolean;
  onExit: () => void;
}) {
  const [code, setCode] = useState<string | null>(null);
  const [input, setInput] = useState(initialCode ? normalizeCode(initialCode) : "");
  const [me, setMe] = useState<0 | 1 | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const lastAction = useRef<"host" | "join">("join");
  const room = useRoom(code);
  const presenceOff = useRef<(() => void) | null>(null);
  const gameInfo = GAMES.find((g) => g.id === (room?.game ?? create));
  const distance = create ? mode === "distance" : (() => {
    try {
      return !!(room && JSON.parse(room.stateJson).distance);
    } catch {
      return false;
    }
  })();
  const modeName = distance ? "Mode Distance" : "Mode Duo";

  const myInfo = async (): Promise<PlayerInfo> => {
    const b = await getBackend();
    return {
      uid: await b.uid(),
      name: settings.player1,
      gender: settings.player1Gender,
      online: true,
    };
  };

  async function host() {
    if (!create) return;
    lastAction.current = "host";
    setBusy(true);
    setError(null);
    try {
      const b = await getBackend();
      const player = await myInfo();
      const roomCode = newRoomCode();
      const entry = DUO_GAMES[create]!;
      await b.create({
        code: roomCode,
        game: create,
        createdAt: Date.now(),
        players: { p0: player },
        stateJson: JSON.stringify(entry.module.init({ maxLevel: settings.maxLevel, starter: Math.random() < 0.5 ? 0 : 1, distance: mode === "distance" })),
      });
      rememberRoom(roomCode, create);
      setCode(roomCode);
      setMe(0);
      presenceOff.current = b.presence(roomCode, 0);
      sfx.success();
    } catch (e) {
      console.error(e);
      setError("Impossible de créer la partie. Vérifie ta connexion internet.");
    } finally {
      setBusy(false);
    }
  }

  async function join() {
    lastAction.current = "join";
    const c = normalizeCode(input);
    if (c.length !== 5) {
      setError("Le code fait 5 caractères.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const b = await getBackend();
      const res = await b.join(c, await myInfo());
      if (!res.ok) {
        sfx.fail();
        if (res.reason === "missing") forgetRoom(c);
        setError(res.reason === "missing" ? "Aucune partie avec ce code. Vérifie-le." : "Cette partie est déjà complète.");
        return;
      }
      setCode(c);
      setMe(res.index);
      presenceOff.current = b.presence(c, res.index);
      sfx.success();
      vibrate([30, 30, 30]);
    } catch (e) {
      console.error(e);
      setError("Impossible de rejoindre. Vérifie ta connexion internet.");
    } finally {
      setBusy(false);
    }
  }

  // Le partenaire arrive : petite fête
  const partnerJoined = !!room?.players.p1;
  useEffect(() => {
    if (partnerJoined && me === 0) {
      sfx.sparkle();
      vibrate([40, 40, 80]);
    }
  }, [partnerJoined, me]);

  useEffect(() => () => presenceOff.current?.(), []);

  // On retient la partie pour pouvoir la reprendre
  const roomGame = room?.game;
  useEffect(() => {
    if (code && roomGame && me !== null) rememberRoom(code, roomGame);
  }, [code, roomGame, me]);
  useEffect(() => {
    if (code && room === null) {
      forgetRoom(code);
      setActiveRoom(null);
    }
  }, [code, room]);
  const playing = !!(room && me !== null && room.players.p0 && room.players.p1);
  useEffect(() => {
    if (code && playing) setActiveRoom(code);
  }, [code, playing]);

  // Reprise d'une partie : on rejoint tout de suite
  const autoDone = useRef(false);
  useEffect(() => {
    if (autoJoin && initialCode && !autoDone.current) {
      autoDone.current = true;
      void join();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const partnerOnline = me !== null && !!room?.players[`p${1 - me}` as "p0" | "p1"]?.online;

  /** Sortir : la partie reste ouverte si l'autre est encore là, sinon elle est supprimée */
  async function leave(endForAll = false) {
    presenceOff.current?.();
    presenceOff.current = null;
    setActiveRoom(null);
    if (code && (endForAll || !partnerOnline)) {
      const b = await getBackend();
      void b.remove(code);
      forgetRoom(code);
    }
    onExit();
  }

  // ——— Partie lancée ———
  if (room && me !== null && room.players.p0 && room.players.p1) {
    return (
      <>
        <OnlineDuoGame room={room} me={me} soundOn={settings.soundOn} onExit={() => setConfirmLeave(true)} />
        {confirmLeave && <LeaveDialog partnerOnline={partnerOnline} onStay={() => setConfirmLeave(false)} onLeave={() => leave(false)} onEnd={() => leave(true)} />}
      </>
    );
  }

  // La partie a été supprimée par l'hôte
  if (code && room === null) {
    return (
      <Screen>
        <TopBar onBack={onExit} title={modeName} />
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <Mascot size={130} />
          <h1 className="text-3xl font-black">La partie est terminée.</h1>
          <p className="font-medium">L'autre joueur a quitté la partie.</p>
        </div>
        <button type="button" onClick={onExit} className="brutal press h-14 rounded-2xl bg-pop font-extrabold">
          RETOUR À L'ACCUEIL
        </button>
      </Screen>
    );
  }

  // Reprise d'une partie : écran de chargement dédié
  if (autoJoin && !code && !create && !error) {
    return (
      <Screen>
        <TopBar onBack={onExit} title="Reprise" />
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <Mascot size={120} className="float" />
          <p className="flex items-center gap-2.5 text-lg font-bold">
            <Spinner /> Reprise de la partie…
          </p>
          <p className="text-sm font-medium">Ça peut prendre quelques secondes.</p>
        </div>
      </Screen>
    );
  }

  const shareText = code ? `Viens jouer à ${gameInfo?.name ?? "Wink"} avec moi sur Wink 😏\nOuvre Wink, touche « Rejoindre avec un code » et entre : ${code}\n(Pas encore Wink ? wink.hermannrichy.site)` : "";

  return (
    <Screen>
      <TopBar
        onBack={() => (code ? setConfirmLeave(true) : onExit())}
        title={create || code ? modeName : "Rejoindre"}
        right={
          create || code ? (
            <span className="rounded-full border-2 border-ink bg-ink px-2 py-0.5 text-[11px] font-extrabold text-pop">{distance ? "DISTANCE" : "DUO"}</span>
          ) : undefined
        }
      />

      {/* ——— Hôte : avant / après création ——— */}
      {create && !code && (
        <div className="flex flex-1 flex-col gap-5">
          <h1 className="text-[40px] font-black leading-[0.95] tracking-[-2px]">
            {gameInfo?.name}, <span className="highlight">{distance ? "à distance" : "en duo"}</span>.
          </h1>
          <p className="text-base font-medium">
            {distance
              ? "Chacun chez soi : tu crées la partie et tu envoies le code. Les défis se font par vocal, message ou appel vidéo. Connexion internet requise."
              : "Ensemble, au même endroit : chacun joue sur son téléphone, et les gages se font en vrai 😏. Connexion internet requise."}
          </p>
          <button type="button" disabled={busy} onClick={host} className="brutal press mt-auto h-[60px] rounded-[18px] bg-passion text-lg font-extrabold disabled:opacity-60">
            {busy ? (
              <span className="flex items-center justify-center gap-2.5">
                <Spinner /> CRÉATION…
              </span>
            ) : (
              "CRÉER LA PARTIE"
            )}
          </button>
        </div>
      )}

      {create && code && (
        <div className="flex flex-1 flex-col gap-5">
          <div className="flex flex-col items-center gap-2 text-center">
            <span className="font-mono text-xs font-bold">CODE DE LA PARTIE</span>
            <span className="brutal rounded-[22px] bg-pop px-6 py-3 font-mono text-[48px] font-bold tracking-[0.15em]">{code}</span>
            <span className="text-sm font-semibold">{gameInfo?.name}</span>
          </div>
          {distance ? (
          <div className="grid grid-cols-2 gap-3">
              <a
                href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
                target="_blank"
                rel="noreferrer"
                onClick={() => sfx.click()}
                className="brutal-sm press flex h-14 items-center justify-center rounded-2xl bg-[#3DDC84] text-base font-extrabold text-ink"
              >
                WhatsApp
              </a>
              <button
                type="button"
                onClick={async () => {
                  sfx.click();
                  try {
                    if (navigator.share) await navigator.share({ title: "Wink", text: shareText });
                    else {
                      await navigator.clipboard.writeText(shareText);
                      setCopied(true);
                    }
                  } catch {
                    /* partage annulé */
                  }
                }}
                className="brutal-sm press flex h-14 items-center justify-center gap-2 rounded-2xl bg-cream text-base font-extrabold"
              >
                <Icon name="copy" size={18} /> {copied ? "Copié !" : "Partager"}
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 text-center">
              <p className="text-base font-bold">Montre ce code à {settings.player2}, à côté de toi.</p>
              <button
                type="button"
                onClick={async () => {
                  sfx.click();
                  try {
                    await navigator.clipboard.writeText(code);
                    setCopied(true);
                  } catch {
                    /* presse-papiers indisponible */
                  }
                }}
                className="brutal-sm press flex h-12 items-center justify-center gap-2 rounded-2xl bg-cream px-5 text-base font-extrabold"
              >
                <Icon name="copy" size={18} /> {copied ? "Copié !" : "Copier le code"}
              </button>
            </div>
          )}
          <div className="mt-auto flex flex-col items-center gap-3 text-center">
            <Mascot size={110} interactive className="float" />
            <p className="text-base font-bold">En attente de {settings.player2}…</p>
            <p className="text-xs font-medium">
              La partie démarre toute seule dès que l'autre entre le code dans « Rejoindre avec un code ».
            </p>
          </div>
        </div>
      )}

      {/* ——— Rejoindre ——— */}
      {!create && !code && (
        <form
          className="flex flex-1 flex-col gap-5"
          onSubmit={(e) => {
            e.preventDefault();
            void join();
          }}
        >
          <h1 className="text-[40px] font-black leading-[0.95] tracking-[-2px]">
            Rejoindre une <span className="highlight">partie</span>.
          </h1>
          <p className="-mt-2 text-base font-medium">Entre le code affiché sur le téléphone de {settings.player2} (Mode Duo) ou reçu par message (Mode Distance).</p>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-bold">Code de la partie</span>
            <input
              value={input}
              onChange={(e) => setInput(normalizeCode(e.target.value))}
              inputMode="text"
              autoCapitalize="characters"
              autoComplete="off"
              placeholder="ABCDE"
              className="brutal h-16 rounded-2xl bg-pop px-4 text-center font-mono text-[34px] font-bold tracking-[0.2em] placeholder:text-ink/30"
            />
          </label>
          <button type="submit" disabled={busy || input.length !== 5} className="brutal press mt-auto h-[60px] rounded-[18px] bg-passion text-lg font-extrabold disabled:opacity-60">
            {busy ? (
              <span className="flex items-center justify-center gap-2.5">
                <Spinner /> CONNEXION…
              </span>
            ) : (
              "REJOINDRE"
            )}
          </button>
        </form>
      )}

      {!create && code && (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
          <Mascot size={120} className="float" />
          <p className="text-lg font-bold">Connexion à la partie…</p>
        </div>
      )}

      {busy && <p role="status" className="text-center text-sm font-semibold">Connexion en cours, ça peut prendre quelques secondes…</p>}
      {error && !busy && (
        <div role="alert" className="flex flex-col gap-2 rounded-2xl border-[3px] border-ink bg-passion p-3 text-center text-sm font-bold">
          {error}
          <button
            type="button"
            onClick={() => (lastAction.current === "host" ? void host() : void join())}
            className="brutal-sm press h-11 rounded-xl bg-cream text-sm font-extrabold"
          >
            RÉESSAYER
          </button>
        </div>
      )}
      {confirmLeave && <LeaveDialog partnerOnline={partnerOnline} onStay={() => setConfirmLeave(false)} onLeave={() => leave(false)} onEnd={() => leave(true)} />}
    </Screen>
  );
}

function LeaveDialog({ partnerOnline, onStay, onLeave, onEnd }: { partnerOnline: boolean; onStay: () => void; onLeave: () => void; onEnd: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-5" onClick={onStay}>
      <div role="dialog" aria-label="Quitter la partie" onClick={(e) => e.stopPropagation()} className="brutal flex w-full max-w-sm flex-col gap-3 rounded-[26px] bg-cream p-5 shadow-[6px_6px_0_#141414]">
        <h2 className="text-2xl font-black leading-tight">Quitter la partie ?</h2>
        <p className="text-sm font-semibold">
          {partnerOnline
            ? "La partie reste ouverte : tu pourras la reprendre depuis l'accueil, avec le même code."
            : "L'autre joueur n'est pas connecté : la partie sera supprimée, avec les messages."}
        </p>
        <button type="button" onClick={onStay} className="brutal press h-[54px] rounded-[16px] bg-passion text-base font-extrabold">
          RESTER
        </button>
        <button type="button" onClick={onLeave} className="h-[50px] rounded-[16px] border-[3px] border-ink bg-cream text-base font-bold">
          {partnerOnline ? "Quitter, je reviens" : "Quitter et supprimer"}
        </button>
        {partnerOnline && (
          <button type="button" onClick={onEnd} className="h-[50px] rounded-[16px] border-[3px] border-ink bg-flame text-base font-bold">
            Terminer pour tous
          </button>
        )}
      </div>
    </div>
  );
}
