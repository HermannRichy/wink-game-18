"use client";

import { Mascot } from "@/components/Mascot";
import { Icon } from "@/components/ui";
import { saveSettings } from "@/lib/db";
import { useInstall } from "@/lib/install";
import { sfx } from "@/lib/sound";

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-3 rounded-2xl border-[3px] border-ink bg-cream p-3.5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-[2.5px] border-ink bg-pop font-mono text-sm font-bold">{n}</span>
      <span className="flex flex-wrap items-center gap-1.5 text-[15px] font-semibold leading-snug">{children}</span>
    </li>
  );
}

export function Install() {
  const { isIos, canPrompt, installed, prompt } = useInstall();

  function skip() {
    sfx.click();
    saveSettings({ installSkipped: true });
  }

  async function install() {
    sfx.click();
    const outcome = await prompt();
    if (outcome === "accepted") sfx.success();
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-6 bg-pop px-6 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(1.75rem,env(safe-area-inset-top))]">
      <div className="flex items-center justify-between">
        <span className="text-[30px] font-black tracking-[-1.5px]">wink</span>
        <span className="font-mono text-[13px] font-bold">AVANT DE JOUER</span>
      </div>

      <div className="flex flex-col items-center gap-5 text-center">
        <Mascot size={150} interactive label="Mascotte Wink" className="float" />
        {installed ? (
          <div className="pop-in flex flex-col gap-3">
            <h1 className="text-[42px] font-black leading-[0.95] tracking-[-2px]">Wink est installé !</h1>
            <p className="text-[17px] font-medium leading-snug">Ferme cette page et ouvre Wink depuis ton écran d'accueil. Vous y entrerez vos prénoms.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <h1 className="text-[42px] font-black leading-[0.95] tracking-[-2px]">
              Installe Wink <span className="bg-cream px-1.5">d'abord</span>
            </h1>
            <p className="text-[17px] font-medium leading-snug">
              L'app s'ouvre en plein écran et marche sans connexion. Installe-la maintenant : tes réglages ne passent pas du navigateur à l'app.
            </p>
          </div>
        )}
      </div>

      {!installed && (
        <div className="mt-auto flex flex-col gap-3.5">
          {canPrompt ? (
            <button type="button" onClick={install} className="brutal press h-[60px] rounded-[18px] bg-passion text-lg font-extrabold tracking-wide">
              INSTALLER WINK
            </button>
          ) : isIos ? (
            <ol className="flex flex-col gap-2.5">
              <Step n={1}>
                Dans Safari, touche <Icon name="share" size={18} /> <strong>Partager</strong>
              </Step>
              <Step n={2}>
                Choisis <Icon name="plus" size={18} /> <strong>Sur l'écran d'accueil</strong>
              </Step>
              <Step n={3}>Ouvre Wink depuis ton écran d'accueil</Step>
            </ol>
          ) : (
            <ol className="flex flex-col gap-2.5">
              <Step n={1}>
                Ouvre le menu <strong>⋮</strong> de ton navigateur
              </Step>
              <Step n={2}>
                Choisis <strong>Installer l'application</strong> ou <strong>Ajouter à l'écran d'accueil</strong>
              </Step>
            </ol>
          )}
          <button type="button" onClick={skip} className="h-14 rounded-[18px] border-[3px] border-ink bg-cream text-base font-semibold">
            Continuer dans le navigateur
          </button>
        </div>
      )}
    </main>
  );
}
