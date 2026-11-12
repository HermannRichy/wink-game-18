"use client";

import { useMemo, useState } from "react";
import { LEVELS } from "@/data/cards";
import { GAMES, type GameId, type GameInfo } from "@/data/games";
import { saveSettings, type Settings } from "@/lib/db";
import { Mascot, POSES } from "@/components/Mascot";
import { Icon, IconButton, SoundToggle } from "@/components/ui";
import { sfx } from "@/lib/sound";

export type PlayMode = "local" | "duo" | "distance";

const COMING = [
  { name: "Dés coquins", desc: "Un dé action, un dé partie du corps." },
  { name: "La Roue", desc: "Fais-la tourner, elle décide." },
  { name: "Qui de nous deux ?", desc: "Votes secrets, révélation à deux." },
];

function Badge({ children, tone = "ink" }: { children: React.ReactNode; tone?: "ink" | "hot" | "duo" | "distance" }) {
  const cls = tone === "hot" ? "bg-passion text-ink" : tone === "duo" ? "bg-ink text-pop" : tone === "distance" ? "bg-ink text-candy" : "bg-cream text-ink";
  return <span className={`rounded-full border-2 border-ink px-2 py-0.5 text-[10px] font-extrabold tracking-wide ${cls}`}>{children}</span>;
}

