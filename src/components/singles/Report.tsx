"use client";

import { createContext, useContext, useState } from "react";
import { useChatCtx } from "@/components/online/ChatDock";
import { getBackend } from "@/lib/online/backend";
import { avoid } from "@/lib/singles";
import { stat } from "@/lib/stats";
import { sfx } from "@/lib/sound";

/** Fourni par une partie Célibataires : qui est l'autre, et comment sortir */
export interface SinglesCtxValue {
  partnerUid: string;
  partnerNick: string;
  leave: () => void;
}
export const SinglesCtx = createContext<SinglesCtxValue | null>(null);
export const useSinglesCtx = () => useContext(SinglesCtx);

const REASONS = ["Propos insultants", "Harcèlement ou insistance", "Contenu choquant", "Semble mineur·e", "Faux profil", "Autre"];

/** Bouton drapeau, affiché dans le cadre du jeu en mode Célibataires */
export function ReportButton() {
  const ctx = useSinglesCtx();
  const [open, setOpen] = useState(false);
  if (!ctx) return null;
  return (
    <>
      <button
        type="button"
        aria-label={`Signaler ou bloquer ${ctx.partnerNick}`}
        onClick={() => {
          sfx.click();
          setOpen(true);
        }}
        className="brutal-sm press flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-passion text-lg font-black text-cream"
      >
        ⚑
      </button>
      {open && <ReportSheet ctx={ctx} onClose={() => setOpen(false)} />}
    </>
  );
}

export function ReportSheet({ ctx, onClose }: { ctx: SinglesCtxValue; onClose: () => void }) {
  const chat = useChatCtx();
  const [reason, setReason] = useState<string | null>(null);
  const [withMsgs, setWithMsgs] = useState(true);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function send() {
    if (!reason) return;
    setBusy(true);
    try {
      const b = await getBackend();
      const msgs = withMsgs && chat ? chat.recent().join("\n").slice(0, 3000) : "";
      const blocked = await b.report({ u: ctx.partnerUid, n: ctx.partnerNick.slice(0, 20), r: reason, m: msgs });
      stat("s_report");
      if (blocked) stat("s_block");
    } catch {
      /* le blocage local suffit */
    }
    avoid(ctx.partnerUid);
    setBusy(false);
    setDone(true);
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-ink/60 p-4" role="dialog" aria-modal="true" aria-labelledby="report-title" onClick={busy ? undefined : onClose}>
      <div className="pop-in flex w-full max-w-md flex-col gap-3 rounded-[26px] border-[3px] border-ink bg-cream p-5 text-ink shadow-[6px_6px_0_#141414]" onClick={(e) => e.stopPropagation()}>
        {done ? (
          <>
            <h2 id="report-title" className="text-[26px] font-black leading-tight">
              Merci, c&apos;est noté.
            </h2>
            <p className="text-sm font-medium">Tu ne retomberas plus sur {ctx.partnerNick}. La partie et le chat vont être effacés.</p>
            <button type="button" onClick={ctx.leave} className="brutal press h-14 rounded-2xl bg-ink text-base font-black uppercase text-pop">
              Quitter la partie
            </button>
          </>
        ) : (
          <>
            <h2 id="report-title" className="text-[26px] font-black leading-tight">
              ⚑ Signaler {ctx.partnerNick}
            </h2>
            <div className="flex flex-col gap-2" role="radiogroup" aria-label="Raison">
              {REASONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  role="radio"
                  aria-checked={reason === r}
                  onClick={() => setReason(r)}
                  className={`h-11 rounded-xl border-[3px] border-ink px-3 text-left text-sm font-extrabold ${reason === r ? "bg-pop" : "bg-white"}`}
                >
                  {r}
                </button>
              ))}
            </div>
            <label className="flex items-start gap-2 text-xs font-bold">
              <input type="checkbox" checked={withMsgs} onChange={(e) => setWithMsgs(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#141414]" />
              Joindre les 10 derniers messages du chat. Le chat est chiffré : sans eux, on ne peut pas juger.
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  avoid(ctx.partnerUid);
                  ctx.leave();
                }}
                className="h-12 flex-1 rounded-2xl border-[3px] border-ink bg-white text-xs font-black uppercase"
              >
                Bloquer seulement
              </button>
              <button type="button" disabled={busy || !reason} onClick={send} className="h-12 flex-1 rounded-2xl border-[3px] border-ink bg-passion text-xs font-black uppercase text-cream disabled:opacity-50">
                {busy ? "…" : "Signaler + bloquer"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
