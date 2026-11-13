"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { LEVEL_BG, LEVEL_LABEL, fill } from "@/data/cards";
import { QUIZ } from "@/data/quiz";
import type { QuizDuoAction, QuizDuoState } from "@/lib/games/modules";
import type { Session } from "@/lib/online/session";
import { sfx } from "@/lib/sound";
import { vibrate } from "@/lib/deck";
import { ActionBar, GameEnd, GameFrame, TurnBanner, WaitingFor } from "@/components/game/common";
import { Mascot, POSES } from "@/components/Mascot";

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
    <GameFrame title="Quiz" game="quiz" counter={`${s.played.length}/${questions.length}`} className="bg-pop" soundOn={soundOn} onExit={onExit} mode={session.mode} partnerOnline={session.partnerOnline} partnerName={names[partnerIdx]}>
      {(q || free.length > 0) && (
        <TurnBanner
          name={asker}
          label={q ? `${asker} demande, ${answerer} répond` : me === s.turn ? "À toi · choisis un numéro" : `Au tour de ${asker} · choisis un numéro`}
        />
      )}

      {q ? (
        <>
          <div className="mt-1 flex items-end gap-3.5">
            <span className="pop-in flex h-[110px] w-[110px] shrink-0 items-center justify-center rounded-[26px] border-[3px] border-ink bg-ink font-mono text-[56px] font-bold tracking-[-3px] text-pop shadow-[6px_6px_0_#FF2E4D]">
              {s.current! + 1}
            </span>
            <span className={`mb-1 rounded-full border-[2.5px] border-ink px-3 py-1 text-[12px] font-extrabold ${LEVEL_BG[q.level]}`}>VÉRITÉ · {LEVEL_LABEL[q.level]}</span>
          </div>
          <div className="brutal relative flex flex-1 flex-col rounded-[24px] bg-white p-5 pb-24">
            <p className="max-w-[94%] text-[27px] font-black leading-[1.12] tracking-[-1px]">{fill(q.text, asker, answerer, g)}</p>
            <p className="mt-auto max-w-[60%] pt-4 text-sm font-bold">{session.distance ? "Réponds en vocal ou en appel vidéo." : "Une réponse sincère vaut un bisou."}</p>
            <div className="pointer-events-none absolute -bottom-3 -right-2">
              <Mascot size={112} pose={POSES.v} />
            </div>
          </div>
          {mine ? (
            <ActionBar
              secondary={{
                label: "Joker · passer",
                onClick: () => {
                  sfx.sparkle();
                  act({ t: "skip" }, s.turn);
                },
              }}
              primary={{
                label: "J'ai répondu",
                className: "bg-ink text-pop",
                onClick: () => {
                  sfx.success();
                  act({ t: "answered" }, s.turn);
                },
              }}
            />
          ) : (
            <p className="mt-auto rounded-[18px] border-[3px] border-ink bg-white p-4 text-center text-base font-extrabold">À toi de répondre, {answerer} !</p>
          )}
        </>
      ) : free.length === 0 ? (
        <GameEnd
          label="PLUS AUCUN SECRET"
          title={
            <>
              Belle partie,
              <br />
              {names[0]} &amp; {names[1]}.
            </>
          }
          stats={[{ value: s.played.length, label: "questions posées" }]}
          replayLabel="Nouvelle grille"
          onReplay={() => act({ t: "reset" }, me ?? 0)}
          onExit={onExit}
        />
      ) : (
        <>
          {mine && (
            <div role="group" aria-label="Mode de tirage" className="grid grid-cols-2 rounded-2xl border-[3px] border-ink bg-white p-1">
              {(["random", "manual"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  aria-pressed={mode === m}
                  onClick={() => {
                    sfx.click();
                    setMode(m);
                  }}
                  className={`h-10 rounded-[11px] text-[15px] font-bold ${mode === m ? "bg-ink text-cream" : ""}`}
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
                <span key={qq.id} aria-label={label} className="flex aspect-square items-center justify-center rounded-[14px] border-[3px] border-ink bg-ink text-[18px] font-black text-pop opacity-35">
                  {i + 1}
                </span>
              ) : (
                <button
                  key={qq.id}
                  type="button"
                  aria-label={label}
                  disabled={!mine || mode !== "manual" || rolling !== null}
                  onClick={() => act({ t: "open", index: i }, s.turn)}
                  className={`flex aspect-square items-center justify-center rounded-[14px] border-[3px] border-ink text-[18px] font-black shadow-[3px_3px_0_#141414] ${
                    rolling === i ? "scale-110 bg-passion text-cream" : qq.level === "brulant" ? "bg-flame" : "bg-white"
                  }`}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>
          <div className="sticky bottom-0 mt-auto bg-pop pb-1 pt-2">
            {mine ? (
              mode === "random" ? (
                <ActionBar primary={{ label: rolling !== null ? "Ça tourne…" : "Tirer un numéro", onClick: roll, className: "bg-passion text-cream" }} />
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
