"use client";

import { useEffect, useRef, useState } from "react";
import { GAGES, fill, type Gender } from "@/data/cards";
import { LUDO_CAPTURE, LUDO_FINAL, LUDO_HOME, LUDO_HOT_CELL, LUDO_SIX, type LudoText } from "@/data/ludo";
import { db, type Settings } from "@/lib/db";
import { vibrate } from "@/lib/deck";
import { freshIndex, markSeen, orderFresh, pickFresh } from "@/lib/seen";
import { FINISH, applyMove, movablePawns, newPawns, pathOf, type Pawns } from "@/lib/ludo";
import { sfx } from "@/lib/sound";
import { formatTime, useChallengeTimer } from "@/lib/useChallengeTimer";
import { Dice3D } from "@/components/ludo/Dice3D";
import { LudoBoard } from "@/components/ludo/LudoBoard";
import { Mascot } from "@/components/Mascot";
import { Icon, IconButton, SoundToggle } from "@/components/ui";

type Phase = "roll" | "rolling" | "pick" | "moving" | "event" | "won";

type GameEvent =
  | { kind: "capture"; who: number; text: LudoText }
  | { kind: "hot"; who: number; options: LudoText[]; chosen: LudoText | null; refused: string | null }
  | { kind: "six"; who: number; text: LudoText }
  | { kind: "home"; who: number; text: LudoText };

const PLAYER_BG = ["bg-candy", "bg-flame"];
const EVENT_TITLE: Record<GameEvent["kind"], string> = {
  capture: "CAPTURE !",
  hot: "CASE BRÛLANTE",
  six: "BONUS DU 6",
  home: "RÉCOMPENSE",
};

