"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/ui";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/** Propose d'installer Wink sur l'écran d'accueil (Android : bouton natif, iOS : explication). */
export function InstallBanner() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIos, setIsIos] = useState(false);
  const [standalone, setStandalone] = useState(true);
  const [showIosHelp, setShowIosHelp] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const nav = navigator as Navigator & { standalone?: boolean };
    setStandalone(window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true);
    setIsIos(/iphone|ipad|ipod/i.test(navigator.userAgent));
    try {
      setHidden(localStorage.getItem("wink-install-hidden") === "1");
    } catch {
      /* stockage indisponible */
    }
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (standalone || hidden || (!deferred && !isIos)) return null;

  function dismiss() {
    setHidden(true);
    try {
      localStorage.setItem("wink-install-hidden", "1");
    } catch {
      /* stockage indisponible */
    }
  }

  async function install() {
    if (deferred) {
      await deferred.prompt();
      await deferred.userChoice;
      setDeferred(null);
    } else {
      setShowIosHelp((v) => !v);
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-2xl border-[3px] border-ink bg-pop p-3.5">
      <div className="flex items-center gap-3">
        <span className="flex-1 text-sm font-semibold leading-snug">Installe Wink sur ton écran d'accueil pour jouer même sans connexion.</span>
        <button type="button" onClick={install} className="brutal-sm press shrink-0 rounded-xl bg-cream px-3 py-2 text-sm font-extrabold">
          INSTALLER
        </button>
      </div>
      {showIosHelp && (
        <p className="flex flex-wrap items-center gap-1 text-[13px] font-medium">
          Dans Safari, touche <Icon name="share" size={16} /> puis « Sur l'écran d'accueil ».
        </p>
      )}
      <button type="button" onClick={dismiss} className="self-start text-xs font-semibold underline">
        Plus tard
      </button>
    </div>
  );
}
