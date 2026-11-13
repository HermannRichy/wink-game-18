"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { LEVEL_BG, LEVEL_LABEL, fill } from "@/data/cards";
import { quizFor } from "@/data/quiz";
import { db, type Settings } from "@/lib/db";
import { vibrate } from "@/lib/deck";
import { sfx } from "@/lib/sound";
import { Mascot, POSES } from "@/components/Mascot";
import { ActionBar, GameEnd, GameFrame, TurnBanner } from "@/components/game/common";

const LEVEL_BADGE = LEVEL_BG;

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
  const [answeredN, setAnsweredN] = useState(0);
  const [skippedN, setSkippedN] = useState(0);
  const [highlight, setHighlight] = useState<string | undefined>();
  const [ended, setEnded] = useState(false);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const names = [settings.player1, settings.player2];
  const asker = names[turn];
  const answerer = names[1 - turn];
  const genders = [settings.player1Gender, settings.player2Gender];
  // Les questions s'adressent à celui ou celle qui répond
  const g = { addressee: genders[1 - turn], other: genders[turn] };
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
    setAnsweredN((n) => n + 1);
    setHighlight(fill(questions[current].text, asker, answerer, g));
    await db.quizPlayed.put({ questionId: questions[current].id, playedAt: Date.now() });
    setCurrent(null);
    setTurn((t) => 1 - t);
  }

  function skip() {
    setSkippedN((n) => n + 1);
    sfx.sparkle();
    setCurrent(null);
  }

  async function reset(ask = true) {
    if (ask && !window.confirm("Recommencer la grille ? Tous les numéros redeviennent disponibles.")) return;
    sfx.swoosh();
    await db.quizPlayed.clear();
    setTurn(0);
  }

  function exit() {
    if (answeredN + skippedN >= 3 && !ended) {
      setEnded(true);
      return;
    }
    onExit();
  }
  const frame = (children: React.ReactNode) => (
    <GameFrame title="Quiz" game="quiz" counter={`${playedCount}/${questions.length}`} soundOn={settings.soundOn} onExit={exit} mode="local" partnerOnline partnerName={answerer} className="bg-pop">
      {children}
    </GameFrame>
  );
  const allDone = free.length === 0 && !!playedRows;

  // ——— Fin ———
  if (ended || (allDone && current === null)) {
    return frame(
      <GameEnd
        label={allDone ? "PLUS AUCUN SECRET" : "SOIRÉE TERMINÉE"}
        title={
          <>
            Belle partie,
            <br />
            {names[0]} &amp; {names[1]}.
          </>
        }
        stats={[
          { value: answeredN, label: "questions répondues" },
          { value: skippedN, label: "jokers utilisés" },
          { value: `${playedCount}/${questions.length}`, label: "de la grille" },
        ]}
        highlight={highlight}
        replayLabel={allDone ? "Nouvelle grille" : "Reprendre la partie"}
        onReplay={() => {
          if (allDone) void reset(false);
          setEnded(false);
        }}
        onExit={onExit}
      />,
    );
  }

  // ——— Écran question ———
  if (current !== null) {
    const q = questions[current];
    return frame(
      <>
        <TurnBanner name={asker} label={`${asker} demande, ${answerer} répond`} />
        <div className="mt-2 flex items-end gap-3.5">
          <span className="pop-in flex h-[120px] w-[120px] shrink-0 items-center justify-center rounded-[26px] border-[3px] border-ink bg-ink font-mono text-[60px] font-bold tracking-[-3px] text-pop shadow-[6px_6px_0_#FF2E4D]">
            {current + 1}
          </span>
          <span className={`mb-1 rounded-full border-[2.5px] border-ink px-3 py-1 text-[12px] font-extrabold tracking-wide ${LEVEL_BADGE[q.level]}`}>
            VÉRITÉ · {LEVEL_LABEL[q.level]}
          </span>
        </div>
        <div className="brutal relative flex flex-1 flex-col rounded-[24px] bg-white p-5 pb-24">
          <p className="max-w-[94%] text-[28px] font-black leading-[1.12] tracking-[-1px]">{fill(q.text, asker, answerer, g)}</p>
          <p className="mt-auto max-w-[60%] pt-4 text-sm font-bold">Une réponse sincère vaut un bisou.</p>
          <div className="pointer-events-none absolute -bottom-3 -right-2">
            <Mascot size={118} pose={POSES.v} />
          </div>
        </div>
        <ActionBar
          secondary={{ label: "Joker · passer", onClick: skip }}
          primary={{ label: "J'ai répondu", onClick: answered, className: "bg-ink text-pop" }}
        />
      </>,
    );
  }

  // ——— Grille ———
  const seg = (on: boolean) => `h-10 rounded-[11px] text-[15px] font-bold transition ${on ? "bg-ink text-cream" : "text-ink"}`;

  return frame(
    <>
      <TurnBanner name={asker} label={`Au tour de ${asker} · choisis un numéro`} />

      <div role="group" aria-label="Mode de tirage" className="grid grid-cols-2 rounded-2xl border-[3px] border-ink bg-white p-1">
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
              <span key={q.id} aria-label={label} className="flex aspect-square items-center justify-center rounded-[14px] border-[3px] border-ink bg-ink text-[18px] font-black text-pop opacity-35">
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
              className={`flex aspect-square items-center justify-center rounded-[14px] border-[3px] border-ink text-[18px] font-black shadow-[3px_3px_0_#141414] transition-transform duration-75 ${
                isRolling ? "scale-110 bg-passion text-cream" : q.level === "brulant" ? "bg-flame" : "bg-white"
              } ${mode === "manual" ? "press" : ""}`}
            >
              {i + 1}
            </button>
          );
        })}
      </div>

      <div className="sticky bottom-0 mt-auto flex flex-col gap-2 bg-pop pb-1 pt-2">
        {mode === "random" ? (
          <ActionBar primary={{ label: rolling !== null ? "Ça tourne…" : "Tirer un numéro", onClick: roll, className: "bg-passion text-cream" }} />
        ) : (
          <p className="text-center text-sm font-bold">Touche un numéro pour découvrir la question.</p>
        )}
        {playedCount > 0 && (
          <button type="button" onClick={() => void reset()} className="text-sm font-semibold underline">
            Recommencer la grille
          </button>
        )}
      </div>
    </>,
  );
}
