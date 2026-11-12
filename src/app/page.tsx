"use client";

import { useEffect, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, DEFAULT_SETTINGS, saveSettings } from "@/lib/db";
import { activeRoom, lastRoom, sweepOldRooms, type KnownRoom } from "@/lib/online/last-room";
import { track } from "@/lib/analytics";
import { loadSeen } from "@/lib/seen";
import { Tour } from "@/components/screens/Tour";
import { useInstall } from "@/lib/install";
import { setSoundEnabled } from "@/lib/sound";
import { AgeGate } from "@/components/screens/AgeGate";
import { Install } from "@/components/screens/Install";
import { stat, statOpen } from "@/lib/stats";
import { InAppBrowser, detectInApp, type InAppInfo } from "@/components/screens/InAppBrowser";
import { Players } from "@/components/screens/Players";
import { Home } from "@/components/screens/Home";
import { Help } from "@/components/screens/Help";
import { CardsGame } from "@/components/screens/CardsGame";
import { QuizGame } from "@/components/screens/QuizGame";
import { TowerGame } from "@/components/screens/TowerGame";
import { LudoGame } from "@/components/screens/LudoGame";
import { UpdateWatcher } from "@/components/UpdateWatcher";
import { Mascot, POSES } from "@/components/Mascot";
import { LocalDuoGame, DUO_GAMES } from "@/components/games/registry";
import { OnlineLobby } from "@/components/online/OnlineLobby";
import type { GameId } from "@/data/games";

type View =
  | { name: "home" }
  | { name: "settings" }
  | { name: "tour" }
  | { name: "help" }
  | { name: "game"; game: GameId }
  | { name: "online"; game?: GameId; mode?: "duo" | "distance"; code?: string; resume?: boolean };

export default function App() {
  const [busy, setBusy] = useState(false);
  return (
    <>
      <AppInner onBusy={setBusy} />
      <UpdateWatcher busy={busy} />
    </>
  );
}

function AppInner({ onBusy }: { onBusy: (b: boolean) => void }) {
  const stored = useLiveQuery(async () => (await db.settings.get("main")) ?? null, []);
  const { ready, standalone } = useInstall();
  const [view, setView] = useState<View>({ name: "home" });
  const [inApp, setInApp] = useState<InAppInfo | null>(null);
  useEffect(() => {
    const info = detectInApp(navigator.userAgent);
    setInApp(info);
    if (info) stat("in_app");
  }, []);
  useEffect(() => {
    if (stored?.ageConfirmed) statOpen();
  }, [stored?.ageConfirmed]);
  useEffect(() => {
    onBusy(view.name === "game" || view.name === "online");
  }, [view.name, onBusy]);
  const [seenReady, setSeenReady] = useState(false);

  // Mémoire anti-répétition chargée avant de jouer
  useEffect(() => {
    void loadSeen().then(() => setSeenReady(true));
  }, []);

  // Lien d'invitation : /?join=CODE
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const join = params.get("join");
      if (join) {
        setView({ name: "online", code: join });
        params.delete("join");
        const q = params.toString();
        window.history.replaceState(null, "", window.location.pathname + (q ? `?${q}` : ""));
      }
    } catch {
      /* ignore */
    }
  }, []);
  const home = () => setView({ name: "home" });

  // Partie à reprendre (même code) ; ménage des parties de plus de 24 h
  const [resume, setResume] = useState<KnownRoom | null>(null);
  useEffect(() => {
    if (view.name === "home") setResume(lastRoom());
  }, [view.name]);
  useEffect(() => {
    void sweepOldRooms().then(() => setResume(lastRoom()));
  }, []);
  const settings = stored === undefined ? undefined : { ...DEFAULT_SETTINGS, ...(stored ?? {}) };

  // App rouverte en pleine partie (fermée par le téléphone, par exemple) : on y retourne directement
  const autoResumed = useRef(false);
  const readyToResume = !!settings?.ageConfirmed && !!settings?.tourDone && ready && seenReady;
  useEffect(() => {
    if (!readyToResume || autoResumed.current) return;
    autoResumed.current = true;
    const a = activeRoom();
    if (a && view.name === "home") setView({ name: "online", code: a.code, resume: true });
  }, [readyToResume]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (settings) setSoundEnabled(settings.soundOn);
  }, [settings?.soundOn]); // eslint-disable-line react-hooks/exhaustive-deps

  if (inApp) return <InAppBrowser info={inApp} onContinue={() => setInApp(null)} />;

  if (!settings || !ready || !seenReady) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-passion">
        <Mascot size={120} pose={POSES.dynamique} shadow={false} label="Chargement de Wink" />
      </main>
    );
  }

  // 1. Âge  2. Installation (seulement dans le navigateur)  3. Prénoms
  if (!settings.ageConfirmed) return <AgeGate />;
  if (!settings.tourDone || view.name === "tour") {
    return (
      <Tour
        onDone={() => {
          if (!settings.tourDone) stat("tour_done");
          void saveSettings({ tourDone: true });
          if (view.name === "tour") setView({ name: "settings" });
        }}
      />
    );
  }
  if (!standalone && !settings.installSkipped) return <Install />;
  if (!settings.player1 || !settings.player2 || !settings.player1Gender || !settings.player2Gender) {
    return <Players settings={settings} onDone={() => setView((v) => (v.name === "online" ? v : { name: "home" }))} />;
  }

  if (view.name === "help") return <Help onBack={home} />;
  if (view.name === "settings") return <Players settings={settings} onDone={home} onBack={home} onTour={() => setView({ name: "tour" })} />;

  if (view.name === "online") {
    return (
      <OnlineLobby
        key={view.code ? `${view.code}-${view.resume ? "r" : "j"}` : (view.game ? `${view.game}-${view.mode}` : "join")}
        settings={settings}
        create={view.game}
        mode={view.mode}
        initialCode={view.code}
        autoJoin={view.resume}
        onExit={home}
      />
    );
  }

  if (view.name === "game") {
    const g = view.game;
    if (g === "cartes") return <CardsGame settings={settings} onExit={home} />;
    if (g === "quiz") return <QuizGame settings={settings} onExit={home} />;
    if (g === "tour") return <TowerGame settings={settings} onExit={home} />;
    if (g === "ludo") return <LudoGame settings={settings} onExit={home} />;
    if (DUO_GAMES[g]) {
      return (
        <LocalDuoGame
          game={g}
          names={[settings.player1, settings.player2]}
          genders={[settings.player1Gender, settings.player2Gender]}
          maxLevel={settings.maxLevel}
          soundOn={settings.soundOn}
          onExit={home}
        />
      );
    }
  }

  return (
    <Home
      settings={settings}
      onPlay={(game, mode) => {
        track("game_start", { game, mode });
        stat(`g_${game}`);
        stat(`m_${mode}`);
        setView(mode === "local" ? { name: "game", game } : { name: "online", game, mode });
      }}
      onJoin={() => setView({ name: "online" })}
      resume={resume ? { code: resume.code, game: resume.game } : null}
      onResume={() => resume && setView({ name: "online", code: resume.code, resume: true })}
      onSettings={() => setView({ name: "settings" })}
      onHelp={() => setView({ name: "help" })}
    />
  );
}
