"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { fill, type Level } from "@/data/cards";
import { quizFor } from "@/data/quiz";
import { db, type Settings } from "@/lib/db";
import { vibrate } from "@/lib/deck";
import { sfx } from "@/lib/sound";
import { Icon, Screen, SoundToggle, TopBar } from "@/components/ui";
import { Mascot } from "@/components/Mascot";

const LEVEL_LABEL: Record<Level, string> = { doux: "DOUX", coquin: "COQUIN", brulant: "BRÛLANT" };
const LEVEL_BADGE: Record<Level, string> = { doux: "bg-candy", coquin: "bg-passion", brulant: "bg-flame" };
const PLAYER_BG = ["bg-candy", "bg-flame"];

type Mode = "random" | "manual";

export function QuizGame({ settings, onExit }: { settings: Settings; onExit: () => void }) {
  const questions = useMemo(() => quizFor(settings.maxLevel), [settings.maxLevel]);
  const playedRows = useLiveQuery(() => db.quizPlayed.toArray(), []);
  const played = useMemo(() => new Set((playedRows ?? []).map((r) => r.questionId)), [playedRows]);

  const [mode, setMode] = useState<Mode>("random");
  const [turn, setTurn] = useState(0);
  const [current, setCurrent] = useState<number | null>(null);
  const [rolling, setRolling] = useState<number | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const names = [settings.player1, settings.player2];
  const asker = names[turn];
  const answerer = names[1 - turn];
  const free = questions.map((q, i) => (played.has(q.id) ? -1 : i)).filter((i) => i >= 0);
  const playedCount = questions.length - free.length;

  function open(i: number) {
    vibrate(30);
    sfx.swoosh();
    setCurrent(i);
  }

  function roll() {
    if (rolling !== null || free.length === 0) return;
    sfx.click();
    const target = free[Math.floor(Math.random() * free.length)];
    // Effet machine à sous : des numéros libres défilent en ralentissant
    const steps = Math.min(16, Math.max(6, free.length));
    let delay = 0;
    for (let s = 0; s < steps; s++) {
      delay += 40 + s * s * 0.8;
      const isLast = s === steps - 1;
      const pickIdx = isLast ? target : free[Math.floor(Math.random() * free.length)];
      timers.current.push(
        setTimeout(() => {
          setRolling(pickIdx);
          if (isLast) document.querySelector(`[data-q="${pickIdx}"]`)?.scrollIntoView({ block: "center", behavior: "smooth" });
          sfx.tick(isLast);
          vibrate(isLast ? 40 : 8);
        }, delay),
      );
    }
    timers.current.push(
      setTimeout(() => {
        sfx.go();
        setRolling(null);
        open(target);
      }, delay + 600),
    );
  }

  async function answered() {
    if (current === null) return;
    sfx.success();
    vibrate(15);
    await db.quizPlayed.put({ questionId: questions[current].id, playedAt: Date.now() });
    setCurrent(null);
    setTurn((t) => 1 - t);
  }

  function skip() {
    sfx.sparkle();
    setCurrent(null);
  }

  async function reset() {
    if (!window.confirm("Recommencer la grille ? Tous les numéros redeviennent disponibles.")) return;
    sfx.swoosh();
    await db.quizPlayed.clear();
    setTurn(0);
  }

  // ——— Écran question ———
  if (current !== null) {
    const q = questions[current];
    return (
      <Screen className="bg-pop">
        <TopBar
          onBack={() => {
            sfx.click();
            setCurrent(null);
          }}
          right={
            <span className={`rounded-full border-[2.5px] border-ink px-3 py-1.5 text-[13px] font-extrabold tracking-wide ${LEVEL_BADGE[q.level]}`}>
              {LEVEL_LABEL[q.level]}
            </span>
          }
        />

        <div className="flex items-end gap-3.5">
          <span className="pop-in flex h-[150px] w-[150px] shrink-0 items-center justify-center rounded-[28px] border-[3px] border-ink bg-ink font-mono text-[72px] font-bold tracking-[-4px] text-pop shadow-[6px_6px_0_#FF2E4D]">
            {current + 1}
          </span>
          <span className="flex flex-col gap-0.5 pb-1.5">
            <span className="font-mono text-[13px] font-bold">QUESTION</span>
            <span className="text-lg font-bold">{asker} demande,</span>
            <span className="text-lg font-bold">{answerer} répond.</span>
          </span>
        </div>

        <div className="brutal flex flex-1 flex-col justify-between gap-6 rounded-[26px] bg-cream p-6 shadow-[6px_6px_0_#141414]">
          <p className="text-[30px] font-extrabold leading-[1.1] tracking-[-1px]">{fill(q.text, asker, answerer)}</p>
          <span className="flex items-center gap-2 text-sm font-semibold">
            <Icon name="heart" size={18} /> Une réponse sincère vaut un bisou.
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={skip} className="h-[58px] rounded-[18px] border-[3px] border-ink bg-cream text-base font-bold">
            Joker · passer
          </button>
          <button type="button" onClick={answered} className="brutal press h-[58px] rounded-[18px] bg-passion text-[17px] font-extrabold">
            RÉPONDU !
          </button>
        </div>
      </Screen>
    );
  }

  // ——— Grille terminée ———
  if (free.length === 0 && playedRows) {
    return (
      <Screen>
        <TopBar onBack={onExit} title="Quiz" />
        <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
          <Mascot size={170} interactive className="float" />
          <h1 className="text-[40px] font-black leading-[0.95] tracking-[-2px]">
            Plus aucun <span className="highlight">secret</span> !
          </h1>
          <p className="text-base font-medium">Vous avez répondu aux {questions.length} questions.</p>
        </div>
        <button type="button" onClick={reset} className="brutal press h-[60px] rounded-[18px] bg-passion text-lg font-extrabold">
          NOUVELLE PARTIE
        </button>
      </Screen>
    );
  }

  // ——— Grille ———
  const seg = (on: boolean) => `h-11 rounded-[11px] text-base font-bold transition ${on ? "bg-ink text-cream" : "text-ink"}`;

  return (
    <Screen>
      <TopBar
        onBack={onExit}
        title="Quiz"
        right={
          <span className="flex items-center gap-2.5">
            <span className="font-mono text-[13px] font-bold">
              {playedCount}/{questions.length}
            </span>
            <SoundToggle on={settings.soundOn} />
          </span>
        }
      />

      <div className="flex flex-col gap-1">
        <h1 className="text-[40px] font-black leading-[0.95] tracking-[-2px]">
          Choisis ton <span className="highlight">numéro.</span>
        </h1>
        <p className="text-[15px] font-medium">
          <span className={`rounded-full border-2 border-ink px-2 py-0.5 font-bold ${PLAYER_BG[turn]}`}>{asker}</span> pose la question à {answerer}.
        </p>
      </div>

      <div role="group" aria-label="Mode de tirage" className="grid grid-cols-2 rounded-2xl border-[3px] border-ink bg-cream p-1">
        <button
          type="button"
          aria-pressed={mode === "random"}
          onClick={() => {
            sfx.click();
            setMode("random");
          }}
          className={seg(mode === "random")}
        >
          Au hasard
        </button>
        <button
          type="button"
          aria-pressed={mode === "manual"}
          onClick={() => {
            sfx.click();
            setMode("manual");
          }}
          className={seg(mode === "manual")}
        >
          Je choisis
        </button>
      </div>

      <div className="grid grid-cols-5 gap-2.5">
        {questions.map((q, i) => {
          const isPlayed = played.has(q.id);
          const isRolling = rolling === i;
          const label = `Question ${i + 1}${isPlayed ? ", déjà jouée" : q.level === "brulant" ? ", niveau Brûlant" : ""}`;
          if (isPlayed) {
            return (
              <span
                key={q.id}
                aria-label={label}
                className="flex h-[52px] items-center justify-center rounded-[14px] border-[3px] border-ink bg-muted font-mono text-[17px] font-bold text-[#6B6058] line-through"
              >
                {i + 1}
              </span>
            );
          }
          return (
            <button
              key={q.id}
              data-q={i}
              type="button"
              aria-label={label}
              disabled={mode !== "manual" || rolling !== null}
              onClick={() => open(i)}
              className={`flex h-[52px] items-center justify-center rounded-[14px] border-[3px] border-ink font-mono text-[17px] font-bold transition-transform duration-75 ${
                isRolling ? "scale-110 bg-passion shadow-[3px_3px_0_#141414]" : q.level === "brulant" ? "bg-flame shadow-[3px_3px_0_#141414]" : "bg-pop shadow-[3px_3px_0_#141414]"
              } ${mode === "manual" ? "press" : ""}`}
            >
              {i + 1}
            </button>
          );
        })}
      </div>

      <div className="sticky bottom-0 mt-auto flex flex-col gap-2.5 bg-cream pb-1 pt-2">
        {mode === "random" ? (
          <button
            type="button"
            onClick={roll}
            disabled={rolling !== null}
            className="brutal press flex h-[60px] items-center justify-center gap-2.5 rounded-[18px] bg-passion text-lg font-extrabold tracking-wide"
          >
            {rolling !== null ? "ÇA TOURNE…" : "TIRER UN NUMÉRO"}
          </button>
        ) : (
          <p className="text-center text-sm font-semibold">Touche un numéro pour découvrir la question.</p>
        )}
        {playedCount > 0 && (
          <button type="button" onClick={reset} className="text-sm font-semibold underline">
            Recommencer la grille
          </button>
        )}
      </div>
    </Screen>
  );
}
