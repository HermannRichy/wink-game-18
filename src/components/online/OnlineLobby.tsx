"use client";

import { useEffect, useRef, useState } from "react";
import { GAMES, type GameId } from "@/data/games";
import type { Settings } from "@/lib/db";
import { getBackend, newRoomCode, normalizeCode, type PlayerInfo } from "@/lib/online/backend";
import { useRoom } from "@/lib/online/session";
import { sfx } from "@/lib/sound";
import { vibrate } from "@/lib/deck";
import { DUO_GAMES, OnlineDuoGame } from "@/components/games/registry";
import { Mascot } from "@/components/Mascot";
import { Icon, Screen, TopBar } from "@/components/ui";

export function OnlineLobby({
  settings,
  create,
  mode = "duo",
  initialCode,
  onExit,
}: {
  settings: Settings;
  /** Jeu à créer (hôte), ou undefined pour rejoindre */
  create?: GameId;
  /** Mode de la partie créée */
  mode?: "duo" | "distance";
  initialCode?: string;
  onExit: () => void;
}) {
  const [code, setCode] = useState<string | null>(null);
  const [input, setInput] = useState(initialCode ? normalizeCode(initialCode) : "");
  const [me, setMe] = useState<0 | 1 | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
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

  async function leave() {
    presenceOff.current?.();
    presenceOff.current = null;
    if (code && me === 0) {
      const b = await getBackend();
      void b.remove(code);
    }
    onExit();
  }

  // ——— Partie lancée ———
  if (room && me !== null && room.players.p0 && room.players.p1) {
    return <OnlineDuoGame room={room} me={me} soundOn={settings.soundOn} onExit={leave} />;
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

  const shareText = code ? `Viens jouer à ${gameInfo?.name ?? "Wink"} avec moi sur Wink 😏\nOuvre Wink, touche « Rejoindre une partie avec un code » et entre : ${code}\n(Pas encore Wink ? wink.hermannrichy.site)` : "";

  return (
    <Screen>
      <TopBar
        onBack={leave}
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
            {busy ? "CRÉATION…" : "CRÉER LA PARTIE"}
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
              <p className="text-base font-bold">Montre ce code à ton ou ta partenaire, à côté de toi.</p>
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
            <p className="text-base font-bold">En attente de ton ou ta partenaire…</p>
            <p className="text-xs font-medium">
              La partie démarre toute seule dès que l'autre entre le code dans « Rejoindre une partie avec un code ».
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
          <p className="-mt-2 text-base font-medium">Entre le code affiché sur le téléphone de ton ou ta partenaire (Mode Duo) ou reçu par message (Mode Distance).</p>
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
            {busy ? "CONNEXION…" : "REJOINDRE"}
          </button>
        </form>
      )}

      {!create && code && (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
          <Mascot size={120} className="float" />
          <p className="text-lg font-bold">Connexion à la partie…</p>
        </div>
      )}

      {error && (
        <p role="alert" className="rounded-2xl border-[3px] border-ink bg-passion p-3 text-center text-sm font-bold">
          {error}
        </p>
      )}
    </Screen>
  );
}
