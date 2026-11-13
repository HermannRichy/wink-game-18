"use client";

import { useEffect, useRef } from "react";
import { fill, gagesFor } from "@/data/cards";
import { duoChallenges, type MorpionAction, type MorpionState } from "@/lib/games/modules";
import type { Session } from "@/lib/online/session";
import { sfx } from "@/lib/sound";
import { vibrate } from "@/lib/deck";
import { ActionBar, GameFrame, TurnBanner, WaitingFor } from "@/components/game/common";
import { Mascot, POSES } from "@/components/Mascot";

function Mark({ player }: { player: 0 | 1 }) {
  return player === 0 ? (
    <svg viewBox="0 0 40 40" className="pop-in h-[64%] w-[64%]" aria-hidden="true">
      <path d="M8 8 32 32M32 8 8 32" stroke="#141414" strokeWidth="11" strokeLinecap="round" />
      <path d="M8 8 32 32M32 8 8 32" stroke="#FF2E4D" strokeWidth="6" strokeLinecap="round" />
    </svg>
  ) : (
    <svg viewBox="0 0 40 40" className="pop-in h-[64%] w-[64%]" aria-hidden="true">
      <circle cx="20" cy="20" r="13" fill="none" stroke="#141414" strokeWidth="11" />
      <circle cx="20" cy="20" r="13" fill="none" stroke="#FF7A1A" strokeWidth="6" />
    </svg>
  );
}

export function MorpionGame({ session, soundOn, onExit }: { session: Session<MorpionState, MorpionAction>; soundOn: boolean; onExit: () => void }) {
  const { state: s, names, genders, act, canAct, me } = session;
  const partnerIdx = me === null ? 1 : ((1 - me) as 0 | 1);
  const prevBoard = useRef(s.board.join(","));

  // Son à chaque coup, y compris ceux de l'autre joueur en ligne
  useEffect(() => {
    const now = s.board.join(",");
    if (now !== prevBoard.current) {
      sfx.knock();
      vibrate(12);
      prevBoard.current = now;
    }
  }, [s.board]);

  useEffect(() => {
    if (s.winner === "draw") sfx.sparkle();
    else if (s.winner !== null) {
      if (me === null || me === s.winner) sfx.success();
      else sfx.fail();
      vibrate([40, 40, 80]);
    }
  }, [s.winner]); // eslint-disable-line react-hooks/exhaustive-deps

  const loser = s.winner === 0 || s.winner === 1 ? ((1 - s.winner) as 0 | 1) : null;

  return (
    <GameFrame title="Morpion" game="morpion" counter={`Manche ${s.round}`} soundOn={soundOn} onExit={onExit} mode={session.mode} partnerOnline={session.partnerOnline} partnerName={names[partnerIdx]}>
      <TurnBanner
        name={names[s.turn]}
        mine={me === s.turn}
        label={s.winner !== null ? (s.winner === "draw" ? "Match nul !" : `${names[s.winner]} gagne la manche`) : undefined}
        right={`${names[0].toUpperCase()} ${s.score[0]} · ${names[1].toUpperCase()} ${s.score[1]}`}
      />

      <div className="flex justify-center gap-2.5">
        <span className="rounded-full border-[2.5px] border-ink bg-passion px-3 py-0.5 text-[11px] font-extrabold uppercase text-cream">{names[0]} ✕</span>
        <span className="rounded-full border-[2.5px] border-ink bg-flame px-3 py-0.5 text-[11px] font-extrabold uppercase">{names[1]} ●</span>
      </div>

      <div className="mx-auto grid aspect-square w-full max-w-[340px] shrink-0 grid-cols-3 grid-rows-3 gap-3" role="grid" aria-label="Grille du morpion">
        {s.board.map((cell, i) => {
          const win = s.line?.includes(i);
          const playable = cell === null && s.winner === null && canAct(s.turn);
          return (
            <button
              key={i}
              type="button"
              disabled={!playable}
              onClick={() => act({ t: "play", cell: i }, s.turn)}
              aria-label={`Case ${i + 1}${cell === null ? ", vide" : `, ${names[cell]}`}`}
              className={`flex items-center justify-center rounded-[18px] border-[3px] border-ink ${
                cell === null ? `border-dashed bg-cream ${playable ? "active:bg-muted" : ""}` : `${win ? "bg-pop" : "bg-white"} shadow-[3px_3px_0_#141414]`
              }`}
            >
              {cell !== null && <Mark player={cell} />}
            </button>
          );
        })}
      </div>

      {s.winner === null && !canAct(s.turn) && <WaitingFor name={names[s.turn]} what="réfléchit…" />}

      {s.winner !== null && (
        <>
          <div className="pop-in brutal flex items-center gap-3 rounded-[20px] bg-pop px-4 py-3">
            <div className="-my-4 shrink-0">
              <Mascot size={72} pose={s.winner === "draw" ? POSES.brasOuverts : POSES.v} />
            </div>
            <div className="min-w-0">
              <div className="text-[17px] font-black leading-tight">
                {s.winner === "draw" ? "Égalité : défi à deux !" : `${names[s.winner]} a aligné 3 !`}
              </div>
              <p className="mt-1 text-[15px] font-bold leading-snug">
                {s.winner === "draw"
                  ? duoChallenges(s.distance)[s.gageIdx % duoChallenges(s.distance).length]
                  : fill(gagesFor(s.distance)[s.gageIdx], names[loser!], names[s.winner], { addressee: genders[loser!], other: genders[s.winner] })}
              </p>
              {loser !== null && <span className="text-xs font-extrabold uppercase">Gage pour {names[loser]}</span>}
            </div>
          </div>
          <ActionBar
            primary={{
              label: "Manche suivante",
              className: "bg-passion text-cream",
              onClick: () => {
                sfx.swoosh();
                act({ t: "next" }, me ?? 0);
              },
            }}
          />
        </>
      )}
    </GameFrame>
  );
}
