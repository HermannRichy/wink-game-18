"use client";

import { useEffect } from "react";
import { LEVEL_BG, LEVEL_LABEL, fill, gagesFor } from "@/data/cards";
import { aovPool, type AovAction, type AovState } from "@/lib/games/modules";
import { markSeen } from "@/lib/seen";
import type { Session } from "@/lib/online/session";
import { sfx } from "@/lib/sound";
import { vibrate } from "@/lib/deck";
import { useChallengeTimer } from "@/lib/useChallengeTimer";
import { ActionBar, GameFrame, TimerBlock, TurnBanner, WaitingFor } from "@/components/game/common";
import { Mascot, POSES } from "@/components/Mascot";


export function AovGame({ session, soundOn, onExit }: { session: Session<AovState, AovAction>; soundOn: boolean; onExit: () => void }) {
  const { state: s, names, genders, act, canAct, me } = session;
  const timer = useChallengeTimer();
  const card = s.cardId ? aovPool(s.distance).find((c) => c.id === s.cardId) : undefined;
  const moi = names[s.turn];
  const toi = names[1 - s.turn];
  const g = { addressee: genders[s.turn], other: genders[1 - s.turn] };
  const mine = canAct(s.turn);
  const partnerIdx = me === null ? 1 : ((1 - me) as 0 | 1);

  // Nouvelle carte : son + décompte si défi chronométré (sur les deux téléphones)
  useEffect(() => {
    if (s.phase === "show" && card) {
      markSeen("aov", card.id);
      sfx.swoosh();
      vibrate(25);
      timer.arm(card.seconds);
    } else timer.stop();
  }, [s.cardId, s.phase]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (s.phase === "gage") sfx.fail();
  }, [s.phase]);

  return (
    <GameFrame title="Action ou Vérité" game="aov" counter={`Tour ${s.count + 1}`} className="bg-passion" soundOn={soundOn} onExit={onExit} mode={session.mode} partnerOnline={session.partnerOnline} partnerName={names[partnerIdx]}>
      <TurnBanner name={moi} mine={me === s.turn} />

      {s.phase === "choose" && (
        <div className="relative flex flex-1 flex-col gap-4 pt-2">
          <h1 className="text-center text-[38px] font-black leading-[0.98] tracking-[-2px]">
            Tu choisis
            <br />
            quoi, {moi} ?
          </h1>
          {mine ? (
            <div className="flex flex-col gap-4">
              <button
                type="button"
                onClick={() => {
                  sfx.click();
                  act({ t: "choose", kind: "action" }, s.turn);
                }}
                className="brutal press relative flex h-[150px] flex-col items-start justify-start rounded-[28px] bg-ink px-5 py-4 text-left text-pop shadow-[6px_6px_0_#FFD93D]"
              >
                <span className="font-mono text-[11px] font-bold tracking-[0.14em] text-cream">ON BOUGE</span>
                <span className="mt-1 text-[50px] font-black leading-none tracking-[-2.5px]">ACTION</span>
                <span className="absolute bottom-2 right-5 text-[64px] font-black leading-none text-passion" aria-hidden="true">!</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  sfx.click();
                  act({ t: "choose", kind: "verite" }, s.turn);
                }}
                className="brutal press relative flex h-[150px] flex-col items-start justify-start rounded-[28px] bg-pop px-5 py-4 text-left"
              >
                <span className="font-mono text-[11px] font-bold tracking-[0.14em]">ON PARLE</span>
                <span className="mt-1 text-[50px] font-black leading-none tracking-[-2.5px]">VÉRITÉ</span>
                <span className="absolute bottom-2 right-5 text-[64px] font-black leading-none" aria-hidden="true">?</span>
              </button>
            </div>
          ) : (
            <>
              <div className="flex justify-center">
                <Mascot size={150} pose={POSES.clin} interactive />
              </div>
              <WaitingFor name={moi} what="choisit…" />
            </>
          )}
        </div>
      )}

      {s.phase === "show" && card && (
        <>
          <div className="pop-in brutal flex min-h-[340px] flex-1 flex-col gap-6 rounded-[28px] bg-white p-5 shadow-[6px_6px_0_#141414]">
            <span className={`self-start rounded-full border-[2.5px] border-ink px-3 py-1 text-[12px] font-extrabold tracking-wide ${card.kind === "action" ? "bg-ink text-pop" : LEVEL_BG[card.level]}`}>
              {card.kind === "action" ? "ACTION" : "VÉRITÉ"} · {LEVEL_LABEL[card.level]}
            </span>
            <p className="text-[29px] font-black leading-[1.1] tracking-[-1px]">{fill(card.text, moi, toi, g)}</p>
            <div className="mt-auto">
              <TimerBlock timer={timer} seconds={card.seconds} />
            </div>
          </div>
          {mine ? (
            <ActionBar
              secondary={{
                label: "Passer · gage",
                onClick: () => {
                  timer.stop();
                  act({ t: "refuse" }, s.turn);
                },
              }}
              primary={{
                label: card.kind === "action" ? "C'est fait" : "J'ai répondu",
                icon: true,
                className: "bg-ink text-pop",
                onClick: () => {
                  sfx.success();
                  timer.stop();
                  act({ t: "done" }, s.turn);
                },
              }}
            />
          ) : (
            <WaitingFor name={moi} what={card.kind === "action" ? "relève le défi…" : "répond…"} />
          )}
        </>
      )}

      {s.phase === "gage" && (
        <>
          <div className="pop-in brutal flex flex-1 flex-col justify-center gap-3 rounded-[28px] bg-white p-6">
            <span className="self-start rounded-full border-[2.5px] border-ink bg-pop px-3 py-1 text-[12px] font-extrabold">REFUSÉ, DONC… GAGE</span>
            <p className="text-[30px] font-black leading-[1.05] tracking-tight">{fill(gagesFor(s.distance)[s.gageIdx], moi, toi, g)}</p>
          </div>
          {mine ? (
            <ActionBar
              primary={{
                label: "Gage fait",
                icon: true,
                className: "bg-ink text-pop",
                onClick: () => {
                  sfx.click();
                  act({ t: "gageDone" }, s.turn);
                },
              }}
            />
          ) : (
            <WaitingFor name={moi} what="fait son gage…" />
          )}
        </>
      )}
    </GameFrame>
  );
}
