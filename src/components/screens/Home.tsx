"use client";

import { useMemo, useRef } from "react";
import { LEVELS } from "@/data/cards";
import { GAMES, type GameId, type GameInfo } from "@/data/games";
import { saveSettings, type Settings } from "@/lib/db";
import { Mascot, POSES } from "@/components/Mascot";
import { Icon, IconButton, SoundToggle } from "@/components/ui";
import { sfx } from "@/lib/sound";

export type PlayMode = "local" | "duo" | "distance";

const SHORT: Partial<Record<GameId, string>> = { aov: "Action ou V.", ppc: "P-P-C" };

function Chip({ children, dark }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <span className={`rounded-full border-[2.5px] px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${dark ? "border-cream bg-cream text-ink" : "border-ink bg-cream"}`}>
      {children}
    </span>
  );
}

/** Petit paquet de cartes illustrant le jeu */
function Art({ g }: { g: GameInfo }) {
  return (
    <div className="relative h-[100px] w-[84px] shrink-0" aria-hidden="true">
      <div className="absolute inset-0 rotate-[12deg] rounded-[14px] border-[3px] border-ink bg-pop shadow-[3px_3px_0_#141414]" />
      <div className="absolute inset-0 -rotate-6 rounded-[14px] border-[3px] border-ink bg-cream shadow-[3px_3px_0_#141414]" />
      <div className="absolute inset-0 flex items-center justify-center rounded-[14px] border-[3px] border-ink bg-passion text-cream shadow-[3px_3px_0_#141414]">
        <Icon name={g.icon} size={40} stroke={2.4} />
      </div>
    </div>
  );
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
  const favs = settings.favoriteGames ?? [];
  const cards = useRef<Partial<Record<GameId, HTMLElement | null>>>({});

  const ordered = useMemo(() => {
    const isFav = (g: GameInfo) => favs.includes(g.id);
    return [...GAMES.filter(isFav).sort((a, b) => favs.indexOf(a.id) - favs.indexOf(b.id)), ...GAMES.filter((g) => !isFav(g))];
  }, [favs]);

  function toggleFav(id: GameId) {
    sfx.sparkle();
    const next = favs.includes(id) ? favs.filter((f) => f !== id) : [...favs, id];
    void saveSettings({ favoriteGames: next });
  }

  function play(id: GameId, mode: PlayMode) {
    sfx.click();
    onPlay(id, mode);
  }

  function focus(id: GameId) {
    sfx.swoosh();
    cards.current[id]?.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 bg-cream pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]">
      <div className="flex items-center justify-between px-[18px]">
        <span className="text-[36px] font-black leading-none tracking-[-2px]">
          wink<span className="text-passion">.</span>
        </span>
        <div className="flex gap-2">
          <SoundToggle on={settings.soundOn} className="bg-white" />
          <IconButton
            label="Aide"
            icon="help"
            onClick={() => {
              sfx.click();
              onHelp();
            }}
            className="bg-white"
          />
          <IconButton
            label="Réglages"
            icon="settings"
            onClick={() => {
              sfx.click();
              onSettings();
            }}
            className="bg-white"
          />
        </div>
      </div>

      <section className="brutal relative mx-[18px] h-[118px] shrink-0 overflow-hidden rounded-[24px] bg-passion px-4 py-3.5">
        <div className="relative z-10 flex h-full max-w-[220px] flex-col justify-between">
          <div>
            <span className="font-mono text-[10px] font-bold tracking-[0.14em]">CE SOIR</span>
            <span className="block truncate text-[27px] font-black leading-[1.05] tracking-[-1px]">
              {settings.player2 ? <>{settings.player1} &amp; {settings.player2}</> : settings.player1}
            </span>
          </div>
          <button type="button" onClick={onSettings} className="self-start rounded-full border-[2.5px] border-ink bg-cream px-3 py-1 text-[11px] font-extrabold uppercase tracking-wide">
            Intensité max : {levelName}
          </button>
        </div>
        <div className="absolute -right-3 -top-3">
          <Mascot size={128} pose={POSES.salut} interactive label="Mascotte Wink" />
        </div>
      </section>

      <div className="px-[18px]">
        <button
          type="button"
          onClick={() => {
            sfx.click();
            onJoin();
          }}
          className="press flex h-14 w-full items-center justify-center gap-2.5 whitespace-nowrap rounded-[18px] border-[3px] border-ink bg-ink px-3 text-[15px] font-extrabold text-pop"
        >
          <Icon name="users" size={20} /> REJOINDRE AVEC UN CODE
        </button>
      </div>
      {resume && (
        <button
          type="button"
          onClick={() => {
            sfx.click();
            onResume();
          }}
          className="brutal press mx-[18px] flex h-14 items-center justify-center gap-2.5 whitespace-nowrap rounded-2xl bg-pop px-3 text-[15px] font-extrabold"
        >
          <Icon name="users" size={20} /> REPRENDRE LA PARTIE · {resume.code}
        </button>
      )}

      <div className="flex items-baseline justify-between px-5">
        <h2 className="text-[22px] font-black tracking-[-1px]">À la une</h2>
        <span className="text-xs font-extrabold opacity-60">Glisse →</span>
      </div>

      <div className="-mt-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-[18px] pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="list" aria-label="Jeux à la une">
        {ordered.map((g) => {
          const dark = g.bg.includes("bg-ink");
          const fav = favs.includes(g.id);
          const online = g.duo || g.distance;
          return (
            <article
              key={g.id}
              ref={(el) => {
                cards.current[g.id] = el;
              }}
              role="listitem"
              aria-label={g.name}
              className={`brutal relative flex h-[270px] w-[84%] max-w-[320px] shrink-0 snap-start scroll-ml-[18px] flex-col rounded-[26px] p-4 ${g.bg}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 flex-col gap-1">
                  <div className="flex flex-wrap gap-1.5">
                    {g.hot && <Chip dark={dark}>Hot</Chip>}
                    <Chip dark={dark}>Sans internet</Chip>
                    <button
                      type="button"
                      aria-label={fav ? `Retirer ${g.name} des favoris` : `Mettre ${g.name} en favori`}
                      aria-pressed={fav}
                      onClick={() => toggleFav(g.id)}
                      className="-my-1 flex h-7 w-7 items-center justify-center"
                    >
                      <Icon name={fav ? "starFill" : "star"} size={20} className={fav ? (dark ? "text-pop" : "text-ink") : ""} />
                    </button>
                  </div>
                  <h3 className="mt-1.5 text-[32px] font-black leading-[0.95] tracking-[-1.5px]">{g.name}</h3>
                  <p className="text-[14px] font-semibold leading-snug">{g.desc}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Art g={g} />
                </div>
              </div>
              <div className="mt-auto flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => play(g.id, "local")}
                  className={`press h-11 rounded-[14px] border-[3px] text-[13px] font-black uppercase tracking-wide ${dark ? "border-cream bg-pop text-ink" : "border-ink bg-ink text-pop"}`}
                >
                  {online ? "Un seul téléphone" : "Jouer"}
                </button>
                {online && (
                  <div className="flex gap-2">
                    {g.duo && (
                      <button type="button" onClick={() => play(g.id, "duo")} className="press h-11 flex-1 rounded-[14px] border-[3px] border-ink bg-cream text-[13px] font-black uppercase">
                        Duo
                      </button>
                    )}
                    {g.distance && (
                      <button type="button" onClick={() => play(g.id, "distance")} className="press h-11 flex-1 rounded-[14px] border-[3px] border-ink bg-cream text-[13px] font-black uppercase">
                        Distance
                      </button>
                    )}
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>

      <h2 className="-mt-1 px-5 text-lg font-black tracking-[-0.5px]">Tous les jeux</h2>
      <div className="grid grid-cols-4 gap-2.5 px-[18px]">
        {GAMES.map((g) => {
          const dark = g.bg.includes("bg-ink");
          return (
            <button
              key={g.id}
              type="button"
              onClick={() => focus(g.id)}
              aria-label={`Voir ${g.name}`}
              className={`brutal-sm press flex aspect-[1/0.86] flex-col items-center justify-center gap-1 rounded-2xl ${g.bg === "bg-cream" ? "bg-white" : g.bg} ${dark ? "text-cream" : ""}`}
            >
              <Icon name={g.icon} size={24} stroke={2.4} />
              <span className="px-0.5 text-center text-[10px] font-extrabold leading-none">{SHORT[g.id] ?? g.name}</span>
            </button>
          );
        })}
      </div>

    </main>
  );
}
