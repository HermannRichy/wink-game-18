"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { GAGES, fill } from "@/data/cards";
import { TOWER_ACTIONS, TOWER_FINAL_GAGES, type TowerAction } from "@/data/tower";
import { vibrate } from "@/lib/deck";
import { freshIndex, markSeen, orderFresh, pickFresh } from "@/lib/seen";
import type { Settings } from "@/lib/db";
import { sfx } from "@/lib/sound";
import { formatTime, useChallengeTimer } from "@/lib/useChallengeTimer";
import { Mascot, POSES } from "@/components/Mascot";
import { Icon, IconButton, SoundToggle } from "@/components/ui";

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
const PLAYER_BG = ["bg-candy", "bg-flame"];

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
    sfx.success();
    vibrate(15);
    endTurn();
  }

  function refuse() {
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
      <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-col gap-3 px-5 pt-[max(1.25rem,env(safe-area-inset-top))]">
        <div className="pointer-events-auto flex items-center justify-between">
          <IconButton
            label="Retour à l'accueil"
            icon="back"
            onClick={() => {
              sfx.click();
              onExit();
            }}
          />
          <span className="flex items-center gap-2 text-[22px] font-extrabold">
            La Tour <span className="rounded-full border-2 border-cream bg-passion px-2 py-0.5 text-[11px] font-extrabold text-ink">HOT</span>
          </span>
          <SoundToggle on={settings.soundOn} />
        </div>
        <div className="flex items-center gap-2.5">
          <span className={`rounded-full border-[3px] border-cream px-3.5 py-2 text-base font-extrabold text-ink ${PLAYER_BG[turn]}`}>Au tour de {moi}</span>
          <span className="font-mono text-[13px] font-bold text-pop">{extracted} BLOC{extracted > 1 ? "S" : ""}</span>
        </div>
      </div>

      {toast && (
        <div className="pop-in pointer-events-none absolute inset-x-0 top-[40%] flex justify-center">
          <span className="rounded-full border-[3px] border-ink bg-pop px-4 py-2 text-sm font-extrabold text-ink shadow-[4px_4px_0_#141414]">{toast}</span>
        </div>
      )}

      {/* Aide */}
      {!busy && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <span className="flex items-center gap-2 rounded-2xl border-[3px] border-cream bg-plum/90 px-4 py-3 text-sm font-semibold">
            <Icon name="tower" size={18} className="text-pop" />
            Touche un bloc et fais-le glisser pour le sortir. Glisse dans le vide pour tourner.
          </span>
        </div>
      )}

      {/* Action gravée sur le bloc */}
      {current && (
        <div className="absolute inset-x-0 bottom-0 z-20 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]" role="dialog" aria-modal="true" aria-labelledby="tower-action">
          <div className="pop-in flex flex-col gap-4 rounded-[26px] border-[3px] border-ink bg-cream p-5 text-ink shadow-[6px_6px_0_#FF2E4D]">
            {gage ? (
              <>
                <span className="font-mono text-xs font-bold">REFUSÉ, DONC…</span>
                <h2 id="tower-action" className="text-[26px] font-black leading-[1.05] tracking-tight">
                  {gage}
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    sfx.click();
                    endTurn();
                  }}
                  className="brutal press h-14 rounded-2xl bg-passion text-base font-extrabold"
                >
                  GAGE FAIT
                </button>
              </>
            ) : (
              <>
                <span className="font-mono text-xs font-bold">GRAVÉ SUR LE BLOC · HOT</span>
                <h2 id="tower-action" className="text-[26px] font-extrabold leading-[1.1] tracking-[-0.5px]">
                  {fill(current.action.text, moi, toi, g)}
                </h2>

                {current.action.seconds ? (
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
                      {timer.timeLeft === null
                        ? `${formatTime(current.action.seconds)} · LANCER`
                        : timer.timeLeft === 0
                          ? "TERMINÉ ! · RELANCER"
                          : formatTime(timer.timeLeft)}
                    </button>
                  )
                ) : null}

                <div className="grid grid-cols-2 gap-3">
                  <button type="button" onClick={refuse} className="h-[56px] rounded-[18px] border-[3px] border-ink bg-cream text-base font-bold">
                    Refuser · gage
                  </button>
                  <button type="button" onClick={done} className="brutal press h-[56px] rounded-[18px] bg-pop text-[17px] font-extrabold">
                    FAIT !
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* La tour est tombée */}
      {showLoser && loser !== null && (
        <div className="absolute inset-0 z-30 flex flex-col justify-between bg-passion px-6 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(2rem,env(safe-area-inset-top))] text-ink">
          <span className="text-[30px] font-black tracking-[-1.5px]">wink</span>
          <div className="pop-in flex flex-col items-center gap-5 text-center">
            <Mascot size={150} pose={POSES.clin} interactive className="float" />
            <h1 className="text-[40px] font-black leading-[0.95] tracking-[-2px]">
              {names[loser]} a fait tomber <span className="highlight">la tour</span> !
            </h1>
            <div className="brutal rounded-[22px] bg-cream p-5 text-left">
              <span className="font-mono text-xs font-bold">GAGE FINAL</span>
              <p className="mt-1 text-[22px] font-extrabold leading-tight">{finalGage}</p>
            </div>
            <p className="font-mono text-sm font-bold">{extracted} blocs retirés</p>
          </div>
          <div className="flex flex-col gap-3">
            <button type="button" onClick={replay} className="press h-[60px] rounded-[18px] border-[3px] border-ink bg-ink text-lg font-extrabold text-cream shadow-[5px_5px_0_#FFD93D]">
              REJOUER · NOUVELLES ACTIONS
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
        </div>
      )}
    </main>
  );
}
