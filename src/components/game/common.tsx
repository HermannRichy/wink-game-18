"use client";

import { ChatButton } from "@/components/online/ChatDock";
import { useEffect, useState, type ReactNode } from "react";
import { formatTime, type useChallengeTimer } from "@/lib/useChallengeTimer";
import { sfx } from "@/lib/sound";
import { Icon, IconButton, SoundToggle } from "@/components/ui";

export const PLAYER_BG = ["bg-candy", "bg-flame"];

export function GameFrame({
  title,
  soundOn,
  onExit,
  mode,
  partnerOnline,
  partnerName,
  className = "bg-cream",
  children,
}: {
  title: string;
  soundOn: boolean;
  onExit: () => void;
  mode: "local" | "duo" | "distance";
  partnerOnline: boolean;
  partnerName: string;
  className?: string;
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
  return (
    <main
      className={`mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))] ${className}`}
    >
      <div className="flex items-center justify-between gap-2">
        <IconButton
          label="Quitter la partie"
          icon="back"
          onClick={() => {
            sfx.click();
            onExit();
          }}
        />
        <span className="truncate text-center text-[20px] font-extrabold leading-tight">{title}</span>
        <SoundToggle on={soundOn} />
      </div>
      {mode !== "local" && (
        <div className="flex items-center gap-2">
          <div className={`flex min-w-0 flex-1 items-center justify-center gap-2 rounded-full border-[2.5px] border-ink px-3 py-1.5 text-xs font-extrabold ${alert ? "bg-pop" : "bg-cream"}`} role="status">
            <span className={`h-2.5 w-2.5 shrink-0 rounded-full border-2 border-ink ${alert ? "bg-muted" : "bg-[#3DDC84]"}`} />
            <span className="truncate">
              {alert
                ? `${partnerName.toUpperCase()} SE RECONNECTE…`
                : `${mode === "distance" ? "À DISTANCE" : "MODE DUO"} AVEC ${partnerName.toUpperCase()}`}
            </span>
          </div>
          <ChatButton />
        </div>
      )}
      {children}
    </main>
  );
}

export function TimerBlock({ timer, seconds }: { timer: ReturnType<typeof useChallengeTimer>; seconds?: number }) {
  if (!seconds) return null;
  if (timer.prep !== null) {
    return (
      <div className="flex items-center justify-between gap-3" aria-live="polite">
        <span className="flex items-baseline gap-2">
          <span className="text-sm font-extrabold">PRÊTS ?</span>
          <span key={timer.prep} className="pop-in font-mono text-[40px] font-bold leading-none">
            {timer.prep}
          </span>
        </span>
        <button type="button" onClick={timer.go} className="brutal-sm press rounded-full bg-ink px-3.5 py-2 text-sm font-extrabold text-pop">
          GO MAINTENANT
        </button>
      </div>
    );
  }
  const running = timer.timeLeft !== null && timer.timeLeft > 0;
  return (
    <button
      type="button"
      onClick={timer.go}
      disabled={running}
      aria-live="polite"
      className={`flex items-center gap-2 self-start rounded-full border-[2.5px] border-ink px-3.5 py-2 font-mono text-base font-bold ${
        running && (timer.timeLeft ?? 99) <= 5 ? "bg-passion text-ink" : "bg-ink text-pop"
      }`}
    >
      <Icon name="timer" size={16} stroke={2.8} />
      {timer.timeLeft === null ? `${formatTime(seconds)} · LANCER` : timer.timeLeft === 0 ? "TERMINÉ ! · RELANCER" : formatTime(timer.timeLeft)}
    </button>
  );
}

export function WaitingFor({ name, what }: { name: string; what: string }) {
  return (
    <div className="flex items-center justify-center gap-3 rounded-2xl border-[3px] border-dashed border-ink p-4 text-center text-base font-bold">
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
    <div className="grid grid-cols-2 gap-2.5">
      {names.map((n, i) => (
        <div
          key={i}
          className={`flex items-center justify-between rounded-2xl border-[3px] border-ink px-3 py-2 ${PLAYER_BG[i]} ${turn === undefined || turn === null || turn === i ? "shadow-[4px_4px_0_#141414]" : "opacity-60"}`}
        >
          <span className="truncate text-base font-extrabold">{n}</span>
          <span className="font-mono text-lg font-bold">{score[i]}</span>
        </div>
      ))}
    </div>
  );
}
