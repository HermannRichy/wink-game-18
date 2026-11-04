"use client";

import { useState } from "react";
import { LEVELS, type Level } from "@/data/cards";
import { saveSettings, type Settings } from "@/lib/db";
import { Screen, TopBar } from "@/components/ui";
import { sfx } from "@/lib/sound";

const LEVEL_BG: Record<Level, string> = { doux: "bg-candy", coquin: "bg-passion", brulant: "bg-flame" };

export function Players({ settings, onDone, onBack }: { settings: Settings; onDone: () => void; onBack?: () => void }) {
  const [p1, setP1] = useState(settings.player1);
  const [p2, setP2] = useState(settings.player2);
  const [level, setLevel] = useState<Level>(settings.maxLevel);
  const ready = p1.trim().length > 0 && p2.trim().length > 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!ready) return;
    sfx.success();
    await saveSettings({ player1: p1.trim(), player2: p2.trim(), maxLevel: level });
    onDone();
  }

  return (
    <Screen>
      <TopBar onBack={onBack} right={<span className="font-mono text-[13px] font-bold">{onBack ? "RÉGLAGES" : "DERNIÈRE ÉTAPE"}</span>} />

      <div className="flex flex-col gap-1.5">
        <h1 className="text-[44px] font-black leading-[0.95] tracking-[-2px]">
          Qui joue <span className="highlight">ce soir</span> ?
        </h1>
        <p className="text-base font-medium">Vos prénoms servent dans tous les jeux.</p>
      </div>

      <form onSubmit={submit} className="flex flex-1 flex-col gap-5">
        <div className="flex flex-col gap-3.5">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-bold">Joueur 1</span>
            <input
              value={p1}
              onChange={(e) => setP1(e.target.value)}
              maxLength={20}
              autoComplete="off"
              placeholder="Prénom"
              className="h-14 rounded-2xl border-[3px] border-ink bg-candy px-4 text-xl font-bold shadow-[4px_4px_0_#141414] placeholder:text-ink/50"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-bold">Joueur 2</span>
            <input
              value={p2}
              onChange={(e) => setP2(e.target.value)}
              maxLength={20}
              autoComplete="off"
              placeholder="Prénom"
              className="h-14 rounded-2xl border-[3px] border-ink bg-flame px-4 text-xl font-bold shadow-[4px_4px_0_#141414] placeholder:text-ink/50"
            />
          </label>
        </div>

        <fieldset className="flex flex-col gap-2.5">
          <legend className="mb-2.5 text-sm font-bold">Jusqu'où on va ?</legend>
          {LEVELS.map((lv) => {
            const on = level === lv.id;
            return (
              <button
                key={lv.id}
                type="button"
                aria-pressed={on}
                onClick={() => {
                  sfx.click();
                  setLevel(lv.id);
                }}
                className={`flex h-16 items-center justify-between rounded-2xl border-[3px] border-ink px-4 text-left transition ${on ? `${LEVEL_BG[lv.id]} shadow-[4px_4px_0_#141414]` : "bg-cream"}`}
              >
                <span className="flex flex-col">
                  <span className="text-lg font-extrabold">{lv.name}</span>
                  <span className="text-[13px] font-medium">{lv.desc}</span>
                </span>
                <span className={`h-[22px] w-[22px] rounded-full border-[3px] border-ink ${on ? "bg-ink" : ""}`} />
              </button>
            );
          })}
          <p className="text-xs font-medium">Les cartes montent en intensité au fil de la partie, sans jamais dépasser ce niveau.</p>
        </fieldset>

        <button
          type="submit"
          disabled={!ready}
          className="brutal press mt-auto h-[60px] rounded-[18px] bg-passion text-lg font-extrabold tracking-wide disabled:opacity-50"
        >
          C'EST PARTI
        </button>
      </form>
    </Screen>
  );
}
