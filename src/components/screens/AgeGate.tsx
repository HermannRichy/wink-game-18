"use client";

import { useState } from "react";
import { Mascot } from "@/components/Mascot";
import { saveSettings } from "@/lib/db";
import { sfx } from "@/lib/sound";

export function AgeGate() {
  const [refused, setRefused] = useState(false);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-between gap-6 bg-passion px-6 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(1.75rem,env(safe-area-inset-top))]">
      <div className="flex items-center justify-between">
        <span className="text-[30px] font-black tracking-[-1.5px]">wink</span>
        <span className="rounded-full border-[2.5px] border-ink bg-ink px-3 py-1.5 font-mono text-[13px] font-bold text-pop">18+</span>
      </div>

      <div className="flex flex-col items-center gap-6 text-center">
        <Mascot size={210} interactive label="Mascotte Wink" className="float" />
        {refused ? (
          <div className="pop-in flex flex-col gap-3">
            <h1 className="text-[40px] font-black leading-[0.95] tracking-[-2px]">Reviens un peu plus tard.</h1>
            <p className="text-[17px] font-medium">Wink est réservé aux adultes. On t'attend à tes 18 ans.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <h1 className="text-[44px] font-black leading-[0.95] tracking-[-2px]">Wink, c'est pour les grands.</h1>
            <p className="text-[17px] font-medium leading-snug">
              Des jeux à deux, coquins mais drôles. Tu confirmes avoir <span className="highlight font-extrabold">18 ans ou plus</span> ?
            </p>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3.5">
        {!refused && (
          <>
            <button
              type="button"
              onClick={() => {
                sfx.success();
                saveSettings({ ageConfirmed: true });
              }}
              className="press h-[60px] rounded-[18px] border-[3px] border-ink bg-ink text-lg font-bold tracking-wide text-cream shadow-[5px_5px_0_#FFD93D]"
            >
              OUI, J'AI 18 ANS OU PLUS
            </button>
            <button
              type="button"
              onClick={() => {
                sfx.fail();
                setRefused(true);
              }}
              className="h-14 rounded-[18px] border-[3px] border-ink bg-cream text-[17px] font-semibold"
            >
              Non, je sors
            </button>
          </>
        )}
        <p className="text-center text-xs font-medium">Tout reste sur ton téléphone. Rien n'est envoyé.</p>
      </div>
    </main>
  );
}
