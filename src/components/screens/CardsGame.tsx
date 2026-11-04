"use client";

import { useEffect, useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { GAGES, LEVEL_ORDER, fill, type Card, type Level } from "@/data/cards";
import { buildDeck, pick, vibrate } from "@/lib/deck";
import { db, toggleFavorite, type Settings } from "@/lib/db";
import { Mascot } from "@/components/Mascot";
import { Icon, Screen, SoundToggle, TopBar } from "@/components/ui";
import { sfx } from "@/lib/sound";

const PREP_SECONDS = 10;

const LEVEL_BG: Record<Level, string> = { doux: "bg-candy", coquin: "bg-passion", brulant: "bg-flame" };
const LEVEL_LABEL: Record<Level, string> = { doux: "DOUX", coquin: "COQUIN", brulant: "BRÛLANT" };
const KIND_LABEL: Record<Card["kind"], string> = { question: "QUESTION", defi: "DÉFI", joker: "JOKER" };
const PLAYER_BG = ["bg-candy", "bg-flame"];

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
    if (card?.seconds) setPrep(PREP_SECONDS);
  }

  function done() {
    sfx.success();
    vibrate(15);
    setTogether(false);
    next();
  }

  function refuse() {
    setPrep(null);
    setTimeLeft(null);
    if (passes[turn] > 0) {
      sfx.click();
      setAskPass(true);
    } else {
      sfx.fail();
      setGage(fill(pick(GAGES), moi, toi, g));
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
  }

  if (finished) {
    return (
      <Screen>
        <TopBar onBack={onExit} title="Cartes" />
        <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
          <Mascot size={170} interactive className="float" />
          <h1 className="text-[40px] font-black leading-[0.95] tracking-[-2px]">
            Pioche <span className="highlight">vidée</span> !
          </h1>
          <p className="text-base font-medium">Vous avez joué les {deck.length} cartes. La suite se passe sans écran 😏</p>
        </div>
        <button type="button" onClick={restart} className="brutal press h-[60px] rounded-[18px] bg-passion text-lg font-extrabold">
          REJOUER
        </button>
      </Screen>
    );
  }

  const levelIdx = LEVEL_ORDER.indexOf(card.level);
  const maxIdx = LEVEL_ORDER.indexOf(settings.maxLevel);
  const progress = (index + 1) / deck.length;

  return (
    <Screen>
      <TopBar
        onBack={onExit}
        title="Cartes"
        right={
          <span className="flex items-center gap-2.5">
            <span className="font-mono text-[13px] font-bold">
              {index + 1}/{deck.length}
            </span>
            <SoundToggle on={settings.soundOn} />
          </span>
        }
      />

      <div className="flex flex-col gap-2">
        <div className="flex justify-between text-xs font-bold">
          {LEVEL_ORDER.slice(0, maxIdx + 1).map((l, i) => (
            <span key={l} className={i > levelIdx ? "opacity-50" : ""}>
              {LEVEL_LABEL[l]}
            </span>
          ))}
        </div>
        <div className="h-4 overflow-hidden rounded-full border-[3px] border-ink bg-cream">
          <div className={`h-full transition-all duration-500 ${LEVEL_BG[card.level]}`} style={{ width: `${Math.max(4, progress * 100)}%` }} />
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        <span className={`rounded-full border-[3px] border-ink px-3.5 py-2 text-base font-extrabold ${PLAYER_BG[turn]}`}>Au tour de {moi}</span>
        {together ? (
          <span className="rounded-full border-[2.5px] border-ink bg-pop px-2.5 py-1 text-xs font-extrabold">À DEUX</span>
        ) : (
          <span className="text-sm font-medium">{toi} regarde.</span>
        )}
        {passes[turn] > 0 && (
          <span className="ml-auto rounded-full border-[2.5px] border-ink bg-pop px-2.5 py-1 text-xs font-extrabold">JOKER ×{passes[turn]}</span>
        )}
      </div>

      <div className="relative min-h-[380px] flex-1">
        <div className="absolute inset-x-[22px] bottom-0 right-1.5 top-3.5 rotate-[5deg] rounded-[26px] border-[3px] border-ink bg-pop" />
        <div className="absolute inset-x-3 bottom-1 top-2 -rotate-3 rounded-[26px] border-[3px] border-ink bg-candy" />

        <div className="flip absolute inset-0 bottom-3 left-1 right-2.5">
          <div className={`flip-inner ${flipped ? "is-flipped" : ""}`}>
            <button
              type="button"
              onClick={reveal}
              aria-label="Piocher la carte"
              className="flip-face flex flex-col items-center justify-center gap-3.5 rounded-[26px] border-[3px] border-ink bg-ink shadow-[6px_6px_0_#FF2E4D]"
            >
              <Mascot size={130} shadow={false} />
              <span className="text-[30px] font-black tracking-[-1px] text-cream">wink</span>
              <span className="text-sm font-semibold text-cream/80">Touche pour piocher</span>
            </button>

            <div
              className={`flip-face flip-back flex flex-col justify-between rounded-[26px] border-[3px] border-ink p-6 shadow-[6px_6px_0_#141414] ${card.kind === "joker" ? "bg-pop" : LEVEL_BG[card.level]}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="rounded-full border-[2.5px] border-ink bg-cream px-3 py-1.5 text-[13px] font-extrabold tracking-wide">
                  {KIND_LABEL[card.kind]} · {LEVEL_LABEL[card.level]}
                </span>
                <button
                  type="button"
                  aria-label={isFav ? "Retirer des favoris" : "Ajouter aux favoris"}
                  aria-pressed={isFav}
                  onClick={() => {
                    sfx.click();
                    toggleFavorite(card.id);
                  }}
                  className="flex h-11 w-11 items-center justify-center rounded-full border-[2.5px] border-ink bg-cream"
                >
                  <Icon name={isFav ? "heartFill" : "heart"} size={20} className={isFav ? "text-passion" : ""} />
                </button>
              </div>

              <p className="text-[30px] font-extrabold leading-[1.08] tracking-[-1px]">{fill(card.text, moi, toi, g)}</p>

              {card.seconds ? (
                prep !== null ? (
                  <div className="flex items-center justify-between gap-3" aria-live="polite">
                    <span className="flex items-baseline gap-2">
                      <span className="text-sm font-extrabold">PRÊTS ?</span>
                      <span key={prep} className="pop-in font-mono text-[44px] font-bold leading-none">
                        {prep}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={startTimer}
                      className="brutal-sm press rounded-full bg-ink px-3.5 py-2 text-sm font-extrabold text-pop"
                    >
                      GO MAINTENANT
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={startTimer}
                    disabled={timeLeft !== null && timeLeft > 0}
                    aria-live="polite"
                    className={`flex items-center gap-2 self-start rounded-full border-[2.5px] border-ink px-3.5 py-2 font-mono text-base font-bold ${timeLeft !== null && timeLeft > 0 && timeLeft <= 5 ? "bg-passion text-ink" : "bg-ink text-pop"}`}
                  >
                    <Icon name="timer" size={16} stroke={2.8} />
                    {timeLeft === null ? `${formatTime(card.seconds)} · LANCER` : timeLeft === 0 ? "TERMINÉ ! · RELANCER" : formatTime(timeLeft)}
                  </button>
                )
              ) : (
                <span />
              )}
            </div>
          </div>
        </div>
      </div>

      {flipped && card.kind === "joker" && (
        <button type="button" onClick={applyJoker} className="brutal press pop-in h-[58px] rounded-[18px] bg-pop text-[17px] font-extrabold">
          {card.joker === "rejouer" ? "JE REJOUE" : card.joker === "passer" ? "JE GARDE MON JOKER" : "OK, ON LE JOUE À DEUX"}
        </button>
      )}

      {flipped && card.kind !== "joker" && (
        <div className="pop-in grid grid-cols-2 gap-3">
          <button type="button" onClick={refuse} className="h-[58px] rounded-[18px] border-[3px] border-ink bg-cream text-base font-bold">
            Refuser · gage
          </button>
          <button type="button" onClick={done} className="brutal press h-[58px] rounded-[18px] bg-pop text-[17px] font-extrabold">
            FAIT ! SUIVANT
          </button>
        </div>
      )}

      {!flipped && (
        <button type="button" onClick={reveal} className="brutal press h-[58px] rounded-[18px] bg-passion text-[17px] font-extrabold">
          PIOCHER
        </button>
      )}

      {(gage || askPass) && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/60 p-4" role="dialog" aria-modal="true" aria-labelledby="sheet-title">
          <div className="pop-in flex w-full max-w-md flex-col gap-4 rounded-[26px] border-[3px] border-ink bg-cream p-6 shadow-[6px_6px_0_#141414]">
            {askPass ? (
              <>
                <h2 id="sheet-title" className="text-[28px] font-black leading-none tracking-tight">
                  Tu as un <span className="highlight">joker</span> en poche.
                </h2>
                <p className="text-base font-medium">Tu l'utilises pour refuser sans gage ?</p>
                <button type="button" onClick={usePass} className="brutal press h-14 rounded-2xl bg-pop text-base font-extrabold">
                  UTILISER MON JOKER
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAskPass(false);
                    sfx.fail();
                    setGage(fill(pick(GAGES), moi, toi, g));
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
                  className="brutal press h-14 rounded-2xl bg-passion text-base font-extrabold"
                >
                  GAGE FAIT
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </Screen>
  );
}
