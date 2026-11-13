"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { GAGES, fill } from "@/data/cards";
import { TOWER_ACTIONS, TOWER_FINAL_GAGES, type TowerAction } from "@/data/tower";
import { vibrate } from "@/lib/deck";
import { freshIndex, markSeen, orderFresh, pickFresh } from "@/lib/seen";
import type { Settings } from "@/lib/db";
import { sfx } from "@/lib/sound";
import { useChallengeTimer } from "@/lib/useChallengeTimer";
import { Mascot, POSES } from "@/components/Mascot";
import { IconButton } from "@/components/ui";
import { ActionBar, GameRules, TimerBlock } from "@/components/game/common";

// La 3D n'est chargée qu'à l'ouverture du jeu (et reste en cache pour le hors ligne)
const TowerScene = dynamic(() => import("@/components/tower/TowerScene"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center">
      <Mascot size={110} shadow={false} className="float" label="Chargement de la tour" />
    </div>
  ),
});

const BLOCKS = 54;
const PLAYER_DOT = ["bg-candy", "bg-flame"];

function hasWebGL() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

export function TowerGame({ settings, onExit }: { settings: Settings; onExit: () => void }) {
  const [webgl, setWebgl] = useState<boolean | null>(null);
  const [resetKey, setResetKey] = useState(0);
  const [actions, setActions] = useState<TowerAction[]>(() => orderFresh("tour", TOWER_ACTIONS, (a) => a.id).slice(0, BLOCKS));
  const [turn, setTurn] = useState(0);
  const [current, setCurrent] = useState<{ action: TowerAction; block: number } | null>(null);
  const [gage, setGage] = useState<string | null>(null);
  const [extracted, setExtracted] = useState(0);
  const [loser, setLoser] = useState<number | null>(null);
  const [showLoser, setShowLoser] = useState(false);
  const [finalGage, setFinalGage] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [doneBy, setDoneBy] = useState<[number, number]>([0, 0]);
  const [refusedN, setRefusedN] = useState(0);
  const [rules, setRules] = useState<"intro" | "sheet" | null>(null);
  useEffect(() => {
    try {
      if (!sessionStorage.getItem("wink-intro-tour-local")) setRules("intro");
    } catch {
      /* ignore */
    }
  }, []);
  const closeRules = () => {
    try {
      sessionStorage.setItem("wink-intro-tour-local", "1");
    } catch {
      /* ignore */
    }
    setRules(null);
  };
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timer = useChallengeTimer();
  const turnRef = useRef(turn);
  turnRef.current = turn;
  const actionsRef = useRef(actions);
  actionsRef.current = actions;
  const timerRef = useRef(timer);
  timerRef.current = timer;

  useEffect(() => setWebgl(hasWebGL()), []);

  const names = [settings.player1, settings.player2];
  const moi = names[turn];
  const toi = names[1 - turn];
  const genders = [settings.player1Gender, settings.player2Gender];
  const g = { addressee: genders[turn], other: genders[1 - turn] };

  const flash = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 1800);
  }, []);

  const onExtract = useCallback(
    (block: number) => {
      const action = actionsRef.current[block];
      markSeen("tour", action.id);
      sfx.swoosh();
      setExtracted((n) => n + 1);
      setCurrent({ action, block });
      timerRef.current.arm(action.seconds);
    },
    [],
  );

  const onCollapse = useCallback(() => {
    const t = turnRef.current;
    timerRef.current.stop();
    setCurrent(null);
    setGage(null);
    setLoser(t);
    setFinalGage(fill(pickFresh("tour-final", TOWER_FINAL_GAGES, (x) => x), names[t], names[1 - t]));
    setTimeout(() => {
      sfx.fail();
      setShowLoser(true);
    }, 1900);
  }, [settings.player1, settings.player2]); // eslint-disable-line react-hooks/exhaustive-deps

  const onBlocked = useCallback(() => flash("Pas les blocs du sommet !"), [flash]);

  function endTurn() {
    timer.stop();
    setCurrent(null);
    setGage(null);
    setTurn((t) => 1 - t);
  }

  function done() {
    setDoneBy((d) => (turn === 0 ? [d[0] + 1, d[1]] : [d[0], d[1] + 1]));
    sfx.success();
    vibrate(15);
    endTurn();
  }

  function refuse() {
    setRefusedN((n) => n + 1);
    timer.stop();
    sfx.fail();
    setGage(fill(GAGES[freshIndex("gages", GAGES.length)], moi, toi, g));
  }

  function replay() {
    sfx.swoosh();
    setActions(orderFresh("tour", TOWER_ACTIONS, (a) => a.id).slice(0, BLOCKS));
    setResetKey((k) => k + 1);
    setTurn(loser === null ? 0 : 1 - loser);
    setLoser(null);
    setShowLoser(false);
    setExtracted(0);
    setCurrent(null);
    setGage(null);
    setDoneBy([0, 0]);
    setRefusedN(0);
  }

  if (webgl === false) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-5 bg-plum px-6 text-center text-cream">
        <Mascot size={140} />
        <h1 className="text-3xl font-black">Ton téléphone ne gère pas la 3D.</h1>
        <p className="font-medium">La Tour a besoin de WebGL. Essaie les Cartes ou le Quiz en attendant.</p>
        <button type="button" onClick={onExit} className="brutal press h-14 w-full rounded-2xl bg-pop font-extrabold text-ink">
          RETOUR À L'ACCUEIL
        </button>
      </main>
    );
  }

  const busy = current !== null || loser !== null;

  return (
    <main className="relative mx-auto h-dvh w-full max-w-md overflow-hidden bg-plum text-cream">
      <div className="absolute inset-0">{webgl && <TowerScene resetKey={resetKey} disabled={busy} onExtract={onExtract} onCollapse={onCollapse} onBlocked={onBlocked} />}</div>

      {/* Barre du haut */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-col gap-2.5 px-[18px] pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="pointer-events-auto flex items-center justify-between">
          <IconButton
            label="Quitter la partie"
            icon="close"
            onClick={() => {
              sfx.click();
              onExit();
            }}
            className="bg-white"
          />
          <span className="rounded-full bg-pop px-3 py-1 text-[11px] font-extrabold uppercase tracking-wide text-ink">La Tour · Hot</span>
          <IconButton
            label="Règles du jeu"
            icon="help"
            onClick={() => {
              sfx.click();
              setRules("sheet");
            }}
            className="bg-white"
          />
        </div>
        <div className="flex items-center justify-between gap-2 rounded-2xl bg-cream px-3.5 py-2.5 text-ink" aria-live="polite">
          <span className="truncate text-[15px] font-extrabold">
            Au tour de <b className="text-passion">{moi}</b>
          </span>
          <span className="shrink-0 font-mono text-[11px] font-bold">
            {extracted} BLOC{extracted > 1 ? "S" : ""} RETIRÉ{extracted > 1 ? "S" : ""}
          </span>
        </div>
        <div className="flex gap-2">
          {names.map((n, i) => (
            <div
              key={i}
              className={`flex min-w-0 flex-1 items-center gap-2 rounded-[14px] border-[2.5px] px-2.5 py-1.5 ${turn === i ? "border-cream" : "border-cream/35 opacity-60"}`}
            >
              <span className={`h-3 w-3 shrink-0 rounded-full border-2 border-cream ${PLAYER_DOT[i]}`} />
              <span className="truncate text-[13px] font-black">{n}</span>
              <span className="ml-auto shrink-0 font-mono text-[10px] font-bold text-pop">
                {doneBy[i]} DÉFI{doneBy[i] > 1 ? "S" : ""}
              </span>
            </div>
          ))}
        </div>
      </div>

      {toast && (
        <div className="pop-in pointer-events-none absolute inset-x-0 top-[46%] flex justify-center">
          <span className="rounded-full border-[3px] border-ink bg-pop px-4 py-2 text-sm font-black text-ink shadow-[4px_4px_0_#141414]">{toast}</span>
        </div>
      )}

      {/* Aide en deux gestes, jusqu'aux premiers blocs */}
      {!busy && extracted < 3 && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex gap-2 px-[18px] pb-[max(1.25rem,env(safe-area-inset-bottom))] text-ink">
          <div className="flex flex-1 items-center gap-2.5 rounded-[18px] border-[3px] border-ink bg-cream px-3 py-2.5 shadow-[4px_4px_0_#FF2E4D]">
            <span className="text-xl" aria-hidden="true">
              ☝
            </span>
            <span className="text-[13px] font-extrabold leading-tight">Touche un bloc et tire-le doucement</span>
          </div>
          <div className="flex flex-1 items-center gap-2.5 rounded-[18px] border-[3px] border-ink bg-cream px-3 py-2.5 shadow-[4px_4px_0_#FFD93D]">
            <span className="text-xl" aria-hidden="true">
              ⟲
            </span>
            <span className="text-[13px] font-extrabold leading-tight">Glisse dans le vide pour tourner</span>
          </div>
        </div>
      )}

      {/* Action gravée sur le bloc */}
      {current && (
        <>
          <div className="pointer-events-none absolute inset-0 z-10 bg-plum/55" />
          <div className="absolute inset-x-0 bottom-0 z-20 px-3.5 pb-[max(1rem,env(safe-area-inset-bottom))]" role="dialog" aria-modal="true" aria-labelledby="tower-action">
            <div className="pop-in relative flex flex-col gap-3 rounded-[26px] border-[3px] border-ink bg-cream p-4 text-ink shadow-[6px_6px_0_#FF2E4D]">
              {gage ? (
                <>
                  <span className="self-start rounded-full border-[2.5px] border-ink bg-passion px-3 py-1 text-[12px] font-extrabold text-cream">REFUSÉ, DONC… GAGE</span>
                  <h2 id="tower-action" className="text-[25px] font-black leading-[1.08] tracking-tight">
                    {gage}
                  </h2>
                  <ActionBar
                    primary={{
                      label: "Gage fait",
                      icon: true,
                      onClick: () => {
                        sfx.click();
                        endTurn();
                      },
                    }}
                  />
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <span className="rounded-full border-[2.5px] border-ink bg-pop px-3 py-1 text-[12px] font-extrabold uppercase">Bloc n°{extracted} · défi</span>
                    <span className="rounded-full bg-ink px-2.5 py-0.5 text-[11px] font-extrabold uppercase text-pop">Hot</span>
                  </div>
                  <h2 id="tower-action" className="max-w-[78%] text-[25px] font-black leading-[1.1] tracking-[-0.5px]">
                    {fill(current.action.text, moi, toi, g)}
                  </h2>
                  <div className="pointer-events-none absolute -right-2 top-12">
                    <Mascot size={96} pose={POSES.clin} />
                  </div>
                  <TimerBlock timer={timer} seconds={current.action.seconds} />
                  <ActionBar secondary={{ label: "Passer · gage", onClick: refuse }} primary={{ label: "Défi relevé", icon: true, onClick: done }} />
                </>
              )}
            </div>
          </div>
        </>
      )}

      {/* La tour est tombée */}
      {showLoser && loser !== null && (
        <div className="absolute inset-0 z-30 flex flex-col overflow-y-auto bg-plum px-[18px] pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] text-cream">
          <div className="pop-in flex flex-col items-center text-center">
            <Mascot size={160} pose={POSES.dynamique} interactive className="float" />
            <span className="mt-1 font-mono text-[11px] font-bold tracking-[0.16em] text-pop">LA TOUR EST TOMBÉE</span>
            <h1 className="mt-1 text-[38px] font-black leading-[0.95] tracking-[-2px]">
              {names[loser]} a tout
              <br />
              fait tomber !
            </h1>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2.5 text-ink">
            {[
              { v: extracted, l: "blocs retirés", c: "bg-pop" },
              { v: doneBy[0] + doneBy[1], l: "défis relevés", c: "bg-candy" },
              { v: refusedN, l: "refusés", c: "bg-cream" },
            ].map((x) => (
              <div key={x.l} className={`rounded-[18px] border-[3px] border-cream px-1 py-3 text-center ${x.c}`}>
                <div className="text-[32px] font-black leading-none">{x.v}</div>
                <div className="mt-1 text-[11px] font-extrabold leading-tight">{x.l}</div>
              </div>
            ))}
          </div>
          <div className="mt-3.5 rounded-[20px] border-[3px] border-ink bg-cream px-4 py-3 text-ink shadow-[5px_5px_0_#FF2E4D]">
            <span className="font-mono text-[10px] font-bold tracking-[0.14em] text-passion">GAGE FINAL POUR {names[loser].toUpperCase()}</span>
            <p className="mt-1 text-[18px] font-black leading-snug">{finalGage}</p>
          </div>
          <div className="mt-auto flex flex-col gap-2.5 pt-4">
            <button type="button" onClick={replay} className="press h-[58px] rounded-[18px] border-[3px] border-cream bg-pop text-lg font-black uppercase text-ink shadow-[5px_5px_0_#FF2E4D]">
              Reconstruire la tour
            </button>
            <button
              type="button"
              onClick={() => {
                sfx.click();
                onExit();
              }}
              className="h-[50px] rounded-[18px] border-[3px] border-cream text-sm font-black uppercase"
            >
              Autre jeu
            </button>
          </div>
        </div>
      )}

      {rules && (
        <div className="text-ink">
          <GameRules game="tour" title="La Tour" mode="local" soundOn={settings.soundOn} intro={rules === "intro"} onClose={closeRules} onExit={() => { closeRules(); onExit(); }} />
        </div>
      )}
    </main>
  );
}
