"use client";

import { useEffect, useState } from "react";
import { getBackend } from "@/lib/online/backend";
import { Spinner } from "@/components/ui";

/** Prévient quand c'est ce téléphone qui perd la connexion (après 3 s, pour éviter les clignotements) */
export function ConnectionBanner() {
  const [ok, setOk] = useState(true);
  const [show, setShow] = useState(false);
  useEffect(() => {
    let live = true;
    let off = () => {};
    void getBackend().then((b) => {
      if (live) off = b.connection(setOk);
    });
    return () => {
      live = false;
      off();
    };
  }, []);
  useEffect(() => {
    if (ok) {
      setShow(false);
      return;
    }
    const t = setTimeout(() => setShow(true), 3000);
    return () => clearTimeout(t);
  }, [ok]);
  if (!show) return null;
  return (
    <div role="status" className="fixed inset-x-3 top-3 z-40 mx-auto flex max-w-md items-center gap-2.5 rounded-2xl border-[3px] border-ink bg-pop p-3 text-sm font-extrabold shadow-[4px_4px_0_#141414]">
      <Spinner /> Tu es hors ligne, reconnexion…
    </div>
  );
}
