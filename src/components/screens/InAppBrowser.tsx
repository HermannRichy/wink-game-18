"use client";

import { useState } from "react";
import { Mascot } from "@/components/Mascot";
import { sfx } from "@/lib/sound";

export type InAppInfo = { app: "Facebook" | "Messenger" | "Instagram"; platform: "android" | "ios" | "other" };

/** Repère le navigateur intégré de Facebook / Messenger / Instagram (où la PWA ne s'installe pas). */
export function detectInApp(ua: string): InAppInfo | null {
  const inFb = /FBAN|FBAV|FB_IAB|FBIOS/i.test(ua);
  const inIg = /Instagram/i.test(ua);
  if (!inFb && !inIg) return null;
  const app = /Messenger|MESSENGER/i.test(ua) || /FB_IAB\/MESSENGER/i.test(ua) ? "Messenger" : inIg ? "Instagram" : "Facebook";
  const platform = /Android/i.test(ua) ? "android" : /iPhone|iPad|iPod/i.test(ua) ? "ios" : "other";
  return { app, platform };
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-3 rounded-2xl border-[3px] border-ink bg-cream p-3.5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-[2.5px] border-ink bg-pop font-mono text-sm font-bold">{n}</span>
      <span className="text-[15px] font-semibold leading-snug">{children}</span>
    </li>
  );
}

export function InAppBrowser({ info, onContinue }: { info: InAppInfo; onContinue: () => void }) {
  const [copied, setCopied] = useState(false);
  const url = typeof window !== "undefined" ? window.location.href : "";

  function openChrome() {
    sfx.click();
    const bare = url.replace(/^https?:\/\//, "");
    window.location.href = `intent://${bare}#Intent;scheme=https;package=com.android.chrome;end`;
  }

  async function copy() {
    sfx.click();
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      window.prompt("Copie ce lien :", url);
    }
  }

  const ios = info.platform === "ios";
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-6 bg-pop px-6 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(1.75rem,env(safe-area-inset-top))]">
      <div className="flex items-center justify-between">
        <span className="text-[30px] font-black tracking-[-1.5px]">wink</span>
        <span className="font-mono text-[13px] font-bold">NAVIGATEUR {info.app.toUpperCase()}</span>
      </div>

      <div className="flex flex-col items-center gap-5 text-center">
        <Mascot size={130} interactive label="Mascotte Wink" className="float" />
        <h1 className="text-[40px] font-black leading-[0.95] tracking-[-2px]">
          Ouvre Wink dans <span className="bg-cream px-1.5">{ios ? "Safari" : "Chrome"}</span>
        </h1>
        <p className="text-[17px] font-medium leading-snug">
          Dans {info.app}, Wink ne peut pas s'installer et tes réglages se perdent. Ouvre-le dans {ios ? "Safari" : "Chrome"} pour jouer correctement.
        </p>
      </div>

      <div className="mt-auto flex flex-col gap-3.5">
        <ol className="flex flex-col gap-2.5">
          {ios ? (
            <>
              <Step n={1}>
                Touche <strong>⋯</strong> (ou l'icône de boussole) en haut ou en bas à droite
              </Step>
              <Step n={2}>
                Choisis <strong>« Ouvrir dans Safari »</strong>
              </Step>
            </>
          ) : (
            <>
              <Step n={1}>
                Touche <strong>⋮</strong> en haut à droite
              </Step>
              <Step n={2}>
                Choisis <strong>« Ouvrir dans Chrome »</strong>
              </Step>
            </>
          )}
        </ol>
        {!ios && (
          <button type="button" onClick={openChrome} className="brutal press h-[60px] rounded-[18px] bg-passion text-lg font-extrabold tracking-wide">
            OUVRIR DANS CHROME
          </button>
        )}
        <button type="button" onClick={copy} className="brutal press h-[54px] rounded-[18px] bg-cream text-base font-extrabold tracking-wide">
          {copied ? "LIEN COPIÉ ✓" : "COPIER LE LIEN"}
        </button>
        <button
          type="button"
          onClick={() => {
            sfx.click();
            onContinue();
          }}
          className="py-2 text-center text-[15px] font-bold underline underline-offset-4"
        >
          Continuer quand même
        </button>
      </div>
    </main>
  );
}
