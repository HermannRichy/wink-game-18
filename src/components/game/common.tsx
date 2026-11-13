"use client";

import { ChatButton, useChatCtx } from "@/components/online/ChatDock";
import { useEffect, useState, type ReactNode } from "react";
import { formatTime, type useChallengeTimer } from "@/lib/useChallengeTimer";
import { sfx } from "@/lib/sound";
import { Icon, IconButton, SoundToggle } from "@/components/ui";
import { Mascot, POSES } from "@/components/Mascot";
import { RULES } from "@/data/rules";
import type { GameId } from "@/data/games";

export const PLAYER_BG = ["bg-candy", "bg-flame"];

const MODE_LABEL = { local: "Un seul téléphone", duo: "Mode Duo", distance: "Mode Distance" } as const;

/** Pastille centrale : nom du jeu + compteur */
export function GameChip({ children }: { children: ReactNode }) {
  return <span className="truncate rounded-full bg-ink px-3 py-1 text-[11px] font-extrabold uppercase tracking-wide text-pop">{children}</span>;
}

/** Règles du jeu : plein écran à l'arrivée (intro), feuille par-dessus le jeu ensuite (bouton « ? ») */
export function GameRules({
  game,
  title,
  mode,
  soundOn,
  intro,
  onClose,
  onExit,
}: {
  game: GameId;
  title: string;
  mode: keyof typeof MODE_LABEL;
  soundOn: boolean;
  intro: boolean;
  onClose: () => void;
  onExit: () => void;
}) {
  const r = RULES[game];
  if (!r) return null;
  const steps = r.steps.map((t, i) => (
    <div key={i} className={`brutal flex items-center gap-3.5 rounded-[20px] px-4 py-3 ${i === 1 ? "bg-pop" : "bg-white"}`}>
      <span className="w-8 shrink-0 text-[34px] font-black leading-none">{i + 1}</span>
      <span className="text-[15px] font-bold leading-snug">{t}</span>
    </div>
  ));
  if (intro) {
    return (
      <div className="fixed inset-0 z-[60] overflow-y-auto bg-cream" role="dialog" aria-modal="true" aria-labelledby="intro-title">
        <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-[18px] pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]">
          <div className="flex items-center justify-between">
            <IconButton label="Quitter" icon="back" onClick={onExit} className="bg-white" />
            <SoundToggle on={soundOn} className="bg-white" />
          </div>
          <div className="relative mt-3 min-h-[190px]">
            <span className="rounded-full bg-ink px-3 py-1 text-[11px] font-extrabold uppercase tracking-wide text-pop">{MODE_LABEL[mode]}</span>
            <h1 id="intro-title" className="relative z-10 mt-3 max-w-[230px] break-words text-[56px] font-black leading-[0.9] tracking-[-3px]">
              {title}
            </h1>
            <p className="relative z-10 mt-2 max-w-[210px] text-[17px] font-bold leading-snug">{r.tagline}</p>
            <div className="absolute -right-3 -top-1">
              <Mascot size={176} pose={POSES.joyeuse} interactive />
            </div>
          </div>
          <div className="mt-6 flex flex-col gap-3">{steps}</div>
          <div className="mt-auto pt-6">
            <button
              type="button"
              onClick={() => {
                sfx.go();
                onClose();
              }}
              className="brutal press h-16 w-full rounded-[18px] bg-ink text-xl font-black uppercase tracking-wide text-pop shadow-[5px_5px_0_#FFD93D]"
            >
              C&apos;est parti
            </button>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-ink/60 p-4" role="dialog" aria-modal="true" aria-labelledby="rules-title" onClick={onClose}>
      <div className="pop-in flex w-full max-w-md flex-col gap-3 rounded-[26px] border-[3px] border-ink bg-cream p-5 shadow-[6px_6px_0_#141414]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="font-mono text-xs font-bold">RÈGLES</span>
            <h2 id="rules-title" className="text-[30px] font-black leading-none tracking-tight">
              {title}
            </h2>
          </div>
          <SoundToggle on={soundOn} className="bg-white" />
        </div>
        {steps}
        <button type="button" onClick={onClose} className="brutal press mt-1 h-14 rounded-2xl bg-ink text-base font-black uppercase text-pop">
          Compris
        </button>
      </div>
    </div>
  );
}

