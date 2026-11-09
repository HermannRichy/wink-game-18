"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { LEVEL_BG, LEVEL_LABEL, fill } from "@/data/cards";
import { QUIZ } from "@/data/quiz";
import type { QuizDuoAction, QuizDuoState } from "@/lib/games/modules";
import type { Session } from "@/lib/online/session";
import { sfx } from "@/lib/sound";
import { vibrate } from "@/lib/deck";
import { Icon } from "@/components/ui";
import { GameFrame, PLAYER_BG, WaitingFor } from "@/components/game/common";

/** Le Quiz en Mode Duo ou Distance : celui qui demande tire le numéro, l'autre répond */
export function QuizDuoGame({ session, soundOn, onExit }: { session: Session<QuizDuoState, QuizDuoAction>; soundOn: boolean; onExit: () => void }) {
  const { state: s, names, genders, act, canAct, me } = session;
  const questions = useMemo(() => s.ids.map((id) => QUIZ.find((q) => q.id === id)!).filter(Boolean), [s.ids]);
  const played = useMemo(() => new Set(s.played), [s.played]);
  const [mode, setMode] = useState<"random" | "manual">("random");
  const [rolling, setRolling] = useState<number | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const asker = names[s.turn];
  const answerer = names[1 - s.turn];
  const g = { addressee: genders[1 - s.turn], other: genders[s.turn] };
  const mine = canAct(s.turn);
  const partnerIdx = me === null ? 1 : ((1 - me) as 0 | 1);
  const free = questions.map((q, i) => (played.has(q.id) ? -1 : i)).filter((i) => i >= 0);

  useEffect(() => {
    if (s.current !== null) {
      sfx.swoosh();
      vibrate(30);
    }
  }, [s.current]);

  function roll() {
    if (rolling !== null || free.length === 0) return;
    sfx.click();
    const target = free[Math.floor(Math.random() * free.length)];
    const steps = Math.min(16, Math.max(6, free.length));
    let delay = 0;
    for (let k = 0; k < steps; k++) {
      delay += 40 + k * k * 0.8;
      const last = k === steps - 1;
      const idx = last ? target : free[Math.floor(Math.random() * free.length)];
      timers.current.push(
        setTimeout(() => {
          setRolling(idx);
          sfx.tick(last);
        }, delay),
      );
    }
    timers.current.push(
      setTimeout(() => {
        sfx.go();
        setRolling(null);
        act({ t: "open", index: target }, s.turn);
      }, delay + 600),
    );
  }

  const q = s.current !== null ? questions[s.current] : null;

  return (
    <GameFrame title="Quiz" soundOn={soundOn} onExit={onExit} mode={session.mode} partnerOnline={session.partnerOnline} partnerName={names[partnerIdx]}>
      <div className="flex items-center justify-between">
        <span className={`rounded-full border-[3px] border-ink px-3.5 py-2 text-base font-extrabold ${PLAYER_BG[s.turn]}`}>
          {me === s.turn ? "Tu poses la question" : `${asker} pose la question`}
        </span>
        <span className="font-mono text-[13px] font-bold">
          {s.played.length}/{questions.length}
        </span>
      </div>

      {q ? (
        <>
          <div className="flex items-end gap-3.5">
            <span className="pop-in flex h-[120px] w-[120px] shrink-0 items-center justify-center rounded-[26px] border-[3px] border-ink bg-ink font-mono text-[60px] font-bold tracking-[-3px] text-pop shadow-[6px_6px_0_#FF2E4D]">
              {s.current! + 1}
            </span>
            <span className="flex flex-col gap-1 pb-1">
              <span className={`self-start rounded-full border-[2.5px] border-ink px-2.5 py-1 text-xs font-extrabold ${LEVEL_BG[q.level]}`}>{LEVEL_LABEL[q.level]}</span>
              <span className="text-lg font-bold">
                {asker} demande, {answerer} répond.
              </span>
            </span>
          </div>
          <div className="brutal flex flex-1 flex-col justify-between gap-6 rounded-[26px] bg-cream p-6 shadow-[6px_6px_0_#141414]">
            <p className="text-[30px] font-extrabold leading-[1.1] tracking-[-1px]">{fill(q.text, asker, answerer, g)}</p>
            <span className="flex items-center gap-2 text-sm font-semibold">
              <Icon name="heart" size={18} /> {session.distance ? "Réponds en vocal ou en appel vidéo." : "Une réponse sincère vaut un bisou."}
            </span>
          </div>
          {mine ? (
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  sfx.sparkle();
                  act({ t: "skip" }, s.turn);
                }}
                className="h-[58px] rounded-[18px] border-[3px] border-ink bg-cream text-base font-bold"
              >
                Joker · passer
              </button>
              <button
                type="button"
                onClick={() => {
                  sfx.success();
                  act({ t: "answered" }, s.turn);
                }}
                className="brutal press h-[58px] rounded-[18px] bg-passion text-[17px] font-extrabold"
              >
                RÉPONDU !
              </button>
            </div>
          ) : (
            <p className="rounded-2xl border-[3px] border-ink bg-pop p-4 text-center text-base font-extrabold">À toi de répondre, {answerer} !</p>
          )}
        </>
      ) : free.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <h1 className="text-[38px] font-black leading-[0.95] tracking-[-2px]">
            Plus aucun <span className="highlight">secret</span> !
          </h1>
          <button type="button" onClick={() => act({ t: "reset" }, me ?? 0)} className="brutal press h-[58px] w-full rounded-[18px] bg-passion text-[17px] font-extrabold">
            NOUVELLE PARTIE
          </button>
        </div>
      ) : (
        <>
          {mine && (
            <div role="group" aria-label="Mode de tirage" className="grid grid-cols-2 rounded-2xl border-[3px] border-ink bg-cream p-1">
              {(["random", "manual"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  aria-pressed={mode === m}
                  onClick={() => {
                    sfx.click();
                    setMode(m);
                  }}
                  className={`h-11 rounded-[11px] text-base font-bold ${mode === m ? "bg-ink text-cream" : ""}`}
                >
                  {m === "random" ? "Au hasard" : "Je choisis"}
                </button>
              ))}
            </div>
          )}
          <div className="grid grid-cols-5 gap-2.5">
            {questions.map((qq, i) => {
              const isPlayed = played.has(qq.id);
              const label = `Question ${i + 1}${isPlayed ? ", déjà jouée" : ""}`;
              return isPlayed ? (
                <span key={qq.id} aria-label={label} className="flex h-[52px] items-center justify-center rounded-[14px] border-[3px] border-ink bg-muted font-mono text-[17px] font-bold text-[#6B6058] line-through">
                  {i + 1}
                </span>
              ) : (
                <button
                  key={qq.id}
                  type="button"
                  aria-label={label}
                  disabled={!mine || mode !== "manual" || rolling !== null}
                  onClick={() => act({ t: "open", index: i }, s.turn)}
                  className={`flex h-[52px] items-center justify-center rounded-[14px] border-[3px] border-ink font-mono text-[17px] font-bold shadow-[3px_3px_0_#141414] ${
                    rolling === i ? "scale-110 bg-passion" : qq.level === "brulant" ? "bg-flame" : "bg-pop"
                  }`}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>
          <div className="sticky bottom-0 mt-auto bg-cream pb-1 pt-2">
            {mine ? (
              mode === "random" ? (
                <button type="button" onClick={roll} disabled={rolling !== null} className="brutal press h-[60px] w-full rounded-[18px] bg-passion text-lg font-extrabold">
                  {rolling !== null ? "ÇA TOURNE…" : "TIRER UN NUMÉRO"}
                </button>
              ) : (
                <p className="text-center text-sm font-semibold">Touche un numéro pour poser la question.</p>
              )
            ) : (
              <WaitingFor name={asker} what="choisit une question…" />
            )}
          </div>
        </>
      )}
    </GameFrame>
  );
}
