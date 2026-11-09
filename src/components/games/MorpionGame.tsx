"use client";

import { useEffect, useRef } from "react";
import { fill, gagesFor } from "@/data/cards";
import { duoChallenges, type MorpionAction, type MorpionState } from "@/lib/games/modules";
import type { Session } from "@/lib/online/session";
import { sfx } from "@/lib/sound";
import { vibrate } from "@/lib/deck";
import { GameFrame, PLAYER_BG, ScoreBar, WaitingFor } from "@/components/game/common";

function Mark({ player }: { player: 0 | 1 }) {
  return player === 0 ? (
    <svg viewBox="0 0 40 40" className="pop-in h-[64%] w-[64%]" aria-hidden="true">
      <path d="M8 8 32 32M32 8 8 32" stroke="#141414" strokeWidth="11" strokeLinecap="round" />
      <path d="M8 8 32 32M32 8 8 32" stroke="#FFA3C7" strokeWidth="6" strokeLinecap="round" />
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
    <GameFrame title="Morpion" soundOn={soundOn} onExit={onExit} mode={session.mode} partnerOnline={session.partnerOnline} partnerName={names[partnerIdx]}>
      <ScoreBar names={names} score={s.score} turn={s.winner === null ? s.turn : null} />

      <div className="flex items-center justify-between">
        <span className="font-mono text-[13px] font-bold">MANCHE {s.round}</span>
        {s.winner === null && (
          <span className={`rounded-full border-[2.5px] border-ink px-3 py-1 text-sm font-extrabold ${PLAYER_BG[s.turn]}`}>
            {me === s.turn ? "À toi !" : `Au tour de ${names[s.turn]}`}
          </span>
        )}
      </div>

      <div className="brutal grid aspect-square grid-cols-3 gap-0 overflow-hidden rounded-[24px] bg-ink shadow-[6px_6px_0_#141414]" role="grid" aria-label="Grille du morpion">
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
              className={`flex items-center justify-center border-ink ${i % 3 !== 2 ? "border-r-[3px]" : ""} ${i < 6 ? "border-b-[3px]" : ""} ${win ? "bg-pop" : "bg-cream"} ${playable ? "active:bg-muted" : ""}`}
            >
              {cell !== null && <Mark player={cell} />}
            </button>
          );
        })}
      </div>

      {s.winner === null && !canAct(s.turn) && <WaitingFor name={names[s.turn]} what="réfléchit…" />}

      {s.winner !== null && (
        <div className="pop-in flex flex-col gap-3">
          <div className="brutal flex flex-col gap-2 rounded-[22px] bg-cream p-5">
            <span className="font-mono text-xs font-bold">{s.winner === "draw" ? "MATCH NUL" : `${names[s.winner].toUpperCase()} GAGNE LA MANCHE`}</span>
            <p className="text-[24px] font-black leading-[1.1]">
              {s.winner === "draw"
                ? duoChallenges(s.distance)[s.gageIdx % duoChallenges(s.distance).length]
                : fill(gagesFor(s.distance)[s.gageIdx], names[loser!], names[s.winner], { addressee: genders[loser!], other: genders[s.winner] })}
            </p>
            {loser !== null && <span className="text-sm font-semibold">Gage pour {names[loser]}.</span>}
          </div>
          <button
            type="button"
            onClick={() => {
              sfx.swoosh();
              act({ t: "next" }, me ?? 0);
            }}
            className="brutal press h-[58px] rounded-[18px] bg-passion text-[17px] font-extrabold"
          >
            MANCHE SUIVANTE
          </button>
        </div>
      )}
    </GameFrame>
  );
}
