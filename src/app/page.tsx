"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, DEFAULT_SETTINGS } from "@/lib/db";
import { AgeGate } from "@/components/screens/AgeGate";
import { Players } from "@/components/screens/Players";
import { Home } from "@/components/screens/Home";
import { CardsGame } from "@/components/screens/CardsGame";
import { Mascot } from "@/components/Mascot";

type View = "home" | "settings" | "cartes";

export default function App() {
  const settings = useLiveQuery(async () => (await db.settings.get("main")) ?? DEFAULT_SETTINGS, []);
  const [view, setView] = useState<View>("home");

  if (!settings) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-passion">
        <Mascot size={120} shadow={false} label="Chargement de Wink" />
      </main>
    );
  }

  if (!settings.ageConfirmed) return <AgeGate />;

  if (!settings.player1 || !settings.player2) {
    return <Players settings={settings} onDone={() => setView("home")} />;
  }

  if (view === "settings") {
    return <Players settings={settings} onDone={() => setView("home")} onBack={() => setView("home")} />;
  }

  if (view === "cartes") return <CardsGame settings={settings} onExit={() => setView("home")} />;

  return <Home settings={settings} onPlay={() => setView("cartes")} onSettings={() => setView("settings")} />;
}
