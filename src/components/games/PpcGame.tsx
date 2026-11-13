"use client";

import { useEffect, useState } from "react";
import { fill, gagesFor } from "@/data/cards";
import type { Hand, PpcAction, PpcState } from "@/lib/games/modules";
import type { Session } from "@/lib/online/session";
import { sfx } from "@/lib/sound";
import { vibrate } from "@/lib/deck";
import { ActionBar, GameFrame, ScoreBar, WaitingFor } from "@/components/game/common";

const HANDS: { id: Hand; label: string }[] = [
  { id: "pierre", label: "Pierre" },
  { id: "papier", label: "Papier" },
  { id: "ciseaux", label: "Ciseaux" },
];

export function HandIcon({ hand, size = 56 }: { hand: Hand; size?: number }) {
  const common = { stroke: "#141414", strokeWidth: 3.5, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      {hand === "pierre" && (
        <>
          <path d="M14 36c-2-9 4-18 14-20 9-2 19 1 22 9 3 7 1 16-6 21-7 5-19 5-25-1-3-2-4-5-5-9z" fill="#C9B8A6" {...common} />
          <path d="M24 24c4-2 9-2 12 1M20 38c3 2 7 2 10 0" fill="none" {...common} strokeWidth={2.5} />
        </>
      )}
      {hand === "papier" && (
        <>
          <path d="M16 8h24l10 10v38H16z" fill="#FFF3E6" {...common} />
          <path d="M40 8v10h10M23 30h20M23 38h20M23 46h13" fill="none" {...common} strokeWidth={2.5} />
        </>
      )}
      {hand === "ciseaux" && (
        <>
          <circle cx="18" cy="46" r="8" fill="#FFA3C7" {...common} />
          <circle cx="40" cy="50" r="8" fill="#FFA3C7" {...common} />
          <path d="M23 40 50 10M35 44 20 12" fill="none" {...common} />
        </>
      )}
    </svg>
  );
}