export function GameFrame({
  title,
  soundOn,
  onExit,
  mode,
  partnerOnline,
  partnerName,
  className = "bg-cream",
  game,
  counter,
  children,
}: {
  title: string;
  soundOn: boolean;
  onExit: () => void;
  mode: "local" | "duo" | "distance";
  partnerOnline: boolean;
  partnerName: string;
  className?: string;
  /** Active l'intro (une fois par session) et le bouton « ? » */
  game?: GameId;
  /** Compteur affiché dans la pastille (ex. « 7/40 ») */
  counter?: string;
  children: ReactNode;
}) {
  // Petite coupure (changement d'appli, réseau qui saute) : on attend 20 s avant d'alerter
  const [away, setAway] = useState(false);
  useEffect(() => {
    if (partnerOnline) {
      setAway(false);
      return;
    }
    const t = setTimeout(() => setAway(true), 20000);
    return () => clearTimeout(t);
  }, [partnerOnline]);
  const alert = !partnerOnline && away;

  // L'autre est parti faire un défi hors de l'app : on l'affiche avec un petit minuteur
  const chat = useChatCtx();
  const partnerAway = !!chat?.partnerAway;
  const [awaySec, setAwaySec] = useState(0);
  useEffect(() => {
    if (!partnerAway) return;
    const start = Date.now();
    setAwaySec(0);
    const t = setInterval(() => setAwaySec(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(t);
  }, [partnerAway]);

  // Intro des règles : une fois par session et par jeu
  const introKey = game ? `wink-intro-${game}-${mode}` : "";
  const [rules, setRules] = useState<"intro" | "sheet" | null>(null);
  useEffect(() => {
    if (!game || !RULES[game]) return;
    try {
      if (!sessionStorage.getItem(introKey)) setRules("intro");
    } catch {
      /* ignore */
    }
  }, [game, introKey]);
  const closeRules = () => {
    try {
      if (introKey) sessionStorage.setItem(introKey, "1");
    } catch {
      /* ignore */
    }
    setRules(null);
  };

  const status = partnerAway
    ? `Fait le défi · ${Math.floor(awaySec / 60)}:${String(awaySec % 60).padStart(2, "0")}`
    : alert
      ? "Se reconnecte…"
      : chat?.partnerTyping
        ? "En ligne · écrit…"
        : "En ligne";

  return (
    <main
      className={`mx-auto flex min-h-dvh w-full max-w-md flex-col gap-3.5 px-[18px] pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] ${className}`}
    >
      <div className="flex items-center justify-between gap-2">
        <IconButton
          label="Quitter la partie"
          icon="close"
          onClick={() => {
            sfx.click();
            onExit();
          }}
          className="bg-white"
        />
        <GameChip>
          {title}
          {counter ? ` · ${counter}` : ""}
        </GameChip>
        {game && RULES[game] ? (
          <IconButton
            label="Règles du jeu"
            icon="help"
            onClick={() => {
              sfx.click();
              setRules("sheet");
            }}
            className="bg-white"
          />
        ) : (
          <SoundToggle on={soundOn} className="bg-white" />
        )}
      </div>
      {mode !== "local" && (
        <div className="flex items-center gap-2">
          <div className="brutal-sm flex min-w-0 flex-1 items-center gap-2.5 rounded-[18px] bg-white px-2.5 py-2" role="status">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-[3px] border-ink bg-candy text-sm font-black">
              {partnerName.slice(0, 1).toUpperCase()}
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-[15px] font-black leading-tight">{partnerName}</span>
              <span className={`truncate text-xs font-bold ${partnerAway ? "text-flame" : alert ? "text-ink/60" : "text-[#1a8f3c]"}`}>● {status}</span>
            </span>
            <span className="shrink-0 rounded-full bg-ink px-2 py-0.5 text-[10px] font-extrabold uppercase text-pop">{mode === "distance" ? "Distance" : "Duo"}</span>
          </div>
          <ChatButton />
        </div>
      )}
      {children}
      {rules && game && (
        <GameRules
          game={game}
          title={title}
          mode={mode}
          soundOn={soundOn}
          intro={rules === "intro"}
          onClose={closeRules}
          onExit={() => {
            closeRules();
            onExit();
          }}
        />
      )}
    </main>
  );
}

/** Bandeau noir : à qui le tour + score */
export function TurnBanner({ name, mine, label, right }: { name: string; mine?: boolean; label?: string; right?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-2xl bg-ink px-3.5 py-2.5 text-cream" aria-live="polite">
      <span className="truncate text-[15px] font-extrabold">
        {label ?? (mine ? "À toi de jouer" : <>Au tour de <b className="text-pop">{name}</b></>)}
      </span>
      {right && <span className="shrink-0 font-mono text-[11px] font-bold opacity-80">{right}</span>}
    </div>
  );
}

/** Deux boutons toujours au même endroit, sous le pouce */
export function ActionBar({
  secondary,
  primary,
}: {
  secondary?: { label: string; onClick: () => void };
  primary: { label: string; onClick: () => void; className?: string; icon?: boolean };
}) {
  return (
    <div className="pop-in mt-auto flex gap-2.5 pt-1">
      {secondary && (
        <button type="button" onClick={secondary.onClick} className="h-16 flex-1 rounded-[18px] border-[3px] border-ink bg-cream px-2 text-[13px] font-black uppercase leading-tight">
          {secondary.label}
        </button>
      )}
      <button
        type="button"
        onClick={primary.onClick}
        className={`brutal press flex h-16 flex-[2] items-center justify-center gap-2 rounded-[18px] px-2 text-[18px] font-black uppercase ${primary.className ?? "bg-passion text-cream"}`}
      >
        {primary.icon && <Icon name="check" size={22} stroke={3.2} />}
        {primary.label}
      </button>
    </div>
  );
}

/** Minuteur circulaire : préparation (10 s) puis chrono du défi */
export function TimerBlock({ timer, seconds }: { timer: ReturnType<typeof useChallengeTimer>; seconds?: number }) {
  if (!seconds) return null;
  const prep = timer.prep !== null;
  const left = timer.timeLeft;
  const running = left !== null && left > 0;
  const pct = prep ? 100 : left === null ? 100 : (left / seconds) * 100;
  const urgent = running && left <= 5;
  return (
    <div className="flex items-center gap-3" aria-live="polite">
      <button
        type="button"
        onClick={timer.go}
        disabled={running}
        aria-label={prep ? "Lancer le chrono maintenant" : left === null ? "Lancer le chrono" : left === 0 ? "Relancer le chrono" : "Chrono en cours"}
        className="flex h-[66px] w-[66px] shrink-0 items-center justify-center rounded-full border-4 border-ink"
        style={{ background: `conic-gradient(${urgent ? "#FF2E4D" : prep ? "#FFD93D" : "#FF2E4D"} 0 ${pct}%, #E6DACB 0)` }}
      >
        <span className={`flex h-[46px] w-[46px] items-center justify-center rounded-full bg-white font-mono font-bold ${prep ? "text-[22px]" : "text-[13px]"}`}>
          {prep ? <span key={timer.prep} className="pop-in">{timer.prep}</span> : formatTime(left ?? seconds)}
        </span>
      </button>
      <span className="text-[13px] font-bold leading-tight">
        {prep ? (
          <>
            Prêts ? Le chrono part tout seul.
            <br />
            <span className="underline">Touche pour démarrer</span>
          </>
        ) : left === null ? (
          "Touche le chrono quand tu es prêt·e."
        ) : left === 0 ? (
          "Terminé ! Touche pour relancer."
        ) : (
          "C'est parti !"
        )}
      </span>
    </div>
  );
}

export function WaitingFor({ name, what }: { name: string; what: string }) {
  return (
    <div className="mt-auto flex items-center justify-center gap-3 rounded-[18px] border-[3px] border-dashed border-ink p-4 text-center text-base font-bold">
      <span className="flex gap-1" aria-hidden="true">
        <span className="h-2 w-2 animate-bounce rounded-full bg-ink [animation-delay:-0.3s]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-ink [animation-delay:-0.15s]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-ink" />
      </span>
      {name} {what}
    </div>
  );
}

export function ScoreBar({ names, score, turn }: { names: [string, string]; score: [number, number]; turn?: 0 | 1 | null }) {
  return (
    <div className="flex items-center justify-center gap-3">
      {names.map((n, i) => (
        <div
          key={i}
          className={`flex min-w-[96px] flex-col items-center rounded-[20px] border-[3px] border-ink px-4 py-1.5 ${i === 1 ? "bg-pop" : "bg-white"} ${turn === undefined || turn === null || turn === i ? "shadow-[4px_4px_0_#141414]" : "opacity-60"}`}
        >
          <span className="max-w-[110px] truncate text-xs font-extrabold uppercase">{n}</span>
          <span className="text-[34px] font-black leading-none">{score[i]}</span>
        </div>
      ))}
    </div>
  );
}

/** Écran de fin : bilan, moment fort, rejouer */
export function GameEnd({
  label = "PARTIE TERMINÉE",
  title,
  stats,
  highlight,
  replayLabel,
  onReplay,
  onExit,
}: {
  label?: string;
  title: ReactNode;
  stats: { value: number | string; label: string }[];
  highlight?: string;
  replayLabel: string;
  onReplay: () => void;
  onExit: () => void;
}) {
  const bgs = ["bg-pop", "bg-candy", "bg-white"];
  return (
    <div className="pop-in flex flex-1 flex-col gap-4">
      <div className="flex flex-col items-center text-center">
        <Mascot size={170} pose={POSES.brasOuverts} interactive className="float" />
        <span className="mt-2 font-mono text-[11px] font-bold tracking-[0.16em]">{label}</span>
        <h1 className="mt-1 text-[38px] font-black leading-[0.95] tracking-[-2px]">{title}</h1>
      </div>
      {stats.length > 0 && (
        <div className={`grid gap-2.5 ${stats.length === 1 ? "grid-cols-1" : stats.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
          {stats.map((s, i) => (
            <div key={s.label} className={`brutal rounded-[18px] px-1.5 py-3 text-center ${bgs[i % 3]}`}>
              <div className="text-[32px] font-black leading-none">{s.value}</div>
              <div className="mt-1 text-[11px] font-extrabold leading-tight">{s.label}</div>
            </div>
          ))}
        </div>
      )}
      {highlight && (
        <div className="brutal rounded-[20px] bg-ink px-4 py-3.5 text-cream shadow-[5px_5px_0_#FFD93D]">
          <div className="font-mono text-[10px] font-bold tracking-[0.14em] text-pop">LE MOMENT FORT</div>
          <p className="mt-1 text-[17px] font-extrabold leading-snug">« {highlight} »</p>
        </div>
      )}
      <div className="mt-auto flex flex-col gap-2.5 pt-2">
        <button
          type="button"
          onClick={() => {
            sfx.swoosh();
            onReplay();
          }}
          className="brutal press h-[60px] rounded-[18px] bg-passion text-lg font-black uppercase text-cream"
        >
          {replayLabel}
        </button>
        <button
          type="button"
          onClick={() => {
            sfx.click();
            onExit();
          }}
          className="h-[52px] rounded-[18px] border-[3px] border-ink bg-pop text-sm font-black uppercase"
        >
          Autre jeu
        </button>
      </div>
    </div>
  );
}