export function Home({
  settings,
  onPlay,
  onJoin,
  resume,
  onResume,
  onSettings,
  onHelp,
}: {
  settings: Settings;
  onPlay: (id: GameId, mode: PlayMode) => void;
  onJoin: () => void;
  resume: { code: string; game: GameId } | null;
  onResume: () => void;
  onSettings: () => void;
  onHelp: () => void;
}) {
  const levelName = LEVELS.find((l) => l.id === settings.maxLevel)?.name;
  const [chooser, setChooser] = useState<GameInfo | null>(null);
  const favs = settings.favoriteGames ?? [];

  const ordered = useMemo(() => {
    const isFav = (g: GameInfo) => favs.includes(g.id);
    return [...GAMES.filter(isFav).sort((a, b) => favs.indexOf(a.id) - favs.indexOf(b.id)), ...GAMES.filter((g) => !isFav(g))];
  }, [favs]);

  function toggleFav(id: GameId) {
    sfx.sparkle();
    const next = favs.includes(id) ? favs.filter((f) => f !== id) : [...favs, id];
    void saveSettings({ favoriteGames: next });
  }

  function open(g: GameInfo) {
    sfx.swoosh();
    if (g.duo || g.distance) setChooser(g);
    else onPlay(g.id, "local");
  }

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
          <IconButton
            label="Aide"
            icon="help"
            onClick={() => {
              sfx.click();
              onHelp();
            }}
            className="bg-candy"
          />
        </div>
      </div>

      <section className="brutal relative h-[176px] overflow-hidden rounded-[26px] bg-passion p-5 shadow-[6px_6px_0_#141414]">
        <div className="relative z-10 flex h-full max-w-[200px] flex-col justify-between">
          <div className="flex flex-col gap-1">
            <span className="font-mono text-xs font-bold tracking-wider">CE SOIR</span>
            <span className="break-words text-[30px] font-black leading-none tracking-[-1.5px]">
              {settings.player1} &amp; {settings.player2}
            </span>
          </div>
          <button type="button" onClick={onSettings} className="self-start rounded-full border-[2.5px] border-ink bg-cream px-3 py-1.5 text-[13px] font-bold">
            Intensité max : {levelName}
          </button>
        </div>
        <div className="absolute -right-4 top-2">
          <Mascot size={150} pose={POSES.v} interactive label="Mascotte Wink" />
        </div>
      </section>

      {resume && (
        <button
          type="button"
          onClick={() => {
            sfx.click();
            onResume();
          }}
          className="brutal press flex h-14 items-center justify-center gap-2.5 whitespace-nowrap rounded-2xl bg-passion px-3 text-[15px] font-extrabold"
        >
          <Icon name="users" size={20} /> REPRENDRE LA PARTIE · {resume.code}
        </button>
      )}
      <button
        type="button"
        onClick={() => {
          sfx.click();
          onJoin();
        }}
        className="brutal-sm press flex h-14 items-center justify-center gap-2.5 whitespace-nowrap rounded-2xl bg-ink px-3 text-[15px] font-extrabold text-pop"
      >
        <Icon name="users" size={20} /> REJOINDRE AVEC UN CODE
      </button>

      <div className="flex items-baseline justify-between">
        <h2 className="text-2xl font-extrabold tracking-tight">Les jeux</h2>
        <span className="text-xs font-semibold text-ink/70">☆ pour mettre en favori</span>
      </div>

      <ul className="flex flex-col gap-3">
        {ordered.map((g) => {
          const fav = favs.includes(g.id);
          const dark = g.bg.includes("bg-ink");
          return (
            <li key={g.id} className={`press relative flex items-stretch rounded-[20px] border-[3px] border-ink shadow-[4px_4px_0_#141414] ${g.bg}`}>
              <button type="button" onClick={() => open(g)} className="flex flex-1 items-center gap-3 p-3 text-left">
                <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-[2.5px] ${dark ? "border-cream bg-passion text-ink" : "border-ink bg-cream"}`}>
                  <Icon name={g.icon} size={24} stroke={2.2} />
                </span>
                <span className="flex min-w-0 flex-col gap-1">
                  <span className="text-lg font-extrabold leading-tight">{g.name}</span>
                  <span className="text-[13px] font-medium leading-snug">{g.desc}</span>
                  <span className="flex flex-wrap gap-1">
                    {g.hot && <Badge tone="hot">HOT</Badge>}
                    {g.duo && <Badge tone="duo">DUO</Badge>}
                    {g.distance && <Badge tone="distance">DISTANCE</Badge>}
                    <Badge>SANS INTERNET</Badge>
                  </span>
                </span>
              </button>
              <button
                type="button"
                aria-label={fav ? `Retirer ${g.name} des favoris` : `Mettre ${g.name} en favori`}
                aria-pressed={fav}
                onClick={() => toggleFav(g.id)}
                className="flex w-14 shrink-0 items-center justify-center"
              >
                <Icon name={fav ? "starFill" : "star"} size={26} className={fav ? (dark ? "text-pop" : "text-ink") : ""} />
              </button>
            </li>
          );
        })}
      </ul>

      <div className="flex flex-col gap-2.5">
        <h2 className="text-lg font-extrabold">À venir</h2>
        {COMING.map((c) => (
          <div key={c.name} className="flex items-center gap-3 rounded-[18px] border-[3px] border-dashed border-ink p-3 opacity-70">
            <Icon name="lock" size={20} />
            <span className="flex flex-col">
              <span className="text-base font-extrabold">{c.name}</span>
              <span className="text-[13px] font-medium">{c.desc}</span>
            </span>
          </div>
        ))}
      </div>

      <p className="text-center text-[11px] font-medium text-ink/70">Emoji 😏 : Twemoji, licence CC-BY 4.0</p>

      {chooser && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/60 p-4" role="dialog" aria-modal="true" aria-labelledby="mode-title" onClick={() => setChooser(null)}>
          <div className="pop-in flex w-full max-w-md flex-col gap-3.5 rounded-[26px] border-[3px] border-ink bg-cream p-5 shadow-[6px_6px_0_#141414]" onClick={(e) => e.stopPropagation()}>
            <span className="font-mono text-xs font-bold">{chooser.name.toUpperCase()}</span>
            <h2 id="mode-title" className="text-[28px] font-black leading-none tracking-tight">
              Comment vous <span className="highlight">jouez ?</span>
            </h2>
            {(
              [
                { mode: "local", show: true, title: "Un seul téléphone", desc: "Ensemble, on se le passe à tour de rôle. Marche sans internet.", cls: "bg-pop" },
                { mode: "duo", show: !!chooser.duo, title: "Mode Duo", desc: "Ensemble, chacun son téléphone, côte à côte. Les gages se font en vrai.", cls: "bg-ink text-cream" },
                {
                  mode: "distance",
                  show: !!chooser.distance,
                  title: "Mode Distance",
                  desc: "Chacun chez soi. Défis et gages par vocal, message ou appel vidéo.",
                  cls: "bg-candy",
                },
              ] as const
            )
              .filter((o) => o.show)
              .map((o) => (
                <button
                  key={o.mode}
                  type="button"
                  onClick={() => {
                    sfx.click();
                    setChooser(null);
                    onPlay(chooser.id, o.mode);
                  }}
                  className={`brutal-sm press flex flex-col items-start gap-0.5 rounded-2xl p-4 text-left ${o.cls}`}
                >
                  <span className={`text-lg font-extrabold ${o.mode === "duo" ? "text-pop" : ""}`}>{o.title}</span>
                  <span className="text-sm font-medium">{o.desc}</span>
                </button>
              ))}
            <button type="button" onClick={() => setChooser(null)} className="h-11 text-sm font-semibold underline">
              Annuler
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
