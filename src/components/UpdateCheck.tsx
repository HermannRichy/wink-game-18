"use client";

import { useState } from "react";
import { Spinner } from "@/components/ui";

const BUILT = process.env.NEXT_PUBLIC_BUILD_TIME ?? "";
const SHA = process.env.NEXT_PUBLIC_BUILD_SHA ?? "";

export function versionLabel() {
  if (!BUILT) return "version de développement";
  const d = new Date(BUILT);
  const date = d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
  const time = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  return `du ${date} à ${time}${SHA ? ` · ${SHA}` : ""}`;
}

/**
 * Bouton « Rechercher une mise à jour » : une PWA installée n'a pas de bouton actualiser.
 * Si une nouvelle version existe, le service worker l'installe et prend le contrôle :
 * UpdateWatcher recharge alors l'app automatiquement.
 */
export function UpdateCheck() {
  const [state, setState] = useState<"idle" | "checking" | "found" | "latest" | "error">("idle");

  async function check() {
    setState("checking");
    try {
      if (!("serviceWorker" in navigator)) {
        window.location.reload();
        return;
      }
      const reg = await navigator.serviceWorker.getRegistration();
      if (!reg) {
        window.location.reload();
        return;
      }
      await reg.update();
      const pending = reg.installing ?? reg.waiting;
      if (!pending) {
        setState("latest");
        return;
      }
      setState("found");
      // La nouvelle version prend le contrôle d'elle-même ; filet de sécurité si le rechargement tarde
      setTimeout(() => window.location.reload(), 6000);
    } catch {
      setState("error");
    }
  }

  return (
    <div className="flex flex-col items-center gap-1.5 text-center">
      <button
        type="button"
        onClick={check}
        disabled={state === "checking" || state === "found"}
        className="flex h-11 items-center gap-2 rounded-2xl border-[3px] border-ink bg-white px-4 text-sm font-extrabold disabled:opacity-70"
      >
        {state === "checking" || state === "found" ? <Spinner /> : "↻"} Rechercher une mise à jour
      </button>
      <span className="text-xs font-semibold" aria-live="polite">
        {state === "checking"
          ? "Vérification…"
          : state === "found"
            ? "Nouvelle version trouvée, installation… l'app va redémarrer."
            : state === "latest"
              ? "Tu as la dernière version ✓"
              : state === "error"
                ? "Pas de connexion. Réessaie avec internet."
                : null}
      </span>
      <span className="font-mono text-[11px] font-bold opacity-60">Version {versionLabel()}</span>
    </div>
  );
}
