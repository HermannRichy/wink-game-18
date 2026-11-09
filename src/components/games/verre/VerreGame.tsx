"use client";

import { useEffect, useRef, useState } from "react";
import { GAGES, fill } from "@/data/cards";
import type { VerreAction, VerreState } from "@/lib/games/modules";
import type { Session } from "@/lib/online/session";
import { pourSound, sfx } from "@/lib/sound";
import { vibrate } from "@/lib/deck";
import { GameFrame, PLAYER_BG, WaitingFor } from "@/components/game/common";
import { COLS, MIN_POUR, WaterSim } from "./sim";

const INK = "#141414";
const WATER = "#7CC8FF";
const WATER_DARK = "#3E9BE0";

type Local = "idle" | "pouring" | "settling" | "spilled";

export function VerreGame({ session, soundOn, onExit }: { session: Session<VerreState, VerreAction>; soundOn: boolean; onExit: () => void }) {
  const { state: s, names, genders, act, canAct, me } = session;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const simRef = useRef<WaterSim>(new WaterSim(s.level));
  const [ui, setUi] = useState<Local>("idle");
  const [poured, setPoured] = useState(0);
  const uiRef = useRef<Local>("idle");
  uiRef.current = ui;
  const soundRef = useRef<ReturnType<typeof pourSound> | null>(null);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastLive = useRef(0);
  const lastPoured = useRef(0);
  const turnRef = useRef(s.turn);
  turnRef.current = s.turn;

  const mine = s.phase === "pour" && canAct(s.turn);
  const watching = session.online && s.phase === "pour" && !mine;
  const partnerIdx = me === null ? 1 : ((1 - me) as 0 | 1);

  // Nouvelle manche ou nouveau tour : on recale la simulation sur l'état partagé
  useEffect(() => {
    if (uiRef.current === "pouring" || uiRef.current === "settling") return;
    const sim = simRef.current;
    if (s.phase === "pour") {
      if (Math.abs(sim.level - s.level) > 0.002 || sim.overflow) {
        const fresh = new WaterSim(s.level);
        if (!sim.overflow) {
          fresh.h.set(sim.h);
          fresh.v.set(sim.v);
        }
        simRef.current = fresh;
      }
      simRef.current.poured = 0;
      lastPoured.current = 0;
      setUi("idle");
      setPoured(0);
    }
  }, [s.level, s.turn, s.round, s.phase]);

  useEffect(() => {
    if (s.phase === "over") {
      sfx.fail();
      vibrate([150, 80, 250]);
    }
  }, [s.phase]);

  // Spectateur en ligne : on rejoue ce que l'autre verse
  useEffect(() => {
    if (!watching || !session.live) return;
    try {
      const snap = JSON.parse(session.live);
      if (snap.turn === s.turn && snap.round === s.round) simRef.current.applySnapshot(snap);
    } catch {
      /* ignore */
    }
  }, [session.live, watching, s.turn, s.round]);

  // Boucle d'animation : simulation + dessin
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const sim = simRef.current;
      sim.step(dt);
      soundRef.current?.set(sim.flow / 0.11);

      if (uiRef.current === "pouring" || uiRef.current === "settling") {
        if (Math.abs(sim.poured - lastPoured.current) > 0.0008) {
          lastPoured.current = sim.poured;
          setPoured(sim.poured);
        }
        if (sim.energy > 0.55 && sim.surfaceAt(0) > 0.97) vibrate(8);
        // Diffusion vers l'autre téléphone, 10 fois par seconde
        if (session.online && now - lastLive.current > 100) {
          lastLive.current = now;
          session.setLive(JSON.stringify({ ...sim.snapshot(), turn: turnRef.current, round: s.round }));
        }
        if (sim.overflow) spill();
      }
      draw(canvasRef.current, sim);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [session.online, s.round]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(
    () => () => {
      soundRef.current?.stop();
      if (settleTimer.current) clearTimeout(settleTimer.current);
    },
    [],
  );

  function startPour() {
    if (!mine || ui === "spilled") return;
    if (settleTimer.current) clearTimeout(settleTimer.current);
    const sim = simRef.current;
    sim.holding = true;
    setUi("pouring");
    soundRef.current ??= pourSound();
    vibrate(10);
  }

  function stopPour() {
    const sim = simRef.current;
    if (!sim.holding) return;
    sim.holding = false;
    if (sim.overflow) return;
    if (sim.poured < MIN_POUR) {
      setUi("idle");
      return;
    }
    // On attend que la surface se calme : ça peut encore déborder !
    setUi("settling");
    settleTimer.current = setTimeout(() => {
      if (simRef.current.overflow) return;
      soundRef.current?.stop();
      soundRef.current = null;
      sfx.knock();
      const level = simRef.current.level;
      uiRef.current = "idle";
      setUi("idle");
      act({ t: "commit", level, overflow: false }, turnRef.current);
    }, 1500);
  }

  function spill() {
    if (uiRef.current === "spilled") return;
    uiRef.current = "spilled";
    setUi("spilled");
    if (settleTimer.current) clearTimeout(settleTimer.current);
    soundRef.current?.stop();
    soundRef.current = null;
    sfx.splash();
    vibrate([120, 60, 220]);
    const level = simRef.current.level;
    setTimeout(() => act({ t: "commit", level, overflow: true }, turnRef.current), 1300);
  }

  const loser = s.loser;
  const minReached = poured >= MIN_POUR;
  const turnName = names[s.turn];

  return (
    <GameFrame title="Le Verre" soundOn={soundOn} onExit={onExit} mode={session.mode} partnerOnline={session.partnerOnline} partnerName={names[partnerIdx]}>
      <div className="flex items-center justify-between">
        <span className={`rounded-full border-[3px] border-ink px-3.5 py-2 text-base font-extrabold ${PLAYER_BG[s.turn]}`}>
          {s.phase === "over" ? "Ça déborde !" : me === s.turn ? "À toi de verser" : `Au tour de ${turnName}`}
        </span>
        <span className="font-mono text-[13px] font-bold">TOUR {s.pours + 1}</span>
      </div>

      <div
        className="brutal relative select-none overflow-hidden rounded-[26px] bg-cream shadow-[6px_6px_0_#141414]"
        style={{ touchAction: "none", WebkitUserSelect: "none" }}
        onPointerDown={(e) => {
          (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
          startPour();
        }}
        onPointerUp={stopPour}
        onPointerCancel={stopPour}
        onPointerLeave={stopPour}
        role={mine ? "button" : "img"}
        aria-label={mine ? "Maintiens pour verser de l'eau" : "Le verre d'eau"}
      >
        <canvas ref={canvasRef} className="block h-[400px] w-full" />
        {mine && ui === "idle" && (
          <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center">
            <span className="rounded-full border-[3px] border-ink bg-pop px-4 py-2 text-sm font-extrabold">MAINTIENS POUR VERSER</span>
          </div>
        )}
      </div>

      {s.phase === "pour" && mine && (
        <div className="flex flex-col gap-2">
          <div className="h-4 overflow-hidden rounded-full border-[3px] border-ink bg-cream" aria-hidden="true">
            <div className={`h-full transition-[width] duration-100 ${minReached ? "bg-[#3DDC84]" : "bg-passion"}`} style={{ width: `${Math.min(100, (poured / MIN_POUR) * 100)}%` }} />
          </div>
          <p className="text-center text-sm font-bold" aria-live="polite">
            {ui === "settling"
              ? "On attend que l'eau se calme…"
              : minReached
                ? "Minimum atteint. Relâche quand tu veux… ou ose un peu plus."
                : "Verse au moins le minimum. Plus tu maintiens, plus ça coule vite."}
          </p>
        </div>
      )}

      {watching && <WaitingFor name={turnName} what="verse… retiens ton souffle." />}

      {s.phase === "over" && loser !== null && (
        <div className="pop-in flex flex-col gap-3">
          <div className="brutal flex flex-col gap-2 rounded-[22px] bg-cream p-5">
            <span className="font-mono text-xs font-bold">{names[loser].toUpperCase()} A FAIT DÉBORDER LE VERRE</span>
            <p className="text-[24px] font-black leading-[1.1]">
              {fill(GAGES[s.gageIdx], names[loser], names[1 - loser], { addressee: genders[loser], other: genders[1 - loser] })}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              sfx.swoosh();
              act({ t: "next" }, me ?? 0);
            }}
            className="brutal press h-[58px] rounded-[18px] bg-passion text-[17px] font-extrabold"
          >
            NOUVEAU VERRE
          </button>
        </div>
      )}
    </GameFrame>
  );
}

