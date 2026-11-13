"use client";

import { useEffect, useRef, useState } from "react";
import { GAGES, fill } from "@/data/cards";
import type { VerreAction, VerreState } from "@/lib/games/modules";
import type { Session } from "@/lib/online/session";
import { pourSound, sfx } from "@/lib/sound";
import { vibrate } from "@/lib/deck";
import { ActionBar, GameFrame, TurnBanner, WaitingFor } from "@/components/game/common";
import { COLS, MENISCUS, MIN_POUR, WaterSim } from "./sim";

const INK = "#141414";
const WATER_DARK = "#2F8FCB";

type Local = "idle" | "pouring" | "settling" | "spilled";

export function VerreGame({ session, soundOn, onExit }: { session: Session<VerreState, VerreAction>; soundOn: boolean; onExit: () => void }) {
  const { state: s, names, genders, act, canAct, me } = session;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const simRef = useRef<WaterSim>(new WaterSim(s.level));
  const [ui, setUi] = useState<Local>("idle");
  const [, setPoured] = useState(0);
  const [bulge, setBulge] = useState(false);
  const bulgeRef = useRef(false);
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
        const b = sim.level > 0.99;
        if (b !== bulgeRef.current) {
          bulgeRef.current = b;
          setBulge(b);
        }
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
  const turnName = names[s.turn];
  const holdProps = {
    onPointerDown: (e: React.PointerEvent) => {
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      startPour();
    },
    onPointerUp: stopPour,
    onPointerCancel: stopPour,
    onPointerLeave: stopPour,
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  };
  const msg =
    ui === "settling"
      ? "On attend que l'eau se calme… ça peut encore craquer."
      : bulge
        ? "Ça gonfle… l'eau tient au-dessus du bord. Une goutte de trop et ça craque."
        : ui === "pouring"
          ? "Ça coule… relâche pour fermer le robinet."
          : "Maintiens le doigt pour ouvrir le robinet. Relâche pour l'arrêter.";

  return (
    <GameFrame
      title="Le Verre d'eau"
      game="verre"
      counter={`Tour ${s.pours + 1}`}
      className={s.phase === "over" ? "bg-passion" : "bg-pop"}
      soundOn={soundOn}
      onExit={onExit}
      mode={session.mode}
      partnerOnline={session.partnerOnline}
      partnerName={names[partnerIdx]}
    >
      <TurnBanner name={turnName} mine={me === s.turn} label={s.phase === "over" ? "Ça a débordé !" : me === s.turn ? "À toi de remplir" : undefined} />

      <div
        className="relative -mx-[18px] select-none"
        style={{ touchAction: "none", WebkitUserSelect: "none" }}
        {...holdProps}
        role={mine ? "button" : "img"}
        aria-label={mine ? "Maintiens pour ouvrir le robinet" : "Le verre d'eau"}
      >
        <canvas ref={canvasRef} className="block h-[400px] w-full" />
      </div>

      {s.phase === "pour" && mine && (
        <>
          <p className="brutal -mt-2 rounded-[18px] bg-white px-4 py-3 text-[14px] font-extrabold leading-snug" aria-live="polite">
            {msg}
          </p>
          <div className="mt-auto pt-1">
            <button
              type="button"
              {...holdProps}
              style={{ touchAction: "none", WebkitUserSelect: "none" }}
              className={`brutal h-[68px] w-full select-none rounded-[18px] text-[18px] font-black uppercase text-cream transition-transform ${ui === "pouring" ? "translate-x-[3px] translate-y-[3px] bg-ink shadow-[1px_1px_0_#141414]" : "bg-passion"}`}
            >
              {ui === "pouring" ? (bulge ? "Doucement…" : "Ça coule…") : "Maintenir : le robinet coule"}
            </button>
          </div>
        </>
      )}

      {watching && <WaitingFor name={turnName} what="remplit le verre… retiens ton souffle." />}

      {s.phase === "over" && loser !== null && (
        <>
          <div className="pop-in brutal -mt-2 flex flex-col gap-2 rounded-[22px] bg-white p-5">
            <span className="font-mono text-xs font-bold">{names[loser].toUpperCase()} A FAIT DÉBORDER LE VERRE · GAGE</span>
            <p className="text-[22px] font-black leading-[1.1]">
              {fill(GAGES[s.gageIdx], names[loser], names[1 - loser], { addressee: genders[loser], other: genders[1 - loser] })}
            </p>
          </div>
          <ActionBar
            primary={{
              label: "Nouveau verre",
              className: "bg-ink text-pop",
              onClick: () => {
                sfx.swoosh();
                act({ t: "next" }, me ?? 0);
              },
            }}
          />
        </>
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

  // ——— Géométrie : gobelet évasé vu légèrement de haut ———
  const counterY = h - 34;
  const cx = w * 0.42;
  const rT = Math.min(92, w * 0.25); // demi-largeur au bord
  const rB = rT * 0.78; // demi-largeur au pied
  const bottom = counterY - 6;
  const gh = Math.min(232, h - 170);
  const top = bottom - gh;
  const base = 13; // épaisseur du fond
  const k = 0.17; // aplatissement des ellipses (perspective)
  const halfAt = (y: number) => rB + (rT - rB) * ((bottom - y) / gh);
  const toY = (lv: number) => bottom - base - lv * (gh - base);
  const flowRatio = sim.flow / 0.11;

  // ——— Plan de travail ———
  g.fillStyle = "#E6DACB";
  g.fillRect(0, counterY, w, h - counterY);
  g.fillStyle = "rgba(255,255,255,0.55)";
  g.fillRect(0, counterY + 3, w, 5);
  line(g, 0, counterY, w, counterY, INK, 4);
  // Ombre du verre
  g.fillStyle = "rgba(20,20,20,0.16)";
  ellipse(g, cx, bottom + 4, rB + 14, 8);
  g.fill();

  // ——— Flaque (débordement) ———
  if (sim.overflow) {
    const t = Math.min(1, sim.spillT / 1.2);
    g.fillStyle = "rgba(127,204,247,0.9)";
    g.strokeStyle = WATER_DARK;
    g.lineWidth = 2.5;
    ellipse(g, cx + 6, bottom + 6, rB + 20 + t * 70, 7 + t * 5);
    g.fill();
    g.stroke();
  }

  // ——— Robinet col de cygne (chromé) ———
  const spoutX = cx + (sim.pourX - 0.5) * rT * 1.6;
  const spoutY = Math.max(52, top - 82);
  const fx = Math.min(w - 26, cx + rT + 64);
  const chrome = g.createLinearGradient(fx - 12, 0, fx + 12, 0);
  chrome.addColorStop(0, "#59626A");
  chrome.addColorStop(0.25, "#F7F9FA");
  chrome.addColorStop(0.5, "#A9B2BA");
  chrome.addColorStop(0.75, "#E8ECEF");
  chrome.addColorStop(1, "#4F575E");
  const pipe = () => {
    g.beginPath();
    g.moveTo(fx, counterY - 30);
    g.lineTo(fx, spoutY + 20);
    g.bezierCurveTo(fx, spoutY - 60, spoutX, spoutY - 66, spoutX, spoutY - 2);
  };
  g.lineCap = "butt";
  pipe();
  g.strokeStyle = INK;
  g.lineWidth = 25;
  g.stroke();
  pipe();
  g.strokeStyle = chrome;
  g.lineWidth = 19;
  g.stroke();
  // reflet
  g.beginPath();
  g.moveTo(fx - 5, counterY - 40);
  g.lineTo(fx - 5, spoutY + 20);
  g.bezierCurveTo(fx - 5, spoutY - 50, spoutX + 20, spoutY - 58, spoutX + 14, spoutY - 18);
  g.strokeStyle = "rgba(255,255,255,0.85)";
  g.lineWidth = 3.5;
  g.lineCap = "round";
  g.stroke();
  // pied + embase
  roundRect(g, fx - 24, counterY - 12, 48, 14, 6, chrome, INK, 3);
  g.beginPath();
  g.moveTo(fx - 15, counterY - 12);
  g.lineTo(fx - 12, counterY - 42);
  g.lineTo(fx + 12, counterY - 42);
  g.lineTo(fx + 15, counterY - 12);
  g.closePath();
  g.fillStyle = chrome;
  g.fill();
  g.strokeStyle = INK;
  g.lineWidth = 3;
  g.stroke();
  // manette : s'ouvre avec le débit
  const ang = -0.45 - flowRatio * 0.75;
  const hx = fx + 10;
  const hy = spoutY + 64;
  const ex = hx + Math.cos(ang) * 34;
  const ey = hy + Math.sin(ang) * 34;
  line(g, hx, hy, ex, ey, INK, 12);
  line(g, hx, hy, ex, ey, "#C9D0D6", 7);
  g.beginPath();
  g.arc(hx, hy, 9, 0, Math.PI * 2);
  g.fillStyle = chrome;
  g.fill();
  g.strokeStyle = INK;
  g.lineWidth = 3;
  g.stroke();
  // mousseur
  roundRect(g, spoutX - 13, spoutY - 4, 26, 16, 4, chrome, INK, 3);
  roundRect(g, spoutX - 10, spoutY + 10, 20, 5, 2, "#3C4349", INK, 1.5);

  // ——— Verre : fond et bord arrière ———
  const glassPath = () => {
    g.beginPath();
    g.moveTo(cx - rT, top);
    g.lineTo(cx - rB, bottom);
    g.ellipse(cx, bottom, rB, rB * k, 0, Math.PI, 0, true);
    g.lineTo(cx + rT, top);
    g.closePath();
  };
  glassPath();
  const gl = g.createLinearGradient(cx - rT, 0, cx + rT, 0);
  gl.addColorStop(0, "rgba(223,243,255,0.75)");
  gl.addColorStop(0.18, "rgba(255,255,255,0.22)");
  gl.addColorStop(0.8, "rgba(255,255,255,0.12)");
  gl.addColorStop(1, "rgba(205,234,255,0.7)");
  g.fillStyle = gl;
  g.fill();
  g.beginPath();
  g.ellipse(cx, top, rT, rT * k, 0, Math.PI, 0);
  g.strokeStyle = "rgba(20,20,20,0.5)";
  g.lineWidth = 2.5;
  g.stroke();

  // ——— Filet d'eau ———
  // Tension superficielle : au ras du bord, l'eau bombe en dôme (accrochée aux parois) au lieu de déborder
  const bulge = Math.max(0, Math.min(1.15, (sim.level - 0.975) / (1 + MENISCUS - 0.975)));
  const yAt = (i: number) => {
    const u = Math.abs(i / (COLS - 1) - 0.5) * 2;
    const pin = Math.max(0, 1 - u ** 2.2);
    const wave = sim.h[i] * (sim.level > 0.98 ? pin : 1);
    return toY(Math.min(sim.level, 1) + wave) - bulge * 30 * pin;
  };
  const centerI = Math.round(sim.pourX * (COLS - 1));
  if (flowRatio > 0.02) {
    const sy = yAt(centerI) - 2;
    const sw = 3 + flowRatio * 8;
    const sg = g.createLinearGradient(spoutX - sw, 0, spoutX + sw, 0);
    sg.addColorStop(0, "#5BB9EC");
    sg.addColorStop(0.4, "#E6F7FF");
    sg.addColorStop(1, "#4AA9E0");
    g.beginPath();
    g.moveTo(spoutX - sw / 2 - 1, spoutY + 14);
    g.quadraticCurveTo(spoutX - sw / 2, (spoutY + sy) / 2, spoutX - sw / 2.6, sy);
    g.lineTo(spoutX + sw / 2.6, sy);
    g.quadraticCurveTo(spoutX + sw / 2, (spoutY + sy) / 2, spoutX + sw / 2 + 1, spoutY + 14);
    g.closePath();
    g.fillStyle = sg;
    g.fill();
    g.strokeStyle = WATER_DARK;
    g.lineWidth = 1.2;
    g.stroke();
  } else if (sim.holding === false && sim.flow === 0 && !sim.overflow) {
    // goutte qui perle au robinet
    const t = (performance.now() / 1400) % 1;
    g.beginPath();
    g.ellipse(spoutX, spoutY + 18 + t * 4, 3.2, 4 + t * 2, 0, 0, Math.PI * 2);
    g.fillStyle = "rgba(127,204,247,0.9)";
    g.fill();
    g.strokeStyle = WATER_DARK;
    g.lineWidth = 1.2;
    g.stroke();
  }

  // ——— Eau ———
  g.save();
  // découpe : intérieur du verre, prolongé au-dessus du bord pour le dôme
  g.beginPath();
  g.moveTo(cx - rT + 2, top - 60);
  g.lineTo(cx + rT - 2, top - 60);
  g.lineTo(cx + rT - 3, top);
  g.lineTo(cx + rB - 4, bottom - base);
  g.lineTo(cx - rB + 4, bottom - base);
  g.lineTo(cx - rT + 3, top);
  g.closePath();
  g.clip();

  const meanLv = Math.min(1, sim.level);
  const ySurf = toY(meanLv);
  const hw = halfAt(ySurf) - 3;
  const ry = hw * k;
  const xs: number[] = [];
  const ys: number[] = [];
  for (let i = 0; i < COLS; i++) {
    const u = i / (COLS - 1);
    xs.push(cx - hw + u * hw * 2);
    ys.push(yAt(i));
  }
  const ell = (i: number) => Math.sqrt(Math.max(0, 1 - ((i / (COLS - 1)) * 2 - 1) ** 2));
  const wb = halfAt(bottom - base) - 4;
  // corps de l'eau (avant)
  g.beginPath();
  g.moveTo(xs[0], ys[0]);
  for (let i = 0; i < COLS; i++) g.lineTo(xs[i], ys[i] + ry * ell(i));
  g.lineTo(cx + wb, bottom - base);
  g.ellipse(cx, bottom - base, wb, wb * k, 0, 0, Math.PI);
  g.closePath();
  const wg = g.createLinearGradient(0, ySurf, 0, bottom);
  wg.addColorStop(0, "rgba(159,220,255,0.88)");
  wg.addColorStop(1, "rgba(63,167,224,0.92)");
  g.fillStyle = wg;
  g.fill();
  const wh = g.createLinearGradient(cx - hw, 0, cx + hw, 0);
  wh.addColorStop(0, "rgba(47,143,203,0.35)");
  wh.addColorStop(0.3, "rgba(255,255,255,0)");
  wh.addColorStop(1, "rgba(47,143,203,0.4)");
  g.fillStyle = wh;
  g.fill();
  // surface (ellipse ondulée)
  g.beginPath();
  for (let i = 0; i < COLS; i++) {
    const y = ys[i] - ry * ell(i);
    if (i === 0) g.moveTo(xs[i], y);
    else g.lineTo(xs[i], y);
  }
  for (let i = COLS - 1; i >= 0; i--) g.lineTo(xs[i], ys[i] + ry * ell(i));
  g.closePath();
  const sgr = g.createLinearGradient(0, ySurf - ry - 30, 0, ySurf + ry);
  sgr.addColorStop(0, "#F2FBFF");
  sgr.addColorStop(1, "#8FD3FB");
  g.fillStyle = sgr;
  g.fill();
  g.strokeStyle = WATER_DARK;
  g.lineWidth = 2;
  g.stroke();
  // reflet de la surface / du dôme
  const dome = bulge > 0.25;
  g.beginPath();
  for (let i = Math.round(COLS * 0.14); i < COLS * 0.55; i++) {
    const y = ys[i] - ry * ell(i) * (dome ? 0.2 : -0.35) + (dome ? 3 : 0);
    if (i === Math.round(COLS * 0.14)) g.moveTo(xs[i], y);
    else g.lineTo(xs[i], y);
  }
  g.strokeStyle = "rgba(255,255,255,0.95)";
  g.lineWidth = dome ? 4.5 : 2.5;
  g.lineCap = "round";
  g.stroke();
  if (dome) {
    g.beginPath();
    g.ellipse(xs[Math.round(COLS * 0.7)], ys[Math.round(COLS * 0.7)] - ry * 0.4, 6, 3.5, 0, 0, Math.PI * 2);
    g.fillStyle = "#fff";
    g.fill();
  }
  // remous au point d'impact
  if (flowRatio > 0.05) {
    g.strokeStyle = "rgba(255,255,255,0.9)";
    g.lineWidth = 1.8;
    const iy = ys[centerI];
    ellipse(g, spoutX, iy, 10 + flowRatio * 10, 3 + flowRatio * 2);
    g.stroke();
    g.globalAlpha = 0.55;
    ellipse(g, spoutX, iy, 20 + flowRatio * 16, 5 + flowRatio * 3);
    g.stroke();
    g.globalAlpha = 1;
  }
  g.restore();

  // ——— Ruissellement sur les parois après débordement ———
  if (sim.overflow) {
    const t = Math.min(1, sim.spillT / 0.7);
    g.fillStyle = "rgba(127,204,247,0.92)";
    g.strokeStyle = WATER_DARK;
    g.lineWidth = 2;
    for (const side of [-1, 1]) {
      const yEnd = top + (bottom - top) * t;
      g.beginPath();
      g.moveTo(cx + side * (rT + 1), top - 2);
      g.quadraticCurveTo(cx + side * (rT + 9), top + (yEnd - top) * 0.5, cx + side * (halfAt(yEnd) + 7), yEnd);
      g.lineTo(cx + side * (halfAt(yEnd) - 1), yEnd);
      g.quadraticCurveTo(cx + side * (rT - 1), top + (yEnd - top) * 0.4, cx + side * (rT - 5), top);
      g.closePath();
      g.fill();
      g.stroke();
    }
  }

  // ——— Verre : parois, bord avant, fond épais, reflets ———
  g.lineJoin = "round";
  g.beginPath();
  g.moveTo(cx - rT, top);
  g.lineTo(cx - rB, bottom);
  g.ellipse(cx, bottom, rB, rB * k, 0, Math.PI, 0, true);
  g.lineTo(cx + rT, top);
  g.strokeStyle = INK;
  g.lineWidth = 4;
  g.stroke();
  g.beginPath();
  g.ellipse(cx, top, rT, rT * k, 0, 0, Math.PI);
  g.stroke();
  const wi = halfAt(bottom - base) - 4;
  g.beginPath();
  g.ellipse(cx, bottom - base, wi, wi * k, 0, 0, Math.PI);
  g.strokeStyle = "rgba(20,20,20,0.45)";
  g.lineWidth = 2;
  g.stroke();
  line(g, cx - rT + 12, top + 18, cx - rB + 10, bottom - 34, "rgba(255,255,255,0.85)", 7);
  line(g, cx - rT + 25, top + 22, cx - rT + 19, top + 70, "rgba(255,255,255,0.7)", 3);
  line(g, cx + rT - 14, top + 30, cx + rB - 10, bottom - 40, "rgba(255,255,255,0.5)", 3);

  // ——— Gouttes ———
  g.fillStyle = "rgba(127,204,247,0.95)";
  g.strokeStyle = WATER_DARK;
  g.lineWidth = 1.5;
  for (const d of sim.drops) {
    if (d.y < 0 && !sim.overflow) continue;
    const x = cx + (d.x - 0.5) * rT * 2;
    const y = toY(d.y);
    g.beginPath();
    g.arc(x, y, 3.2, 0, Math.PI * 2);
    g.fill();
    g.stroke();
  }
}

function line(g: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, color: string, width: number) {
  g.beginPath();
  g.moveTo(x1, y1);
  g.lineTo(x2, y2);
  g.strokeStyle = color;
  g.lineWidth = width;
  g.lineCap = "round";
  g.stroke();
}

function ellipse(g: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number) {
  g.beginPath();
  g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
}

function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, fill: string | CanvasGradient, stroke: string, lw: number) {
  g.beginPath();
  g.roundRect(x, y, w, h, r);
  g.fillStyle = fill;
  g.fill();
  g.strokeStyle = stroke;
  g.lineWidth = lw;
  g.stroke();
}