export function PpcGame({ session, soundOn, onExit }: { session: Session<PpcState, PpcAction>; soundOn: boolean; onExit: () => void }) {
  const { state: s, names, genders, act, me } = session;
  const local = me === null;
  const partnerIdx = me === null ? 1 : ((1 - me) as 0 | 1);
  // Hors ligne : écran « passe le téléphone » entre les deux choix secrets
  const [handoffDone, setHandoffDone] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  useEffect(() => setHandoffDone(false), [s.round]);

  // Révélation : 3, 2, 1… puis on montre les mains
  useEffect(() => {
    if (s.phase === "pick") {
      setCountdown(null);
      return;
    }
    setCountdown(3);
  }, [s.phase, s.round]);

  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) {
      const w = s.last?.winner;
      if (w === null || w === undefined) sfx.sparkle();
      else if (me === null || me === w) sfx.success();
      else sfx.fail();
      vibrate([30, 30, 60]);
      return;
    }
    sfx.tick(countdown === 1);
    const t = setTimeout(() => setCountdown((c) => (c === null ? null : c - 1)), 600);
    return () => clearTimeout(t);
  }, [countdown]); // eslint-disable-line react-hooks/exhaustive-deps

  // Qui choisit sur ce téléphone ?
  const chooser: 0 | 1 | null = local ? (!s.picks[0] ? 0 : !s.picks[1] ? 1 : null) : s.picks[me!] ? null : me;
  const needHandoff = local && s.phase === "pick" && !!s.picks[0] && !s.picks[1] && !handoffDone;

  function pick(hand: Hand) {
    if (chooser === null) return;
    sfx.click();
    vibrate(15);
    act({ t: "pick", hand }, chooser);
  }

  const revealed = countdown === 0 && s.last;
  // Pendant le décompte 3, 2, 1 : on garde l'ancien score pour ne pas dévoiler le gagnant
  const shownScore: [number, number] =
    s.phase !== "pick" && !revealed && s.last && s.last.winner !== null
      ? [s.score[0] - (s.last.winner === 0 ? 1 : 0), s.score[1] - (s.last.winner === 1 ? 1 : 0)]
      : s.score;
  const matchLoser = s.phase === "over" && s.last && s.last.winner !== null ? ((1 - s.last.winner) as 0 | 1) : null;

  const hiddenCard = (label: string, sub: string) => (
    <div className="flex h-[150px] flex-1 flex-col items-center justify-center rounded-[26px] border-[3px] border-dashed border-ink bg-cream/60">
      <span className="text-[56px] font-black leading-none opacity-30">{label}</span>
      <span className="mt-1 text-xs font-black uppercase">{sub}</span>
    </div>
  );

  return (
    <GameFrame
      title="Pierre-Papier-Ciseaux"
      game="ppc"
      counter={`Manche ${s.round}`}
      className="bg-candy"
      soundOn={soundOn}
      onExit={onExit}
      mode={session.mode}
      partnerOnline={session.partnerOnline}
      partnerName={names[partnerIdx]}
    >
      <div className="flex items-center justify-center gap-3">
        <ScoreBar names={names} score={shownScore} />
      </div>
      <span className="-mt-1 text-center font-mono text-[12px] font-bold">PREMIER À {s.target}</span>

      {s.phase === "pick" && needHandoff && (
        <div className="pop-in flex flex-1 flex-col items-center justify-center gap-5 text-center">
          <h1 className="text-[38px] font-black leading-[0.95] tracking-[-2px]">
            Passe le téléphone à <span className="bg-pop px-1.5">{names[1]}</span>
          </h1>
          <p className="text-base font-bold">Pas de triche, {names[0]} : regarde ailleurs.</p>
          <ActionBar
            primary={{
              label: `C'est moi, ${names[1]}`,
              className: "bg-ink text-pop",
              onClick: () => {
                sfx.click();
                setHandoffDone(true);
              },
            }}
          />
        </div>
      )}

      {s.phase === "pick" && !needHandoff && chooser !== null && (
        <div className="flex flex-1 flex-col gap-4">
          <div className="flex items-center gap-2.5">
            {hiddenCard("?", names[0])}
            <span className="text-[26px] font-black">VS</span>
            {hiddenCard("?", names[1])}
          </div>
          <h1 className="text-center text-[24px] font-black leading-tight">Choisis en secret, {names[chooser]}</h1>
          <div className="mt-auto grid grid-cols-3 gap-2.5">
            {HANDS.map((h, i) => (
              <button
                key={h.id}
                type="button"
                onClick={() => pick(h.id)}
                className={`brutal press flex flex-col items-center gap-1.5 rounded-[24px] py-4 text-[12px] font-black uppercase ${["bg-white", "bg-pop", "bg-cream"][i]}`}
              >
                <HandIcon hand={h.id} size={52} />
                {h.label}
              </button>
            ))}
          </div>
          {!local && s.picks[partnerIdx] && <p className="text-center text-sm font-bold">{names[partnerIdx]} a déjà choisi.</p>}
          <p className="text-center text-xs font-bold opacity-70">{local ? "L'autre regarde ailleurs pendant ton choix." : "Chacun choisit sur son écran, révélation simultanée."}</p>
        </div>
      )}

      {s.phase === "pick" && !local && chooser === null && (
        <>
          <div className="flex items-center gap-2.5">
            {hiddenCard("✓", "Toi")}
            <span className="text-[26px] font-black">VS</span>
            {hiddenCard("?", `${names[partnerIdx]} choisit…`)}
          </div>
          <WaitingFor name={names[partnerIdx]} what="choisit en secret…" />
        </>
      )}

      {s.phase !== "pick" && s.last && (
        <div className="flex flex-1 flex-col gap-4">
          <div className="flex items-center gap-2.5">
            {([0, 1] as const).map((p) => (
              <div key={p} className={`contents`}>
                {p === 1 && <span className="text-[26px] font-black">VS</span>}
                <div className={`brutal flex h-[170px] flex-1 flex-col items-center justify-center gap-1 rounded-[26px] ${p === 0 ? "bg-white" : "bg-pop"}`}>
                  {revealed ? (
                    <span className="pop-in flex flex-col items-center gap-1">
                      <HandIcon hand={s.last!.picks[p]} size={74} />
                      <span className="text-sm font-black uppercase">{s.last!.picks[p]}</span>
                    </span>
                  ) : (
                    <span key={countdown} className="pop-in font-mono text-[64px] font-bold">
                      {countdown}
                    </span>
                  )}
                  <span className="text-xs font-black uppercase">{names[p]}</span>
                </div>
              </div>
            ))}
          </div>

          {revealed && (
            <div className="pop-in brutal flex flex-col gap-2 rounded-[22px] bg-white p-5 text-center">
              <span className="text-[26px] font-black leading-tight">
                {s.last.winner === null ? "Égalité !" : `${names[s.last.winner]} gagne la manche`}
              </span>
              {matchLoser !== null && (
                <>
                  <span className="font-mono text-xs font-bold">FIN DU MATCH · GAGE POUR {names[matchLoser].toUpperCase()}</span>
                  <p className="text-[21px] font-extrabold leading-tight">
                    {fill(gagesFor(s.distance)[s.gageIdx], names[matchLoser], names[1 - matchLoser], { addressee: genders[matchLoser], other: genders[1 - matchLoser] })}
                  </p>
                </>
              )}
            </div>
          )}

          {revealed && (
            <ActionBar
              primary={{
                label: s.phase === "over" ? "Revanche" : "Manche suivante",
                className: "bg-ink text-pop",
                onClick: () => {
                  sfx.swoosh();
                  act(s.phase === "over" ? { t: "rematch" } : { t: "continue" }, me ?? 0);
                },
              }}
            />
          )}
        </div>
      )}
    </GameFrame>
  );
}
