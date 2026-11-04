"use client";

import { useEffect } from "react";
import { GAGES, fill } from "@/data/cards";
import { AOV } from "@/data/aov";
import type { AovAction, AovState } from "@/lib/games/modules";
import type { Session } from "@/lib/online/session";
import { sfx } from "@/lib/sound";
import { vibrate } from "@/lib/deck";
import { useChallengeTimer } from "@/lib/useChallengeTimer";
import { GameFrame, PLAYER_BG, TimerBlock, WaitingFor } from "@/components/game/common";

const LEVEL_BG = { doux: "bg-candy", coquin: "bg-passion", brulant: "bg-flame" } as const;
const LEVEL_LABEL = { doux: "DOUX", coquin: "COQUIN", brulant: "BRÛLANT" } as const;

export function AovGame({ session, soundOn, onExit }: { session: Session<AovState, AovAction>; soundOn: boolean; onExit: () => void }) {
  const { state: s, names, genders, act, canAct, me } = session;
  const timer = useChallengeTimer();
  const card = s.cardId ? AOV.find((c) => c.id === s.cardId) : undefined;
  const moi = names[s.turn];
  const toi = names[1 - s.turn];
  const g = { addressee: genders[s.turn], other: genders[1 - s.turn] };
  const mine = canAct(s.turn);
  const partnerIdx = me === null ? 1 : ((1 - me) as 0 | 1);

  // Nouvelle carte : son + décompte si défi chronométré (sur les deux téléphones)
  useEffect(() => {
    if (s.phase === "show" && card) {
      sfx.swoosh();
      vibrate(25);
      timer.arm(card.seconds);
    } else timer.stop();
  }, [s.cardId, s.phase]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (s.phase === "gage") sfx.fail();
  }, [s.phase]);

  return (
    <GameFrame title="Action ou Vérité" soundOn={soundOn} onExit={onExit} online={session.online} partnerOnline={session.partnerOnline} partnerName={names[partnerIdx]}>
      <div className="flex items-center gap-2.5">
        <span className={`rounded-full border-[3px] border-ink px-3.5 py-2 text-base font-extrabold ${PLAYER_BG[s.turn]}`}>
          {me === s.turn ? "À toi de jouer" : `Au tour de ${moi}`}
        </span>
        <span className="font-mono text-[13px] font-bold">TOUR {s.count + 1}</span>
      </div>

      {s.phase === "choose" && (
        <div className="flex flex-1 flex-col justify-center gap-4">
          <h1 className="text-center text-[42px] font-black leading-[0.95] tracking-[-2px]">
            {moi}, <span className="highlight">action</span> ou <span className="bg-candy px-1.5">vérité</span> ?
          </h1>
          {mine ? (
            <div className="grid grid-cols-2 gap-3.5">
              <button
                type="button"
                onClick={() => {
                  sfx.click();
                  act({ t: "choose", kind: "action" }, s.turn);
                }}
                className="brutal press flex h-44 flex-col items-center justify-center gap-2 rounded-[24px] bg-pop text-[26px] font-black"
              >
                ACTION
                <span className="text-sm font-semibold">Je fais.</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  sfx.click();
                  act({ t: "choose", kind: "verite" }, s.turn);
                }}
                className="brutal press flex h-44 flex-col items-center justify-center gap-2 rounded-[24px] bg-candy text-[26px] font-black"
              >
                VÉRITÉ
                <span className="text-sm font-semibold">Je dis tout.</span>
              </button>
            </div>
          ) : (
            <WaitingFor name={moi} what="choisit…" />
          )}
        </div>
      )}

      {s.phase === "show" && card && (
        <>
          <div className={`pop-in brutal flex flex-1 flex-col justify-between gap-6 rounded-[26px] p-6 shadow-[6px_6px_0_#141414] ${card.kind === "action" ? "bg-pop" : LEVEL_BG[card.level]}`}>
            <span className="self-start rounded-full border-[2.5px] border-ink bg-cream px-3 py-1.5 text-[13px] font-extrabold tracking-wide">
              {card.kind === "action" ? "ACTION" : "VÉRITÉ"} · {LEVEL_LABEL[card.level]}
            </span>
            <p className="text-[30px] font-extrabold leading-[1.08] tracking-[-1px]">{fill(card.text, moi, toi, g)}</p>
            <TimerBlock timer={timer} seconds={card.seconds} />
          </div>
          {mine ? (
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  timer.stop();
                  act({ t: "refuse" }, s.turn);
                }}
                className="h-[58px] rounded-[18px] border-[3px] border-ink bg-cream text-base font-bold"
              >
                Refuser · gage
              </button>
              <button
                type="button"
                onClick={() => {
                  sfx.success();
                  timer.stop();
                  act({ t: "done" }, s.turn);
                }}
                className="brutal press h-[58px] rounded-[18px] bg-passion text-[17px] font-extrabold"
              >
                {card.kind === "action" ? "FAIT !" : "RÉPONDU !"}
              </button>
            </div>
          ) : (
            <WaitingFor name={moi} what={card.kind === "action" ? "relève le défi…" : "répond…"} />
          )}
        </>
      )}

      {s.phase === "gage" && (
        <>
          <div className="pop-in brutal flex flex-1 flex-col justify-center gap-3 rounded-[26px] bg-cream p-6">
            <span className="font-mono text-xs font-bold">REFUSÉ, DONC…</span>
            <p className="text-[30px] font-black leading-[1.05] tracking-tight">{fill(GAGES[s.gageIdx], moi, toi, g)}</p>
          </div>
          {mine ? (
            <button
              type="button"
              onClick={() => {
                sfx.click();
                act({ t: "gageDone" }, s.turn);
              }}
              className="brutal press h-[58px] rounded-[18px] bg-passion text-[17px] font-extrabold"
            >
              GAGE FAIT
            </button>
          ) : (
            <WaitingFor name={moi} what="fait son gage…" />
          )}
        </>
      )}
    </GameFrame>
  );
}
