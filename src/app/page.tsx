"use client";

import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, DEFAULT_SETTINGS } from "@/lib/db";
import { useInstall } from "@/lib/install";
import { setSoundEnabled } from "@/lib/sound";
import { AgeGate } from "@/components/screens/AgeGate";
import { Install } from "@/components/screens/Install";
import { Players } from "@/components/screens/Players";
import { Home } from "@/components/screens/Home";
import { CardsGame } from "@/components/screens/CardsGame";
import { Mascot } from "@/components/Mascot";

type View = "home" | "settings" | "cartes";

export default function App() {
  const stored = useLiveQuery(async () => (await db.settings.get("main")) ?? null, []);
  const { ready, standalone } = useInstall();
  const [view, setView] = useState<View>("home");
  const settings = stored === undefined ? undefined : { ...DEFAULT_SETTINGS, ...(stored ?? {}) };

  useEffect(() => {
    if (settings) setSoundEnabled(settings.soundOn);
  }, [settings?.soundOn]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!settings || !ready) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-passion">
        <Mascot size={120} shadow={false} label="Chargement de Wink" />
      </main>
    );
  }

  // 1. Âge  2. Installation (seulement dans le navigateur)  3. Prénoms
  if (!settings.ageConfirmed) return <AgeGate />;
  if (!standalone && !settings.installSkipped) return <Install />;
  if (!settings.player1 || !settings.player2) {
    return <Players settings={settings} onDone={() => setView("home")} />;
  }

  if (view === "settings") {
    return <Players settings={settings} onDone={() => setView("home")} onBack={() => setView("home")} />;
  }

  if (view === "cartes") return <CardsGame settings={settings} onExit={() => setView("home")} />;

  return <Home settings={settings} onPlay={() => setView("cartes")} onSettings={() => setView("settings")} />;
}
