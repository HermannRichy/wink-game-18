"use client";

import { useEffect, useMemo, useState } from "react";
import { getBackend, type Report } from "@/lib/online/backend";

const SEEN = "wink-admin-reports-seen";

/** Nombre de signalements arrivés depuis la dernière visite de l'onglet */
export function useNewReports(ready: boolean) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!ready) return;
    void getBackend()
      .then((b) => b.adminRead("reports"))
      .then((r) => {
        const seen = Number(localStorage.getItem(SEEN) ?? 0);
        setN(Object.values((r ?? {}) as Record<string, Report>).filter((x) => x.t > seen).length);
      })
      .catch(() => {});
  }, [ready]);
  return [n, () => setN(0)] as const;
}

export function Reports() {
  const [reports, setReports] = useState<Record<string, Report> | null>(null);
  const [blocked, setBlocked] = useState<Record<string, boolean>>({});
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [threshold, setThreshold] = useState(5);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const b = await getBackend();
      const [r, bl, c, th] = await Promise.all([b.adminRead("reports"), b.adminRead("blocked"), b.adminRead("count"), b.adminRead("threshold")]);
      setReports((r ?? {}) as Record<string, Report>);
      setBlocked((bl ?? {}) as Record<string, boolean>);
      setCounts((c ?? {}) as Record<string, number>);
      setThreshold(typeof th === "number" ? th : 5);
      localStorage.setItem(SEEN, String(Date.now()));
    } catch (e) {
      setError(`Lecture impossible (${(e as { code?: string }).code ?? (e as Error).message}). Règles Firebase publiées ?`);
    }
  }
  useEffect(() => {
    void load();
  }, []);

  const groups = useMemo(() => {
    const m = new Map<string, { uid: string; nick: string; items: [string, Report][] }>();
    for (const [id, r] of Object.entries(reports ?? {})) {
      const g = m.get(r.u) ?? { uid: r.u, nick: r.n, items: [] };
      g.items.push([id, r]);
      m.set(r.u, g);
    }
    return [...m.values()].map((g) => ({ ...g, items: g.items.sort((a, b) => b[1].t - a[1].t) })).sort((a, b) => b.items[0][1].t - a.items[0][1].t);
  }, [reports]);

  async function act(fn: (b: Awaited<ReturnType<typeof getBackend>>) => Promise<unknown>) {
    setBusy(true);
    try {
      await fn(await getBackend());
      await load();
    } catch (e) {
      setError(`Action refusée (${(e as { code?: string }).code ?? (e as Error).message}).`);
    } finally {
      setBusy(false);
    }
  }

  if (!reports) return <p className="text-sm font-bold">{error ?? "Chargement des signalements…"}</p>;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 rounded-[16px] border-[3px] border-ink bg-white p-3">
        <label className="flex items-center gap-2 text-sm font-bold">
          Blocage automatique à
          <input
            type="number"
            min={1}
            max={100}
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value) || 1)}
            className="h-10 w-16 rounded-xl border-[3px] border-ink px-2 font-bold"
          />
          signalements (personnes différentes)
        </label>
        <button type="button" disabled={busy} onClick={() => void act((b) => b.adminSet("threshold", threshold))} className="h-10 rounded-xl border-[3px] border-ink bg-ink px-3 text-sm font-black text-pop">
          Enregistrer
        </button>
      </div>
      {error && <p className="rounded-xl border-[3px] border-ink bg-candy p-2 text-sm font-bold">{error}</p>}
      {groups.length === 0 && <p className="text-sm font-semibold opacity-60">Aucun signalement pour l&apos;instant.</p>}
      <ul className="space-y-3">
        {groups.map((g) => {
          const isBlocked = blocked[g.uid] === true;
          return (
            <li key={g.uid} className={`rounded-[18px] border-[3px] border-ink p-3 shadow-[3px_3px_0_#141414] ${isBlocked ? "bg-muted" : "bg-white"}`}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-lg font-black">{g.nick || "?"}</span>
                <span className="rounded-full border-2 border-ink px-2 text-[11px] font-extrabold">
                  {counts[g.uid] ?? g.items.length} signaleur{(counts[g.uid] ?? g.items.length) > 1 ? "s" : ""}
                </span>
                {isBlocked && <span className="rounded-full border-2 border-ink bg-passion px-2 text-[11px] font-extrabold text-cream">BLOQUÉ</span>}
                <span className="ml-auto font-mono text-[10px] opacity-50">{g.uid.slice(0, 10)}</span>
              </div>
              <ul className="mt-2 space-y-2">
                {g.items.map(([id, r]) => (
                  <li key={id} className="rounded-xl border-2 border-ink/30 p-2">
                    <div className="flex items-center gap-2 text-xs font-extrabold">
                      {r.r}
                      <span className="font-mono font-normal opacity-60">{new Date(r.t).toLocaleString("fr-FR")}</span>
                      <button type="button" disabled={busy} onClick={() => void act((b) => b.adminSet(`reports/${id}`, null))} className="ml-auto underline">
                        Supprimer
                      </button>
                    </div>
                    {r.m ? (
                      <pre className="mt-1 whitespace-pre-wrap font-sans text-[13px] font-medium">{r.m}</pre>
                    ) : (
                      <p className="mt-1 text-xs font-medium opacity-60">Messages non joints.</p>
                    )}
                  </li>
                ))}
              </ul>
              <div className="mt-2 flex gap-2">
                {isBlocked ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      void act(async (b) => {
                        await b.adminSet(`blocked/${g.uid}`, null);
                        await b.adminSet(`count/${g.uid}`, null);
                        await b.adminSet(`reporters/${g.uid}`, null);
                      })
                    }
                    className="h-10 rounded-xl border-[3px] border-ink bg-white px-3 text-sm font-black"
                  >
                    Débloquer
                  </button>
                ) : (
                  <button type="button" disabled={busy} onClick={() => void act((b) => b.adminSet(`blocked/${g.uid}`, true))} className="h-10 rounded-xl border-[3px] border-ink bg-passion px-3 text-sm font-black text-cream">
                    Bloquer
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
