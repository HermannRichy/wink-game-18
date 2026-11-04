"use client";

import { LEVELS } from "@/data/cards";
import type { Settings } from "@/lib/db";
import { Mascot } from "@/components/Mascot";
import { Icon, IconButton, SoundToggle } from "@/components/ui";
import { sfx } from "@/lib/sound";

type Game = { id: "cartes" | "quiz" | "ludo" | "tour"; name: string; desc: string; icon: "cards" | "quiz" | "dice" | "tower"; bg: string; ready: boolean };

const GAMES: Game[] = [
  { id: "cartes", name: "Cartes", desc: "Pioche, ose, recommence.", icon: "cards", bg: "bg-candy", ready: true },
  { id: "quiz", name: "Quiz", desc: "Un numéro, une vérité.", icon: "quiz", bg: "bg-pop", ready: true },
  { id: "ludo", name: "Ludo Hot", desc: "Chaque capture a un prix.", icon: "dice", bg: "bg-flame", ready: false },
  { id: "tour", name: "La Tour", desc: "Un bloc, un défi.", icon: "tower", bg: "bg-ink text-cream", ready: false },
];

export type PlayableGame = "cartes" | "quiz";

export function Home({ settings, onPlay, onSettings }: { settings: Settings; onPlay: (id: PlayableGame) => void; onSettings: () => void }) {
  const levelName = LEVELS.find((l) => l.id === settings.maxLevel)?.name;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-[18px] bg-cream px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Mascot size={38} shadow={false} />
          <span className="text-[32px] font-black tracking-[-1.5px]">wink</span>
        </div>
        <div className="flex gap-2.5">
          <SoundToggle on={settings.soundOn} />
          <IconButton
            label="Réglages"
            icon="settings"
            onClick={() => {
              sfx.click();
              onSettings();
            }}
            className="bg-pop"
          />
        </div>
      </div>

      <section className="brutal relative h-[228px] overflow-hidden rounded-[26px] bg-passion p-5 shadow-[6px_6px_0_#141414]">
        <div className="relative z-10 flex h-full max-w-[190px] flex-col justify-between">
          <div className="flex flex-col gap-1">
            <span className="font-mono text-xs font-bold tracking-wider">CE SOIR</span>
            <span className="break-words text-[34px] font-black leading-none tracking-[-1.5px]">
              {settings.player1} &amp; {settings.player2}
            </span>
          </div>
          <div className="flex flex-col items-start gap-2.5">
            <button type="button" onClick={onSettings} className="rounded-full border-[2.5px] border-ink bg-cream px-3 py-1.5 text-[13px] font-bold">
              Intensité max : {levelName}
            </button>
            <span className="max-w-[150px] text-[13px] font-semibold">Bouge le téléphone, il te suit du regard.</span>
          </div>
        </div>
        <div className="absolute -right-3 top-4">
          <Mascot size={180} interactive label="Mascotte Wink" />
        </div>
      </section>

      <h2 className="text-2xl font-extrabold tracking-tight">Choisis ton jeu</h2>

      <div className="grid grid-cols-2 gap-3.5">
        {GAMES.map((g) => (
          <button
            key={g.id}
            type="button"
            disabled={!g.ready}
            onClick={() => {
              if (!g.ready) return;
              sfx.swoosh();
              onPlay(g.id as PlayableGame);
            }}
            className={`press relative flex h-[150px] flex-col justify-between rounded-[20px] border-[3px] border-ink p-3.5 text-left ${g.bg} ${g.ready ? "shadow-[5px_5px_0_#141414]" : "opacity-60"}`}
          >
            <span className={`flex h-11 w-11 items-center justify-center rounded-xl border-[2.5px] ${g.id === "tour" ? "border-cream bg-passion text-ink" : "border-ink bg-cream"}`}>
              <Icon name={g.icon} size={24} stroke={2.2} />
            </span>
            {!g.ready && (
              <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full border-2 border-current px-2 py-0.5 text-[11px] font-extrabold">
                <Icon name="lock" size={12} stroke={2.6} /> BIENTÔT
              </span>
            )}
            <span className="flex flex-col gap-0.5">
              <span className="text-xl font-extrabold">{g.name}</span>
              <span className="text-[13px] font-medium">{g.desc}</span>
            </span>
          </button>
        ))}
      </div>

      <button type="button" disabled className="flex h-[54px] items-center justify-center gap-2 rounded-2xl border-[3px] border-dashed border-ink text-base font-bold">
        <Icon name="wifi" size={20} /> Jouer à distance · bientôt
      </button>

      <p className="text-center text-[11px] font-medium text-ink/70">Emoji 😏 : Twemoji, licence CC-BY 4.0</p>
    </main>
  );
}