// ———————————————————— Dessin ————————————————————

function draw(canvas: HTMLCanvasElement | null, sim: WaterSim) {
  if (!canvas) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
  }
  const g = canvas.getContext("2d");
  if (!g) return;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, w, h);

  // Géométrie du verre
  const gw = Math.min(210, w * 0.62);
  const gh = 250;
  const gx = (w - gw) / 2;
  const top = h - 30 - gh;
  const bottom = h - 30;
  const toY = (lv: number) => bottom - lv * gh;
  const colX = (i: number) => gx + (i / (COLS - 1)) * gw;

  // Table
  g.fillStyle = "#FFA3C7";
  g.fillRect(0, bottom + 8, w, h - bottom);
  g.strokeStyle = INK;
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(0, bottom + 8);
  g.lineTo(w, bottom + 8);
  g.stroke();

  // Carafe qui verse
  const flowRatio = sim.flow / 0.11;
  const spoutX = gx + sim.pourX * gw;
  const tilt = 0.25 + flowRatio * 0.5;
  g.save();
  g.translate(spoutX - 6, top - 28);
  g.rotate(tilt);
  g.fillStyle = "#FFF3E6";
  g.strokeStyle = INK;
  g.lineWidth = 3.5;
  g.beginPath();
  g.moveTo(-70, -48);
  g.lineTo(-10, -48);
  g.lineTo(6, -8);
  g.lineTo(-62, 6);
  g.closePath();
  g.fill();
  g.stroke();
  g.fillStyle = WATER;
  g.fillRect(-60, -26, 50, 20);
  g.restore();

  // Filet d'eau
  if (flowRatio > 0.02) {
    const surfaceY = toY(sim.level + sim.h[Math.round(sim.pourX * (COLS - 1))]);
    const width = 3 + flowRatio * 9;
    g.fillStyle = WATER;
    g.strokeStyle = WATER_DARK;
    g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(spoutX - width / 2, top - 22);
    g.quadraticCurveTo(spoutX - width / 2 - 2, (top + surfaceY) / 2, spoutX - width / 2.5, surfaceY);
    g.lineTo(spoutX + width / 2.5, surfaceY);
    g.quadraticCurveTo(spoutX + width / 2 + 2, (top + surfaceY) / 2, spoutX + width / 2, top - 22);
    g.closePath();
    g.fill();
  }

  // Eau (avec ménisque bombé au-dessus du bord)
  g.save();
  g.beginPath();
  g.moveTo(gx, bottom);
  for (let i = 0; i < COLS; i++) {
    let lv = sim.surfaceAt(i);
    if (lv > 1) {
      // Le ménisque retombe au ras des bords
      const edge = Math.min(i, COLS - 1 - i) / (COLS * 0.18);
      lv = 1 + (lv - 1) * Math.min(1, edge);
    }
    g.lineTo(colX(i), toY(lv));
  }
  g.lineTo(gx + gw, bottom);
  g.closePath();
  const grad = g.createLinearGradient(0, top, 0, bottom);
  grad.addColorStop(0, "#A9DCFF");
  grad.addColorStop(1, WATER_DARK);
  g.fillStyle = grad;
  g.fill();
  g.strokeStyle = WATER_DARK;
  g.lineWidth = 2;
  g.stroke();
  g.restore();

  // Reflets sur la surface
  g.strokeStyle = "rgba(255,255,255,0.7)";
  g.lineWidth = 2;
  g.beginPath();
  for (let i = 4; i < COLS * 0.45; i++) {
    const y = toY(Math.min(sim.surfaceAt(i), 1.02)) + 6;
    if (i === 4) g.moveTo(colX(i), y);
    else g.lineTo(colX(i), y);
  }
  g.stroke();

  // Verre (contour épais néo-brutaliste) + graduation du bord
  g.strokeStyle = INK;
  g.lineWidth = 5;
  g.lineJoin = "round";
  g.beginPath();
  g.moveTo(gx - 4, top - 4);
  g.lineTo(gx, bottom - 10);
  g.quadraticCurveTo(gx, bottom + 4, gx + 14, bottom + 4);
  g.lineTo(gx + gw - 14, bottom + 4);
  g.quadraticCurveTo(gx + gw, bottom + 4, gx + gw, bottom - 10);
  g.lineTo(gx + gw + 4, top - 4);
  g.stroke();
  g.strokeStyle = "rgba(255,255,255,0.8)";
  g.lineWidth = 4;
  g.beginPath();
  g.moveTo(gx + 12, top + 18);
  g.lineTo(gx + 14, bottom - 30);
  g.stroke();

  // Repère « danger » près du bord
  g.setLineDash([6, 6]);
  g.strokeStyle = "#FF2E4D";
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(gx - 16, toY(0.92));
  g.lineTo(gx + gw + 16, toY(0.92));
  g.stroke();
  g.setLineDash([]);

  // Gouttes
  g.fillStyle = WATER;
  g.strokeStyle = WATER_DARK;
  g.lineWidth = 1.5;
  for (const d of sim.drops) {
    const x = gx + d.x * gw;
    const y = toY(d.y);
    g.beginPath();
    g.arc(x, y, 3.2, 0, Math.PI * 2);
    g.fill();
    g.stroke();
  }
}