export function LudoGame({ settings, onExit }: { settings: Settings; onExit: () => void }) {
  const names: [string, string] = [settings.player1, settings.player2];
  const genders: [Gender, Gender] = [settings.player1Gender, settings.player2Gender];

  const [loaded, setLoaded] = useState(false);
  const [pawns, setPawns] = useState<Pawns>(newPawns);
  const [turn, setTurn] = useState(0);
  const [dice, setDice] = useState(1);
  const [rollId, setRollId] = useState(0);
  const [phase, setPhase] = useState<Phase>("roll");
  const [movable, setMovable] = useState<number[]>([]);
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [winner, setWinner] = useState<number | null>(null);
  const [finalOptions, setFinalOptions] = useState<LudoText[]>([]);
  const [finalChoice, setFinalChoice] = useState<LudoText | null>(null);
  const timer = useChallengeTimer();
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const later = (fn: () => void, ms: number) => timers.current.push(setTimeout(fn, ms));
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  // Reprise de la partie sauvegardée
  useEffect(() => {
    db.ludo.get("current").then((save) => {
      if (save) {
        setPawns(save.pawns);
        setTurn(save.turn);
      }
      setLoaded(true);
    });
  }, []);

  function save(p: Pawns, t: number) {
    void db.ludo.put({ id: "current", pawns: p, turn: t, updatedAt: Date.now() });
  }

  const say = (text: string, who: number) => fill(text, names[who], names[1 - who], { addressee: genders[who], other: genders[1 - who] });

  // ——— Lancer du dé ———
  function roll() {
    if (phase !== "roll") return;
    const value = 1 + Math.floor(Math.random() * 6);
    setDice(value);
    setRollId((n) => n + 1);
    setPhase("rolling");
    setStatus(null);
    sfx.swoosh();
    vibrate(20);
    [120, 300, 520, 760].forEach((ms) => later(() => sfx.knock(), ms));

    later(() => {
      const options = movablePawns(pawns, turn, value);
      if (options.length === 0) {
        setStatus(value === 6 ? "Aucun pion ne peut bouger." : "Pas de 6, aucun pion ne sort. Au suivant !");
        later(() => endTurn(false, pawns), 1300);
        return;
      }
      if (options.length === 1) {
        later(() => move(options[0], value), 350);
        return;
      }
      setMovable(options);
      setPhase("pick");
      setStatus("Choisis le pion à avancer.");
    }, 1000);
  }

  // ——— Déplacement case par case ———
  function move(pawn: number, value: number) {
    setPhase("moving");
    setMovable([]);
    setStatus(null);
    const start = pawns;
    const steps = pathOf(start[turn][pawn], value);
    steps.forEach((progress, s) => {
      later(() => {
        setPawns((prev) => {
          const next: Pawns = [[...prev[0]], [...prev[1]]];
          next[turn][pawn] = progress;
          return next;
        });
        sfx.tick(s === steps.length - 1);
      }, 170 * (s + 1));
    });

    later(() => {
      const result = applyMove(start, turn, pawn, value);
      setPawns(result.pawns);
      const queue: GameEvent[] = [];
      if (result.captured.length) {
        sfx.fail();
        vibrate([60, 40, 60]);
        queue.push({ kind: "capture", who: 1 - turn, text: pickFresh("ludo_capture", LUDO_CAPTURE, (t) => t.id) });
      }
      if (result.hot) {
        sfx.sparkle();
        queue.push({ kind: "hot", who: turn, options: orderFresh("ludo_hot", LUDO_HOT_CELL, (t) => t.id).slice(0, 2), chosen: null, refused: null });
      }
      if (result.reachedHome) {
        sfx.success();
        queue.push({ kind: "home", who: turn, text: pickFresh("ludo_home", LUDO_HOME, (t) => t.id) });
      }
      if (result.won) {
        setWinner(turn);
        setFinalOptions(orderFresh("ludo_final", LUDO_FINAL, (t) => t.id).slice(0, 3));
        void db.ludo.delete("current");
        if (queue.length) {
          setEvents(queue);
          startEvent(queue[0]);
          setPhase("event");
        } else {
          later(() => {
            sfx.success();
            setPhase("won");
          }, 500);
        }
        return;
      }
      if (value === 6) queue.push({ kind: "six", who: turn, text: pickFresh("ludo_six", LUDO_SIX, (t) => t.id) });
      if (queue.length) {
        setEvents(queue);
        startEvent(queue[0]);
        setPhase("event");
      } else {
        endTurn(value === 6, result.pawns);
      }
    }, 170 * steps.length + 200);
  }

  function startEvent(e: GameEvent) {
    if (e.kind === "hot") timer.stop();
    else timer.arm(e.text.seconds);
  }

  function nextEvent() {
    timer.stop();
    const [, ...rest] = events;
    setEvents(rest);
    if (rest.length) {
      startEvent(rest[0]);
      return;
    }
    if (winner !== null) {
      setPhase("won");
      return;
    }
    endTurn(dice === 6, pawns);
  }

  function endTurn(replay: boolean, p: Pawns) {
    const next = replay ? turn : 1 - turn;
    setTurn(next);
    setPhase("roll");
    setStatus(replay ? "Un 6 : rejoue !" : null);
    save(p, next);
  }

  function chooseHot(option: LudoText) {
    sfx.click();
    markSeen("ludo_hot", option.id);
    setEvents((list) => {
      const [first, ...rest] = list;
      if (first?.kind !== "hot") return list;
      return [{ ...first, chosen: option }, ...rest];
    });
    timer.arm(option.seconds);
  }

  function refuseHot() {
    sfx.fail();
    timer.stop();
    setEvents((list) => {
      const [first, ...rest] = list;
      if (first?.kind !== "hot") return list;
      return [{ ...first, refused: say(GAGES[freshIndex("gages", GAGES.length)], first.who) }, ...rest];
    });
  }

  function newGame() {
    if (phase !== "won" && !window.confirm("Recommencer une nouvelle partie ?")) return;
    sfx.swoosh();
    timers.current.forEach(clearTimeout);
    const fresh = newPawns();
    setPawns(fresh);
    setTurn(winner === null ? 0 : 1 - winner);
    setPhase("roll");
    setEvents([]);
    setWinner(null);
    setFinalChoice(null);
    setStatus(null);
    void db.ludo.delete("current");
  }

  const event = events[0];
  const home = pawns.map((list) => list.filter((p) => p === FINISH).length);

  // ——— Timer réutilisable ———
  const timerUi = (seconds?: number) =>
    seconds ? (
      timer.prep !== null ? (
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
      ) : (
        <button
          type="button"
          onClick={timer.go}
          disabled={timer.timeLeft !== null && timer.timeLeft > 0}
          aria-live="polite"
          className={`flex items-center gap-2 self-start rounded-full border-[2.5px] border-ink px-3.5 py-2 font-mono text-base font-bold ${
            timer.timeLeft !== null && timer.timeLeft > 0 && timer.timeLeft <= 5 ? "bg-passion text-ink" : "bg-ink text-pop"
          }`}
        >
          <Icon name="timer" size={16} stroke={2.8} />
          {timer.timeLeft === null ? `${formatTime(seconds)} · LANCER` : timer.timeLeft === 0 ? "TERMINÉ ! · RELANCER" : formatTime(timer.timeLeft)}
        </button>
      )
    ) : null;

  // ——— Victoire ———
  if (phase === "won" && winner !== null) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-5 bg-pop px-6 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(1.75rem,env(safe-area-inset-top))]">
        <span className="text-[30px] font-black tracking-[-1.5px]">wink</span>
        <div className="pop-in flex flex-col items-center gap-4 text-center">
          <Mascot size={130} interactive className="float" />
          <h1 className="text-[40px] font-black leading-[0.95] tracking-[-2px]">
            {names[winner]} <span className="bg-cream px-1.5">gagne</span> !
          </h1>
        </div>
        {finalChoice ? (
          <div className="pop-in brutal flex flex-col gap-2 rounded-[22px] bg-cream p-5">
            <span className="font-mono text-xs font-bold">RÉCOMPENSE CHOISIE</span>
            <p className="text-[22px] font-extrabold leading-tight">{say(finalChoice.text, winner)}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-center text-base font-semibold">{names[winner]}, choisis ta récompense :</p>
            {finalOptions.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => {
                  sfx.sparkle();
                  markSeen("ludo_final", o.id);
                setFinalChoice(o);
                }}
                className="brutal-sm press rounded-2xl bg-cream p-4 text-left text-[17px] font-bold leading-snug"
              >
                {say(o.text, winner)}
              </button>
            ))}
          </div>
        )}
        <div className="mt-auto flex flex-col gap-3">
          <button type="button" onClick={newGame} className="press h-[60px] rounded-[18px] border-[3px] border-ink bg-ink text-lg font-extrabold text-cream shadow-[5px_5px_0_#FF2E4D]">
            NOUVELLE PARTIE
          </button>
          <button
            type="button"
            onClick={() => {
              sfx.click();
              onExit();
            }}
            className="h-14 rounded-[18px] border-[3px] border-ink bg-cream text-base font-semibold"
          >
            Retour à l'accueil
          </button>
        </div>
      </main>
    );
  }

  const moi = names[turn];

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 bg-cream px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))]">
      <div className="flex items-center justify-between">
        <IconButton
          label="Retour à l'accueil"
          icon="back"
          onClick={() => {
            sfx.click();
            onExit();
          }}
        />
        <span className="flex items-center gap-2 text-[22px] font-extrabold">
          Ludo <span className="rounded-full border-2 border-ink bg-passion px-2 py-0.5 text-[11px] font-extrabold">HOT</span>
        </span>
        <SoundToggle on={settings.soundOn} />
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {names.map((n, i) => (
          <div
            key={i}
            className={`flex items-center justify-between rounded-2xl border-[3px] border-ink px-3 py-2 ${PLAYER_BG[i]} ${turn === i ? "shadow-[4px_4px_0_#141414]" : "opacity-60"}`}
          >
            <span className="truncate text-base font-extrabold">{n}</span>
            <span className="font-mono text-sm font-bold">{home[i]}/4</span>
          </div>
        ))}
      </div>

      <div className="brutal overflow-hidden rounded-[18px] bg-cream p-1.5 shadow-[6px_6px_0_#141414]">
        {loaded && <LudoBoard pawns={pawns} movable={phase === "pick" ? movable : []} player={turn} names={names} onPick={(i) => move(i, dice)} />}
      </div>

      <div className="flex items-stretch gap-3.5">
        <button
          type="button"
          onClick={roll}
          disabled={phase !== "roll"}
          aria-label={phase === "roll" ? `Lancer le dé, au tour de ${moi}` : `Dé : ${dice}`}
          className={`flex w-[108px] shrink-0 flex-col items-center justify-center gap-1.5 rounded-[20px] border-[3px] border-ink bg-pop py-3 ${phase === "roll" ? "press shadow-[5px_5px_0_#141414]" : ""}`}
        >
          <Dice3D value={dice} rollId={rollId} size={52} />
          <span className="text-[13px] font-extrabold">{phase === "roll" ? "LANCER" : `${dice}`}</span>
        </button>
        <div className={`flex flex-1 flex-col justify-center gap-1 rounded-[20px] border-[3px] border-ink px-4 py-3 ${PLAYER_BG[turn]}`}>
          <span className="font-mono text-xs font-bold">AU TOUR DE</span>
          <span className="text-xl font-extrabold leading-tight">{moi}</span>
          <span className="text-sm font-semibold leading-snug">{status ?? (phase === "roll" ? "Touche le dé pour lancer." : phase === "pick" ? "Choisis le pion à avancer." : "…")}</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-[12px] font-bold">
        <span className="flex items-center gap-1 rounded-full border-2 border-ink bg-ink px-2 py-1 text-pop">FLAMME = DÉFI</span>
        <span className="rounded-full border-2 border-ink px-2 py-1">CAPTURE = GAGE</span>
        <span className="rounded-full border-2 border-ink px-2 py-1">6 = BONUS</span>
        <span className="rounded-full border-2 border-ink px-2 py-1">ÉTOILE = PROTÉGÉ</span>
        <button type="button" onClick={newGame} className="ml-auto underline">
          Nouvelle partie
        </button>
      </div>

      {/* Événements hot */}
      {phase === "event" && event && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/60 p-4" role="dialog" aria-modal="true" aria-labelledby="ludo-event">
          <div className="pop-in flex w-full max-w-md flex-col gap-4 rounded-[26px] border-[3px] border-ink bg-cream p-5 shadow-[6px_6px_0_#FF2E4D]">
            <span className="font-mono text-xs font-bold">
              {EVENT_TITLE[event.kind]} · {names[event.who]}
            </span>

            {event.kind === "hot" && !event.chosen && (
              <>
                <h2 id="ludo-event" className="text-[24px] font-black leading-[1.05] tracking-tight">
                  {names[1 - event.who]}, choisis le défi de {names[event.who]} :
                </h2>
                {event.options.map((o) => (
                  <button key={o.id} type="button" onClick={() => chooseHot(o)} className="brutal-sm press rounded-2xl bg-pop p-4 text-left text-[17px] font-bold leading-snug">
                    {say(o.text, event.who)}
                  </button>
                ))}
              </>
            )}

            {event.kind === "hot" && event.chosen && event.refused && (
              <>
                <h2 id="ludo-event" className="text-[24px] font-black leading-[1.05] tracking-tight">
                  {event.refused}
                </h2>
                <button type="button" onClick={nextEvent} className="brutal press h-14 rounded-2xl bg-passion text-base font-extrabold">
                  GAGE FAIT
                </button>
              </>
            )}

            {event.kind === "hot" && event.chosen && !event.refused && (
              <>
                <h2 id="ludo-event" className="text-[24px] font-extrabold leading-[1.1]">
                  {say(event.chosen.text, event.who)}
                </h2>
                {timerUi(event.chosen.seconds)}
                <div className="grid grid-cols-2 gap-3">
                  <button type="button" onClick={refuseHot} className="h-14 rounded-2xl border-[3px] border-ink bg-cream text-base font-bold">
                    Refuser · gage
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      sfx.success();
                      nextEvent();
                    }}
                    className="brutal press h-14 rounded-2xl bg-pop text-[17px] font-extrabold"
                  >
                    FAIT !
                  </button>
                </div>
              </>
            )}

            {event.kind !== "hot" && (
              <>
                <h2 id="ludo-event" className="text-[24px] font-extrabold leading-[1.1]">
                  {say(event.text.text, event.who)}
                </h2>
                {timerUi(event.text.seconds)}
                <button
                  type="button"
                  onClick={() => {
                    if (event.kind === "six") sfx.sparkle();
                    else sfx.success();
                    nextEvent();
                  }}
                  className="brutal press h-14 rounded-2xl bg-pop text-[17px] font-extrabold"
                >
                  {event.kind === "six" ? "FAIT, JE REJOUE" : event.kind === "home" ? "MERCI !" : "GAGE FAIT"}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
