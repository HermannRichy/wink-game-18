"use client";

import { useEffect, useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { GAGES, LEVEL_BG, LEVEL_LABEL, LEVEL_ORDER, fill, type Card } from "@/data/cards";
import { freshIndex, markSeen } from "@/lib/seen";
import { buildDeck, pick, vibrate } from "@/lib/deck";
import { db, toggleFavorite, type Settings } from "@/lib/db";
import { Mascot } from "@/components/Mascot";
import { Icon } from "@/components/ui";
import { ActionBar, GameEnd, GameFrame, TurnBanner } from "@/components/game/common";
import { sfx } from "@/lib/sound";

const PREP_SECONDS = 10;

const KIND_LABEL: Record<Card["kind"], string> = { question: "QUESTION", defi: "DÉFI", joker: "JOKER" };

function formatTime(s: number) {
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

export function CardsGame({ settings, onExit }: { settings: Settings; onExit: () => void }) {
  const [deck, setDeck] = useState<Card[]>(() => buildDeck(settings.maxLevel));
  const [index, setIndex] = useState(0);
  const [turn, setTurn] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [passes, setPasses] = useState([0, 0]);
  const [together, setTogether] = useState(false);
  const [gage, setGage] = useState<string | null>(null);
  const [askPass, setAskPass] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [prep, setPrep] = useState<number | null>(null);
  const [doneCount, setDoneCount] = useState(0);
  const [refused, setRefused] = useState(0);
  const [highlight, setHighlight] = useState<string | undefined>();
  const [ended, setEnded] = useState(false);

  const names = [settings.player1, settings.player2];
  const moi = names[turn];
  const toi = names[1 - turn];
  const genders = [settings.player1Gender, settings.player2Gender];
  const g = { addressee: genders[turn], other: genders[1 - turn] };
  const card = deck[index];
  const finished = index >= deck.length;

  const favorites = useLiveQuery(() => db.favorites.toArray(), []);
  const isFav = useMemo(() => !!card && !!favorites?.some((f) => f.cardId === card.id), [favorites, card]);

  // Décompte de préparation (10 s), puis lancement automatique du chrono du défi
  useEffect(() => {
    if (prep === null) return;
    if (prep === 0) {
      setPrep(null);
      startTimer();
      return;
    }
    sfx.tick(prep <= 3);
    const t = setTimeout(() => setPrep((p) => (p === null ? null : p - 1)), 1000);
    return () => clearTimeout(t);
  }, [prep]); // eslint-disable-line react-hooks/exhaustive-deps

  // Chrono du défi
  useEffect(() => {
    if (timeLeft === null) return;
    if (timeLeft === 0) {
      sfx.alarm();
      vibrate([200, 100, 200, 100, 300]);
      return;
    }
    if (timeLeft <= 5) sfx.tick(true);
    const t = setTimeout(() => setTimeLeft((s) => (s === null ? null : s - 1)), 1000);
    return () => clearTimeout(t);
  }, [timeLeft]);

  function startTimer() {
    if (!card?.seconds) return;
    sfx.go();
    vibrate(60);
    setPrep(null);
    setTimeLeft(card.seconds);
  }

  function next(samePlayer = false) {
    setFlipped(false);
    setTimeLeft(null);
    setPrep(null);
    setGage(null);
    setAskPass(false);
    // On laisse la carte se retourner avant de changer son contenu
    setTimeout(() => {
      setIndex((i) => i + 1);
      if (!samePlayer) setTurn((t) => 1 - t);
    }, 260);
  }

  function reveal() {
    if (flipped) return;
    sfx.swoosh();
    vibrate(25);
    setFlipped(true);
    if (card) markSeen("cartes", card.id);
    if (card?.seconds) setPrep(PREP_SECONDS);
  }

  function done() {
    setDoneCount((n) => n + 1);
    if (card && card.kind === "defi") setHighlight(fill(card.text, moi, toi, g));
    sfx.success();
    vibrate(15);
    setTogether(false);
    next();
  }

  function refuse() {
    setRefused((n) => n + 1);
    setPrep(null);
    setTimeLeft(null);
    if (passes[turn] > 0) {
      sfx.click();
      setAskPass(true);
    } else {
      sfx.fail();
      setGage(fill(GAGES[freshIndex("gages", GAGES.length)], moi, toi, g));
    }
  }

  function usePass() {
    sfx.sparkle();
    setPasses((p) => p.map((v, i) => (i === turn ? v - 1 : v)));
    setTogether(false);
    next();
  }

  function applyJoker() {
    if (!card?.joker) return;
    sfx.sparkle();
    vibrate(30);
    if (card.joker === "passer") {
      setPasses((p) => p.map((v, i) => (i === turn ? v + 1 : v)));
      next();
    } else if (card.joker === "ensemble") {
      setTogether(true);
      next();
    } else {
      next(true);
    }
  }

  function restart() {
    sfx.swoosh();
    setDeck(buildDeck(settings.maxLevel));
    setIndex(0);
    setTurn(0);
    setPasses([0, 0]);
    setTogether(false);
    setFlipped(false);
    setDoneCount(0);
    setRefused(0);
    setHighlight(undefined);
    setEnded(false);
  }

  // Quitter après quelques cartes : on montre d'abord le bilan de la soirée
  function exit() {
    if (index >= 3 && !ended) {
      setEnded(true);
      return;
    }
    onExit();
  }

  const frame = (children: React.ReactNode, counter?: string) => (
    <GameFrame title="Cartes" game="cartes" counter={counter} soundOn={settings.soundOn} onExit={exit} mode="local" partnerOnline partnerName={toi}>
      {children}
    </GameFrame>
  );

  if (finished || ended) {
    return frame(
      <GameEnd
        label={finished ? "PIOCHE VIDÉE" : "SOIRÉE TERMINÉE"}
        title={
          <>
            Belle partie,
            <br />
            {names[0]} &amp; {names[1]}.
          </>
        }
        stats={[
          { value: Math.min(index, deck.length), label: "cartes piochées" },
          { value: doneCount, label: "défis relevés" },
          { value: refused, label: "refusés" },
        ]}
        highlight={highlight}
        replayLabel={finished ? "Rejouer aux Cartes" : "Reprendre la partie"}
        onReplay={finished ? restart : () => setEnded(false)}
        onExit={onExit}
      />,
    );
  }

  const levelIdx = LEVEL_ORDER.indexOf(card.level);
  const maxIdx = LEVEL_ORDER.indexOf(settings.maxLevel);

  return frame(
    <>
      <TurnBanner
        name={moi}
        right={together ? "À DEUX" : passes[turn] > 0 ? `JOKER ×${passes[turn]}` : `${toi.toUpperCase()} REGARDE`}
      />

      <div className="relative mx-2 mt-2 min-h-[400px] flex-1">
        <div className="absolute inset-0 translate-x-2.5 translate-y-1.5 rotate-[5deg] rounded-[28px] border-[3px] border-ink bg-pop shadow-[5px_5px_0_#141414]" />
        <div className="absolute inset-0 -rotate-3 rounded-[28px] border-[3px] border-ink bg-candy shadow-[5px_5px_0_#141414]" />

        <div className="flip absolute inset-0">
          <div className={`flip-inner ${flipped ? "is-flipped" : ""}`}>
            <button
              type="button"
              onClick={reveal}
              aria-label="Piocher la carte"
              className="flip-face flex flex-col items-center justify-center gap-3.5 rounded-[28px] border-[3px] border-ink bg-ink shadow-[6px_6px_0_#FF2E4D]"
            >
              <Mascot size={130} shadow={false} />
              <span className="text-[30px] font-black tracking-[-1px] text-cream">wink</span>
              <span className="text-sm font-semibold text-cream/80">Touche pour piocher</span>
            </button>

            <div className={`flip-face flip-back flex flex-col rounded-[28px] border-[3px] border-ink p-5 shadow-[6px_6px_0_#141414] ${card.kind === "joker" ? "bg-pop" : "bg-white"}`}>
              <div className="flex items-center justify-between gap-2">
                <span className={`rounded-full border-[2.5px] border-ink px-3 py-1 text-[12px] font-extrabold uppercase tracking-wide ${card.kind === "joker" ? "bg-cream" : LEVEL_BG[card.level]}`}>
                  {KIND_LABEL[card.kind]} · {LEVEL_LABEL[card.level]}
                </span>
                <span className="flex items-center gap-2">
                  <span className="font-mono text-[11px] font-bold">
                    NIV. {levelIdx + 1}/{maxIdx + 1}
                  </span>
                  <button
                    type="button"
                    aria-label={isFav ? "Retirer des favoris" : "Ajouter aux favoris"}
                    aria-pressed={isFav}
                    onClick={() => {
                      sfx.click();
                      toggleFavorite(card.id);
                    }}
                    className="flex h-10 w-10 items-center justify-center rounded-full border-[2.5px] border-ink bg-cream"
                  >
                    <Icon name={isFav ? "heartFill" : "heart"} size={18} className={isFav ? "text-passion" : ""} />
                  </button>
                </span>
              </div>

              <p className="mt-6 text-[29px] font-black leading-[1.1] tracking-[-1px]">{fill(card.text, moi, toi, g)}</p>

              {card.seconds ? (
                <div className="mt-auto pt-4">
                  <TimerRing prep={prep} timeLeft={timeLeft} seconds={card.seconds} onGo={startTimer} />
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {flipped && card.kind === "joker" && (
        <ActionBar
          primary={{
            label: card.joker === "rejouer" ? "Je rejoue" : card.joker === "passer" ? "Je garde mon joker" : "On le joue à deux",
            onClick: applyJoker,
            className: "bg-ink text-pop",
          }}
        />
      )}

      {flipped && card.kind !== "joker" && <ActionBar secondary={{ label: "Passer · gage", onClick: refuse }} primary={{ label: "C'est fait", onClick: done, icon: true }} />}

      {!flipped && <ActionBar primary={{ label: "Piocher", onClick: reveal, className: "bg-ink text-pop" }} />}

      {(gage || askPass) && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/60 p-4" role="dialog" aria-modal="true" aria-labelledby="sheet-title">
          <div className="pop-in flex w-full max-w-md flex-col gap-4 rounded-[26px] border-[3px] border-ink bg-cream p-6 shadow-[6px_6px_0_#141414]">
            {askPass ? (
              <>
                <h2 id="sheet-title" className="text-[28px] font-black leading-none tracking-tight">
                  Tu as un <span className="highlight">joker</span> en poche.
                </h2>
                <p className="text-base font-medium">Tu l&apos;utilises pour refuser sans gage ?</p>
                <button type="button" onClick={usePass} className="brutal press h-14 rounded-2xl bg-pop text-base font-extrabold">
                  UTILISER MON JOKER
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAskPass(false);
                    sfx.fail();
                    setGage(fill(GAGES[freshIndex("gages", GAGES.length)], moi, toi, g));
                  }}
                  className="h-14 rounded-2xl border-[3px] border-ink text-base font-bold"
                >
                  Non, je prends le gage
                </button>
              </>
            ) : (
              <>
                <span className="font-mono text-xs font-bold">REFUSÉ, DONC…</span>
                <h2 id="sheet-title" className="text-[28px] font-black leading-[1.05] tracking-tight">
                  {gage}
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    sfx.click();
                    setTogether(false);
                    next();
                  }}
                  className="brutal press h-14 rounded-2xl bg-passion text-base font-extrabold text-cream"
                >
                  GAGE FAIT
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>,
    `${index + 1}/${deck.length}`,
  );
}

/** Minuteur circulaire (version locale, sans le hook partagé) */
function TimerRing({ prep, timeLeft, seconds, onGo }: { prep: number | null; timeLeft: number | null; seconds: number; onGo: () => void }) {
  const running = timeLeft !== null && timeLeft > 0;
  const pct = prep !== null || timeLeft === null ? 100 : (timeLeft / seconds) * 100;
  return (
    <div className="flex items-center gap-3" aria-live="polite">
      <button
        type="button"
        onClick={onGo}
        disabled={running}
        aria-label={prep !== null ? "Lancer le chrono maintenant" : "Lancer le chrono"}
        className="flex h-[66px] w-[66px] shrink-0 items-center justify-center rounded-full border-4 border-ink"
        style={{ background: `conic-gradient(${prep !== null ? "#FFD93D" : "#FF2E4D"} 0 ${pct}%, #E6DACB 0)` }}
      >
        <span className={`flex h-[46px] w-[46px] items-center justify-center rounded-full bg-white font-mono font-bold ${prep !== null ? "text-[22px]" : "text-[13px]"}`}>
          {prep !== null ? <span key={prep} className="pop-in">{prep}</span> : formatTime(timeLeft ?? seconds)}
        </span>
      </button>
      <span className="text-[13px] font-bold leading-tight">
        {prep !== null ? (
          <>
            Prêts ? Le chrono part tout seul.
            <br />
            <span className="underline">Touche pour démarrer</span>
          </>
        ) : timeLeft === null ? (
          "Touche le chrono quand tu es prêt·e."
        ) : timeLeft === 0 ? (
          "Terminé ! Touche pour relancer."
        ) : (
          "C'est parti !"
        )}
      </span>
    </div>
  );
}
