"use client";

import { useEffect } from "react";
import { LEVEL_BG, LEVEL_LABEL, fill, gagesFor } from "@/data/cards";
import { cartesPool, type CartesAction, type CartesState } from "@/lib/games/modules";
import type { Session } from "@/lib/online/session";
import { markSeen } from "@/lib/seen";
import { sfx } from "@/lib/sound";
import { vibrate } from "@/lib/deck";
import { useChallengeTimer } from "@/lib/useChallengeTimer";
import { Mascot } from "@/components/Mascot";
import { ActionBar, GameEnd, GameFrame, TimerBlock, TurnBanner, WaitingFor } from "@/components/game/common";

const KIND = { question: "QUESTION", defi: "DÉFI", joker: "JOKER" } as const;

/** Les Cartes en Mode Duo ou Distance : chacun sur son téléphone */
export function CartesDuoGame({ session, soundOn, onExit }: { session: Session<CartesState, CartesAction>; soundOn: boolean; onExit: () => void }) {
  const { state: s, names, genders, act, canAct, me } = session;
  const timer = useChallengeTimer();
  const pool = cartesPool(s.distance);
  const card = s.phase === "show" || s.phase === "gage" ? pool.find((c) => c.id === s.deck[s.index]) : undefined;
  const moi = names[s.turn];
  const toi = names[1 - s.turn];
  const g = { addressee: genders[s.turn], other: genders[1 - s.turn] };
  const mine = canAct(s.turn);
  const partnerIdx = me === null ? 1 : ((1 - me) as 0 | 1);
  const T = (action: CartesAction) => act(action, s.turn);

  useEffect(() => {
    if (s.phase === "show" && card) {
      markSeen("cartes", card.id, card.text);
      sfx.swoosh();
      vibrate(25);
      if (card.kind === "joker") sfx.sparkle();
      timer.arm(card.seconds);
    } else timer.stop();
    if (s.phase === "gage") sfx.fail();
  }, [s.phase, s.index]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <GameFrame title="Cartes" game="cartes" counter={`${Math.min(s.index + 1, s.deck.length)}/${s.deck.length}`} soundOn={soundOn} onExit={onExit} mode={session.mode} partnerOnline={session.partnerOnline} partnerName={names[partnerIdx]}>
      {s.phase !== "done" && (
        <TurnBanner
          name={moi}
          mine={me === s.turn}
          label={me === s.turn ? "À toi de piocher" : undefined}
          right={s.together ? "À DEUX" : s.passes[s.turn] > 0 ? `JOKER ×${s.passes[s.turn]}` : undefined}
        />
      )}

      {s.phase === "draw" && (
        <div className="flex flex-1 flex-col justify-center gap-5">
          <button
            type="button"
            disabled={!mine}
            onClick={() => T({ t: "draw" })}
            className="brutal flex h-[380px] flex-col items-center justify-center gap-3.5 rounded-[28px] bg-ink shadow-[6px_6px_0_#FF2E4D]"
            aria-label="Piocher la carte"
          >
            <Mascot size={130} shadow={false} />
            <span className="text-[30px] font-black tracking-[-1px] text-cream">wink</span>
            <span className="text-sm font-semibold text-cream/80">{mine ? "Touche pour piocher" : `${moi} va piocher…`}</span>
          </button>
          {mine && s.passes[s.turn] > 0 && <p className="text-center text-sm font-bold">Tu as {s.passes[s.turn]} joker(s) en poche.</p>}
        </div>
      )}

      {s.phase === "show" && card && (
        <>
          <div className="relative mx-2 mt-1 min-h-[360px] flex-1">
            <div className="absolute inset-0 translate-x-2.5 translate-y-1.5 rotate-[5deg] rounded-[28px] border-[3px] border-ink bg-pop" />
            <div className="absolute inset-0 -rotate-3 rounded-[28px] border-[3px] border-ink bg-candy" />
            <div className={`pop-in brutal absolute inset-0 flex flex-col gap-6 rounded-[28px] p-5 shadow-[6px_6px_0_#141414] ${card.kind === "joker" ? "bg-pop" : "bg-white"}`}>
              <span className={`self-start rounded-full border-[2.5px] border-ink px-3 py-1 text-[12px] font-extrabold tracking-wide ${card.kind === "joker" ? "bg-cream" : LEVEL_BG[card.level]}`}>
                {KIND[card.kind]} · {LEVEL_LABEL[card.level]}
              </span>
              <p className="text-[29px] font-black leading-[1.1] tracking-[-1px]">{fill(card.text, moi, toi, g)}</p>
              <div className="mt-auto">
                <TimerBlock timer={timer} seconds={card.seconds} />
              </div>
            </div>
          </div>
          {!mine ? (
            <WaitingFor name={moi} what={card.kind === "question" ? "répond…" : "relève le défi…"} />
          ) : card.kind === "joker" ? (
            <ActionBar
              primary={{
                label: card.joker === "rejouer" ? "Je rejoue" : card.joker === "passer" ? "Je garde mon joker" : "On le joue à deux",
                onClick: () => T({ t: "joker" }),
                className: "bg-ink text-pop",
              }}
            />
          ) : (
            <div className="mt-auto flex flex-col gap-2">
              <ActionBar
                secondary={{
                  label: "Passer · gage",
                  onClick: () => {
                    timer.stop();
                    T({ t: "refuse" });
                  },
                }}
                primary={{
                  label: "C'est fait",
                  icon: true,
                  onClick: () => {
                    sfx.success();
                    timer.stop();
                    T({ t: "done" });
                  },
                }}
              />
              {s.passes[s.turn] > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    sfx.sparkle();
                    timer.stop();
                    T({ t: "usePass" });
                  }}
                  className="text-sm font-bold underline"
                >
                  Utiliser un joker pour passer sans gage
                </button>
              )}
            </div>
          )}
        </>
      )}

      {s.phase === "gage" && (
        <>
          <div className="pop-in brutal flex flex-1 flex-col justify-center gap-3 rounded-[28px] bg-white p-6">
            <span className="self-start rounded-full border-[2.5px] border-ink bg-passion px-3 py-1 text-[12px] font-extrabold text-cream">REFUSÉ, DONC… GAGE</span>
            <p className="text-[30px] font-black leading-[1.05] tracking-tight">{fill(gagesFor(s.distance)[s.gageIdx], moi, toi, g)}</p>
          </div>
          {mine ? (
            <ActionBar
              primary={{
                label: "Gage fait",
                icon: true,
                onClick: () => {
                  sfx.click();
                  T({ t: "gageDone" });
                },
              }}
            />
          ) : (
            <WaitingFor name={moi} what="fait son gage…" />
          )}
        </>
      )}

      {s.phase === "done" && (
        <GameEnd
          label="PIOCHE VIDÉE"
          title={
            <>
              Belle partie,
              <br />
              {names[0]} &amp; {names[1]}.
            </>
          }
          stats={[{ value: s.deck.length, label: "cartes piochées" }]}
          replayLabel="Rejouer aux Cartes"
          onReplay={() => act({ t: "restart" }, me ?? 0)}
          onExit={onExit}
        />
      )}
    </GameFrame>
  );
}
