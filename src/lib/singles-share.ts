"use client";

import type { Card } from "@/lib/singles";

/** Visuel au format statut (1080 × 1920), dessiné sur le téléphone : code, pseudo, âge, ville, adresse du site */
export async function shareImage(code: string, me: Card): Promise<Blob> {
  const W = 1080;
  const H = 1920;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d")!;
  try {
    // 1,5 s maximum : sinon on dessine avec la police déjà disponible
    await Promise.race([
      Promise.all([document.fonts.load('900 120px "Outfit"'), document.fonts.load('700 120px "Space Mono"')]),
      new Promise((r) => setTimeout(r, 1500)),
    ]);
  } catch {
    /* police système */
  }
  const bg = g.createLinearGradient(0, 0, W * 0.6, H);
  bg.addColorStop(0, "#FF2E4D");
  bg.addColorStop(1, "#FFA3C7");
  g.fillStyle = bg;
  g.fillRect(0, 0, W, H);

  const center = (text: string, y: number, font: string, color: string) => {
    g.font = font;
    g.fillStyle = color;
    g.textAlign = "center";
    g.fillText(text, W / 2, y);
  };
  center("wink.", 230, '900 110px "Outfit", sans-serif', "#141414");
  center("Célibataire ?", 430, '900 104px "Outfit", sans-serif', "#FFF3E6");
  center("Viens jouer avec moi 😏", 550, '900 84px "Outfit", sans-serif', "#FFF3E6");

  // Mascotte
  try {
    const img = new Image();
    img.src = "/mascot/2.webp";
    await img.decode();
    const s = 620;
    g.drawImage(img, (W - s) / 2, 600, s, s);
  } catch {
    /* sans mascotte */
  }

  // Carte du code
  const cx = 160;
  const cy = 1260;
  const cw = W - 320;
  const ch = 300;
  g.fillStyle = "#141414";
  roundRect(g, cx + 16, cy + 16, cw, ch, 48);
  g.fill();
  g.fillStyle = "#FFF3E6";
  roundRect(g, cx, cy, cw, ch, 48);
  g.fill();
  g.lineWidth = 10;
  g.strokeStyle = "#141414";
  g.stroke();
  center("MON CODE", cy + 80, '700 44px "Space Mono", monospace', "#141414");
  center(code.split("").join(" "), cy + 220, '700 118px "Space Mono", monospace', "#141414");

  center("winkgame.site", 1720, '900 78px "Outfit", sans-serif', "#141414");
  center(`${me.n} · ${me.a} ans${me.c ? ` · ${me.c}` : ""}`, 1810, '800 48px "Outfit", sans-serif', "#141414");

  return new Promise((resolve, reject) => c.toBlob((b) => (b ? resolve(b) : reject(new Error("image"))), "image/png"));
}

function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  g.roundRect(x, y, w, h, r);
}

/** Partage natif (statut WhatsApp, Facebook…) ; sinon téléchargement */
export async function shareBlob(blob: Blob, code: string): Promise<"shared" | "saved"> {
  const file = new File([blob], `wink-${code}.png`, { type: "image/png" });
  const text = `Célibataire ? Viens jouer avec moi sur Wink 😏 Code : ${code} · winkgame.site`;
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], text });
      return "shared";
    } catch (e) {
      if ((e as Error).name === "AbortError") return "shared";
    }
  }
  saveBlob(blob, code);
  return "saved";
}

export function saveBlob(blob: Blob, code: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `wink-${code}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
