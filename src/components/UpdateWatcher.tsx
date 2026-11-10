"use client";

import { useEffect, useRef, useState } from "react";

/** Recharge l'app quand une nouvelle version prend le contrôle ; propose un bandeau si une partie est en cours. */
export function UpdateWatcher({ busy }: { busy: boolean }) {
  const [ready, setReady] = useState(false);
  const busyRef = useRef(busy);
  busyRef.current = busy;

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const sw = navigator.serviceWorker;
    let hadController = !!sw.controller;
    let reloading = false;

    const reload = () => {
      if (reloading) return;
      reloading = true;
      window.location.reload();
    };
    const onChange = () => {
      if (!hadController) {
        hadController = true; // première installation : rien à recharger
        return;
      }
      if (busyRef.current) setReady(true);
      else reload();
    };
    sw.addEventListener("controllerchange", onChange);

    const check = () => {
      sw.getRegistration().then((r) => r?.update().catch(() => {}));
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") check();
    };
    document.addEventListener("visibilitychange", onVisible);
    const timer = setInterval(check, 60 * 60 * 1000);
    check();

    return () => {
      sw.removeEventListener("controllerchange", onChange);
      document.removeEventListener("visibilitychange", onVisible);
      clearInterval(timer);
    };
  }, []);

  if (!ready) return null;
  return (
    <div className="fixed inset-x-3 top-3 z-50 flex items-center justify-between gap-3 rounded-2xl border-[3px] border-ink bg-pop p-3 shadow-[4px_4px_0_#141414]">
      <span className="text-sm font-extrabold">Nouvelle version disponible</span>
      <button type="button" onClick={() => window.location.reload()} className="brutal press rounded-xl bg-passion px-3 py-2 text-sm font-extrabold">
        METTRE À JOUR
      </button>
    </div>
  );
}
