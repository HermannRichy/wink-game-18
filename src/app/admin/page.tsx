"use client";

import { useMemo, useState } from "react";
import { getBackend, periodKeys, type Stats } from "@/lib/online/backend";
const GAMES: Record<string, string> = {
  g_cartes: "Cartes",
  g_quiz: "Quiz",
  g_ludo: "Ludo Hot",
  g_tour: "La Tour",
  g_aov: "Action ou vérité",
  g_morpion: "Morpion",
  g_ppc: "Pierre-papier-ciseaux",
  g_verre: "Verre d'eau",
};
const COLORS = ["#ff2e4d", "#ffd93d", "#ffa3c7", "#ff7a1a", "#141414"];

function lastDays(n: number): string[] {
  const out: string[] = [];
  const now = Date.now();
  for (let i = n - 1; i >= 0; i--) out.push(periodKeys(new Date(now - i * 86400000)).day);
  return out;
}
const fmtDay = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;

function Card({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-[18px] border-[3px] border-ink bg-white p-4 shadow-[4px_4px_0_#141414] ${className}`}>
      <h2 className="mb-3 text-sm font-black uppercase tracking-wide">{title}</h2>
      {children}
    </section>
  );
}

function Kpi({ label, value, hint, bg }: { label: string; value: number | string; hint?: string; bg: string }) {
  return (
    <div className={`rounded-[18px] border-[3px] border-ink p-3 shadow-[4px_4px_0_#141414] ${bg}`}>
      <div className="text-[11px] font-bold uppercase leading-tight tracking-wide">{label}</div>
      <div className="mt-1 text-[34px] font-black leading-none">{value}</div>
      {hint && <div className="mt-1 text-[11px] font-semibold opacity-70">{hint}</div>}
    </div>
  );
}

/** Histogramme par jour (SVG), une ou plusieurs séries empilées */
function Bars({ days, series }: { days: string[]; series: { name: string; color: string; values: number[] }[] }) {
  const W = 320;
  const H = 120;
  const totals = days.map((_, i) => series.reduce((a, s) => a + s.values[i], 0));
  const max = Math.max(1, ...totals);
  const bw = W / days.length;
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H + 16}`} className="w-full" role="img" aria-label="Histogramme par jour">
        <line x1="0" y1={H} x2={W} y2={H} stroke="#141414" strokeWidth="2" />
        {days.map((d, i) => {
          let y = H;
          return (
            <g key={d}>
              <title>{`${fmtDay(d)} : ${totals[i]}`}</title>
              {series.map((s) => {
                const h = (s.values[i] / max) * (H - 8);
                y -= h;
                return h > 0 ? <rect key={s.name} x={i * bw + 1} y={y} width={Math.max(1, bw - 2)} height={h} fill={s.color} stroke="#141414" strokeWidth={days.length > 40 ? 0.5 : 1} /> : null;
              })}
            </g>
          );
        })}
        <text x="0" y={H + 12} fontSize="9" fontWeight="700">{fmtDay(days[0])}</text>
        <text x={W} y={H + 12} fontSize="9" fontWeight="700" textAnchor="end">{fmtDay(days[days.length - 1])}</text>
        <text x={W} y="9" fontSize="9" fontWeight="700" textAnchor="end">max {max}</text>
      </svg>
      {series.length > 1 && (
        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-bold">
          {series.map((s) => (
            <span key={s.name} className="inline-flex items-center gap-1">
              <i className="inline-block size-3 border-2 border-ink" style={{ background: s.color }} />
              {s.name} ({s.values.reduce((a, b) => a + b, 0)})
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/** Barres horizontales classées */
function Ranking({ rows }: { rows: [string, number][] }) {
  const max = Math.max(1, ...rows.map((r) => r[1]));
  if (rows.every((r) => r[1] === 0)) return <p className="text-sm font-semibold opacity-60">Pas encore de données.</p>;
  return (
    <ul className="space-y-2">
      {rows.map(([label, v], i) => (
        <li key={label}>
          <div className="flex justify-between text-xs font-bold">
            <span>{label}</span>
            <span>{v}</span>
          </div>
          <div className="h-3 border-2 border-ink bg-muted">
            <div className="h-full" style={{ width: `${(v / max) * 100}%`, background: COLORS[i % COLORS.length] }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function AdminPage() {
  const [email, setEmail] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<number[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [range, setRange] = useState(30);

  async function login() {
    setBusy(true);
    setError(null);
    try {
      const b = await getBackend();
      setEmail(await b.adminLogin());
      setStats(await b.readStats());
      b.readAnonUsers().then(setUsers).catch(() => setUsers(null));
    } catch (e) {
      const code = (e as { code?: string }).code ?? "";
      setError(
        /permission|PERMISSION/.test(`${code} ${(e as Error).message}`)
          ? "Accès refusé : ce compte Google n'est pas l'administrateur."
          : `Connexion impossible (${code || (e as Error).message}).`,
      );
    } finally {
      setBusy(false);
    }
  }
  async function refresh() {
    setBusy(true);
    try {
      const b = await getBackend();
      setStats(await b.readStats());
      b.readAnonUsers().then(setUsers).catch(() => setUsers(null));
    } catch {
      setError("Lecture impossible.");
    } finally {
      setBusy(false);
    }
  }

  const days = useMemo(() => lastDays(range), [range]);
  const v = (day: string, name: string) => stats?.[day]?.[name] ?? 0;
  const series = (name: string) => days.map((d) => v(d, name));
  const sum = (name: string) => series(name).reduce((a, b) => a + b, 0);

  if (!stats) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 p-6">
        <h1 className="text-[40px] font-black leading-none tracking-tight">Wink · Admin</h1>
        <p className="font-semibold">Statistiques anonymes de l'app. Accès réservé.</p>
        <button
          type="button"
          onClick={login}
          disabled={busy}
          className="h-[56px] rounded-[18px] border-[3px] border-ink bg-ink text-base font-bold text-cream shadow-[5px_5px_0_#FFD93D] disabled:opacity-60"
        >
          {busy ? "Connexion…" : "Se connecter avec Google"}
        </button>
        {error && <p className="rounded-xl border-[3px] border-ink bg-candy p-3 text-sm font-bold">{error}</p>}
      </main>
    );
  }

  const k = periodKeys();
  const signupsPerDay = days.map((d) => (users ?? []).filter((t) => new Date(t).toISOString().slice(0, 10) === d).length);
  const gameRows = (Object.keys(GAMES).map((id) => [GAMES[id], sum(id)]) as [string, number][]).sort((a, b) => b[1] - a[1]);
  const gamesPerDay = days.map((d) => Object.keys(GAMES).reduce((a, id) => a + v(d, id), 0));
  const gamesTotal = gamesPerDay.reduce((a, b) => a + b, 0);
  const newDev = sum("new_device");
  const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)} %` : "–");

  return (
    <main className="mx-auto max-w-2xl space-y-4 p-4 pb-16">
      <header className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-[32px] font-black leading-none tracking-tight">Wink · Admin</h1>
          <p className="text-xs font-semibold opacity-70">{email} · jours en UTC</p>
        </div>
        <button type="button" onClick={refresh} disabled={busy} className="h-10 rounded-xl border-[3px] border-ink bg-pop px-3 text-sm font-bold disabled:opacity-60">
          {busy ? "…" : "Actualiser"}
        </button>
      </header>

      <div className="flex gap-2">
        {[7, 30, 90].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setRange(n)}
            className={`h-9 flex-1 rounded-xl border-[3px] border-ink text-sm font-bold ${range === n ? "bg-ink text-cream" : "bg-white"}`}
          >
            {n} jours
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Kpi label="Actifs aujourd'hui" value={v(k.day, "active")} bg="bg-pop" />
        <Kpi label="Actifs cette semaine" value={v(k.week, "active")} bg="bg-candy" />
        <Kpi label="Actifs ce mois" value={v(k.month, "active")} bg="bg-white" />
        <Kpi
          label="Inscriptions anonymes"
          value={users ? users.length : "–"}
          hint={users ? `${signupsPerDay.reduce((a, b) => a + b, 0)} sur ${range} j` : "Lecture Firebase Auth impossible"}
          bg="bg-flame"
        />
        <Kpi label={`Nouveaux appareils (${range} j)`} value={newDev} bg="bg-white" />
        <Kpi label={`Installations PWA (${range} j)`} value={sum("pwa_install")} bg="bg-white" />
      </div>

      <Card title="Joueurs actifs par jour">
        <Bars days={days} series={[{ name: "Actifs", color: "#ff2e4d", values: series("active") }]} />
      </Card>

      {users && (
        <Card title="Inscriptions anonymes par jour (Firebase Auth)">
          <Bars days={days} series={[{ name: "Inscriptions", color: "#ff7a1a", values: signupsPerDay }]} />
        </Card>
      )}

      <Card title="Nouveaux appareils par jour">
        <Bars days={days} series={[{ name: "Nouveaux", color: "#ffd93d", values: series("new_device") }]} />
      </Card>

      <Card title={`Parties lancées par jour (${gamesTotal})`}>
        <Bars days={days} series={[{ name: "Parties", color: "#ffa3c7", values: gamesPerDay }]} />
      </Card>

      <Card title="Jeux les plus lancés">
        <Ranking rows={gameRows} />
      </Card>

      <Card title="Mode de jeu">
        <Ranking rows={[["Un seul téléphone", sum("m_local")], ["Duo", sum("m_duo")], ["Distance", sum("m_distance")]]} />
      </Card>

      <Card title="Parties en ligne par jour">
        <Bars
          days={days}
          series={[
            { name: "Créées", color: "#ff2e4d", values: series("room_created") },
            { name: "Rejointes", color: "#ffd93d", values: series("room_joined") },
            { name: "Terminées", color: "#141414", values: series("room_ended") },
          ]}
        />
        <p className="mt-2 text-xs font-semibold">
          Erreurs de connexion : {sum("err_online")} · Rejointes / créées : {pct(sum("room_joined"), sum("room_created"))}
        </p>
      </Card>

      <Card title="Chat (nombre uniquement, jamais le contenu)">
        <Bars
          days={days}
          series={[
            { name: "Messages", color: "#ff2e4d", values: series("chat_msg") },
            { name: "Autocollants", color: "#ffd93d", values: series("chat_sticker") },
            { name: "Vocaux", color: "#ffa3c7", values: series("chat_voice") },
            { name: "Réactions", color: "#ff7a1a", values: series("chat_react") },
          ]}
        />
      </Card>

      <Card title="Parcours d'un nouvel appareil">
        <Ranking rows={[["Nouveaux appareils", newDev], ["Ont confirmé 18 ans", sum("age_ok")], ["Ont fini la visite", sum("tour_done")]]} />
        <p className="mt-2 text-xs font-semibold">
          Confirmation d'âge : {pct(sum("age_ok"), newDev)} · Visite terminée : {pct(sum("tour_done"), sum("age_ok"))}
        </p>
      </Card>

      <Card title="Origine">
        <Ranking rows={[["Navigateur interne (Facebook, Instagram…)", sum("in_app")], ["Ouvertures totales (actifs/jour)", sum("active")]]} />
        <p className="mt-2 text-xs font-semibold">Part du navigateur interne : {pct(sum("in_app"), sum("active"))}</p>
      </Card>
    </main>
  );
}
