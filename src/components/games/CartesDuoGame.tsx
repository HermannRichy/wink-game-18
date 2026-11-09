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
import { GameFrame, PLAYER_BG, TimerBlock, WaitingFor } from "@/components/game/common";

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
      markSeen("cartes", card.id);
      sfx.swoosh();
      vibrate(25);
      if (card.kind === "joker") sfx.sparkle();
      timer.arm(card.seconds);
    } else timer.stop();
    if (s.phase === "gage") sfx.fail();
  }, [s.phase, s.index]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <GameFrame title="Cartes" soundOn={soundOn} onExit={onExit} mode={session.mode} partnerOnline={session.partnerOnline} partnerName={names[partnerIdx]}>
      <div className="flex items-center gap-2.5">
        <span className={`rounded-full border-[3px] border-ink px-3.5 py-2 text-base font-extrabold ${PLAYER_BG[s.turn]}`}>
          {me === s.turn ? "À toi de piocher" : `Au tour de ${moi}`}
        </span>
        {s.together && <span className="rounded-full border-[2.5px] border-ink bg-pop px-2.5 py-1 text-xs font-extrabold">À DEUX</span>}
        <span className="ml-auto font-mono text-[13px] font-bold">
          {Math.min(s.index + 1, s.deck.length)}/{s.deck.length}
        </span>
      </div>

      {s.phase === "draw" && (
        <div className="flex flex-1 flex-col justify-center gap-5">
          <button
            type="button"
            disabled={!mine}
            onClick={() => T({ t: "draw" })}
            className="brutal flex h-[360px] flex-col items-center justify-center gap-3.5 rounded-[26px] bg-ink shadow-[6px_6px_0_#FF2E4D]"
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
          <div className={`pop-in brutal flex flex-1 flex-col justify-between gap-6 rounded-[26px] p-6 shadow-[6px_6px_0_#141414] ${card.kind === "joker" ? "bg-pop" : LEVEL_BG[card.level]}`}>
            <span className="self-start rounded-full border-[2.5px] border-ink bg-cream px-3 py-1.5 text-[13px] font-extrabold tracking-wide">
              {KIND[card.kind]} · {LEVEL_LABEL[card.level]}
            </span>
            <p className="text-[30px] font-extrabold leading-[1.08] tracking-[-1px]">{fill(card.text, moi, toi, g)}</p>
            <TimerBlock timer={timer} seconds={card.seconds} />
          </div>
          {!mine ? (
            <WaitingFor name={moi} what={card.kind === "question" ? "répond…" : "relève le défi…"} />
          ) : card.kind === "joker" ? (
            <button type="button" onClick={() => T({ t: "joker" })} className="brutal press h-[58px] rounded-[18px] bg-pop text-[17px] font-extrabold">
              {card.joker === "rejouer" ? "JE REJOUE" : card.joker === "passer" ? "JE GARDE MON JOKER" : "OK, ON LE JOUE À DEUX"}
            </button>
          ) : (
            <div className="flex flex-col gap-2.5">
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    timer.stop();
                    T({ t: "refuse" });
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
                    T({ t: "done" });
                  }}
                  className="brutal press h-[58px] rounded-[18px] bg-passion text-[17px] font-extrabold"
                >
                  FAIT !
                </button>
              </div>
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
          <div className="pop-in brutal flex flex-1 flex-col justify-center gap-3 rounded-[26px] bg-cream p-6">
            <span className="font-mono text-xs font-bold">REFUSÉ, DONC…</span>
            <p className="text-[30px] font-black leading-[1.05] tracking-tight">{fill(gagesFor(s.distance)[s.gageIdx], moi, toi, g)}</p>
          </div>
          {mine ? (
            <button
              type="button"
              onClick={() => {
                sfx.click();
                T({ t: "gageDone" });
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

      {s.phase === "done" && (
        <div className="flex flex-1 flex-col items-center justify-center gap-5 text-center">
          <Mascot size={150} interactive className="float" />
          <h1 className="text-[38px] font-black leading-[0.95] tracking-[-2px]">
            Pioche <span className="highlight">vidée</span> !
          </h1>
          <button
            type="button"
            onClick={() => {
              sfx.swoosh();
              act({ t: "restart" }, me ?? 0);
            }}
            className="brutal press h-[58px] w-full rounded-[18px] bg-passion text-[17px] font-extrabold"
          >
            REJOUER
          </button>
        </div>
      )}
    </GameFrame>
  );
}
