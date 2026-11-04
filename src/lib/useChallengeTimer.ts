"use client";

import { useEffect, useState } from "react";
import { sfx } from "@/lib/sound";
import { vibrate } from "@/lib/deck";

export const PREP_SECONDS = 10;

/** Décompte de préparation (10 s) puis chrono du défi, avec sons et vibrations. */
export function useChallengeTimer() {
  const [seconds, setSeconds] = useState<number | null>(null);
  const [prep, setPrep] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    if (prep === null) return;
    if (prep === 0) {
      go();
      return;
    }
    sfx.tick(prep <= 3);
    const t = setTimeout(() => setPrep((p) => (p === null ? null : p - 1)), 1000);
    return () => clearTimeout(t);
  }, [prep]); // eslint-disable-line react-hooks/exhaustive-deps

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

  function go() {
    if (seconds === null) return;
    sfx.go();
    vibrate(60);
    setPrep(null);
    setTimeLeft(seconds);
  }

  /** Arme le décompte pour un défi chronométré (ou rien si pas de durée). */
  function arm(duration?: number) {
    setTimeLeft(null);
    if (duration) {
      setSeconds(duration);
      setPrep(PREP_SECONDS);
    } else {
      setSeconds(null);
      setPrep(null);
    }
  }

  function stop() {
    setPrep(null);
    setTimeLeft(null);
  }

  return { seconds, prep, timeLeft, go, arm, stop };
}

export function formatTime(s: number) {
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}
