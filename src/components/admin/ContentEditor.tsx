"use client";

import { useEffect, useMemo, useState } from "react";
import { LEVEL_BG, LEVEL_LABEL, LEVEL_ORDER, fill, type Level } from "@/data/cards";
import { COLLECTIONS, rows, type ContentItem, type Override, type Overrides, type Row, type RowStatus } from "@/lib/content";
import { getBackend } from "@/lib/online/backend";

const STATUS_STYLE: Record<RowStatus, string> = {
  origine: "bg-white",
  modifié: "bg-pop",
  ajouté: "bg-[#7BD389]",
  désactivé: "bg-muted",
  supprimé: "bg-passion text-cream",
};
const JOKERS = [
  { id: "rejouer", label: "Rejouer" },
  { id: "ensemble", label: "Jouer à deux" },
  { id: "passer", label: "Garder un joker" },
];

type Draft = ContentItem & { isNew?: boolean };

export function ContentEditor() {
  const [overrides, setOverrides] = useState<Overrides | null>(null);
  const [col, setCol] = useState(COLLECTIONS[0].id);
  const [level, setLevel] = useState<string>("");
  const [kind, setKind] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [q, setQ] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [row, setRow] = useState<Row | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gender, setGender] = useState<"f" | "h">("f");

  useEffect(() => {
    getBackend()
      .then((b) => b.readContent())
      .then((c) => setOverrides(c as Overrides))
      .catch(() => setError("Lecture des contenus impossible."));
  }, []);

  const c = COLLECTIONS.find((x) => x.id === col)!;
  const all = useMemo(() => (overrides ? rows(col, overrides) : []), [overrides, col]);
  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return all.filter(
      (r) =>
        (!level || r.item.level === level) &&
        (!kind || r.item.kind === kind) &&
        (status ? r.status === status : r.status !== "supprimé") &&
        (!needle || r.item.text.toLowerCase().includes(needle) || r.item.id.toLowerCase() === needle),
    );
  }, [all, level, kind, status, q]);
  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const r of all) m[r.status] = (m[r.status] ?? 0) + 1;
    return m;
  }, [all]);

  async function write(id: string, value: Override | null) {
    setSaving(true);
    setError(null);
    try {
      const b = await getBackend();
      const clean = value ? (Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined && v !== "")) as Override) : null;
      await b.writeContent(col, id, clean as Record<string, unknown> | null);
      setOverrides((o) => {
        const next = { ...(o ?? {}) };
        const cur = { ...(next[col] ?? {}) };
        if (clean) cur[id] = clean;
        else delete cur[id];
        next[col] = cur;
        return next;
      });
      setDraft(null);
      setRow(null);
    } catch (e) {
      setError(`Enregistrement refusé (${(e as { code?: string }).code ?? (e as Error).message}).`);
    } finally {
      setSaving(false);
    }
  }

  function open(r: Row) {
    setRow(r);
    setDraft({ ...r.item });
  }
  function openNew() {
    setRow(null);
    setDraft({ id: `x${Date.now().toString(36)}`, text: "", level: c.levels ? "flirt" : undefined, kind: c.kinds?.[0].id, isNew: true });
  }

  function save() {
    if (!draft || !draft.text.trim()) return;
    const fields: Override = {
      text: draft.text.trim(),
      level: c.levels ? draft.level : undefined,
      kind: c.kinds ? draft.kind : undefined,
      seconds: c.seconds ? (draft.seconds && draft.seconds > 0 ? Math.round(draft.seconds) : 0) : undefined,
      joker: col === "cards" && draft.kind === "joker" ? (draft.joker ?? "rejouer") : undefined,
      updatedAt: Date.now(),
    };
    if (draft.isNew || row?.override?.added) void write(draft.id, { ...fields, added: true, disabled: row?.override?.disabled });
    else void write(draft.id, { ...fields, disabled: row?.override?.disabled });
  }

  if (!overrides) {
    return <p className="text-sm font-bold">{error ?? "Chargement des contenus…"}</p>;
  }

  const sel = "h-10 rounded-xl border-[3px] border-ink bg-white px-2 text-sm font-bold";

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2">
        <select aria-label="Collection" value={col} onChange={(e) => (setCol(e.target.value), setLevel(""), setKind(""))} className={sel}>
          {Array.from(new Set(COLLECTIONS.map((x) => x.game))).map((g) => (
            <optgroup key={g} label={g}>
              {COLLECTIONS.filter((x) => x.game === g).map((x) => (
                <option key={x.id} value={x.id}>
                  {x.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <div className="flex flex-wrap gap-2">
          {c.levels && (
            <select aria-label="Niveau" value={level} onChange={(e) => setLevel(e.target.value)} className={sel}>
              <option value="">Tous niveaux</option>
              {LEVEL_ORDER.map((l) => (
                <option key={l} value={l}>
                  {LEVEL_LABEL[l]}
                </option>
              ))}
            </select>
          )}
          {c.kinds && (
            <select aria-label="Catégorie" value={kind} onChange={(e) => setKind(e.target.value)} className={sel}>
              <option value="">Toutes catégories</option>
              {c.kinds.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.label}
                </option>
              ))}
            </select>
          )}
          <select aria-label="État" value={status} onChange={(e) => setStatus(e.target.value)} className={sel}>
            <option value="">Visibles</option>
            {(["origine", "modifié", "ajouté", "désactivé", "supprimé"] as RowStatus[]).map((s) => (
              <option key={s} value={s}>
                {s} ({counts[s] ?? 0})
              </option>
            ))}
          </select>
        </div>
        <input aria-label="Rechercher" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un texte…" className="h-10 rounded-xl border-[3px] border-ink bg-white px-3 text-sm font-semibold" />
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs font-bold">
          {list.length} élément{list.length > 1 ? "s" : ""} · {c.help}
        </span>
        <button type="button" onClick={openNew} className="h-10 shrink-0 rounded-xl border-[3px] border-ink bg-ink px-3 text-sm font-black text-pop">
          + Ajouter
        </button>
      </div>
      {error && <p className="rounded-xl border-[3px] border-ink bg-candy p-2 text-sm font-bold">{error}</p>}

      <ul className="space-y-2">
        {list.map((r) => (
          <li key={r.item.id}>
            <button
              type="button"
              onClick={() => open(r)}
              className={`w-full rounded-[16px] border-[3px] border-ink p-3 text-left shadow-[3px_3px_0_#141414] ${r.status === "désactivé" || r.status === "supprimé" ? "opacity-60" : ""} bg-white`}
            >
              <div className="mb-1 flex flex-wrap items-center gap-1.5">
                {r.item.level && <span className={`rounded-full border-2 border-ink px-2 text-[10px] font-extrabold ${LEVEL_BG[r.item.level as Level]}`}>{LEVEL_LABEL[r.item.level as Level]}</span>}
                {r.item.kind && <span className="rounded-full border-2 border-ink px-2 text-[10px] font-extrabold uppercase">{c.kinds?.find((k) => k.id === r.item.kind)?.label ?? r.item.kind}</span>}
                {r.item.seconds ? <span className="rounded-full border-2 border-ink px-2 font-mono text-[10px] font-bold">{r.item.seconds} s</span> : null}
                <span className="font-mono text-[10px] font-bold opacity-50">{r.item.id}</span>
                {r.status !== "origine" && <span className={`ml-auto rounded-full border-2 border-ink px-2 text-[10px] font-extrabold uppercase ${STATUS_STYLE[r.status]}`}>{r.status}</span>}
              </div>
              <p className="text-[14px] font-semibold leading-snug">{r.item.text}</p>
            </button>
          </li>
        ))}
      </ul>

      {draft && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/60 p-3" role="dialog" aria-modal="true" aria-labelledby="edit-title" onClick={() => setDraft(null)}>
          <div className="pop-in max-h-[92dvh] w-full max-w-xl space-y-3 overflow-y-auto rounded-[24px] border-[3px] border-ink bg-cream p-4 shadow-[6px_6px_0_#141414]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between gap-2">
              <h2 id="edit-title" className="text-[22px] font-black leading-none">
                {draft.isNew ? "Nouveau contenu" : "Modifier"}
              </h2>
              <span className="font-mono text-[11px] font-bold opacity-60">
                {c.label} · {draft.id}
              </span>
            </div>
            <textarea
              aria-label="Texte"
              value={draft.text}
              onChange={(e) => setDraft({ ...draft, text: e.target.value })}
              rows={4}
              maxLength={600}
              className="w-full rounded-xl border-[3px] border-ink bg-white p-3 text-[15px] font-semibold"
            />
            <p className="text-[11px] font-bold opacity-70">{c.help} Accords : « il ou elle », « le ou la », « attiré·e »…</p>
            <div className="flex flex-wrap gap-2">
              {c.levels && (
                <select aria-label="Niveau du contenu" value={draft.level} onChange={(e) => setDraft({ ...draft, level: e.target.value as Level })} className={sel}>
                  {LEVEL_ORDER.map((l) => (
                    <option key={l} value={l}>
                      {LEVEL_LABEL[l]}
                    </option>
                  ))}
                </select>
              )}
              {c.kinds && (
                <select aria-label="Catégorie du contenu" value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value })} className={sel}>
                  {c.kinds.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.label}
                    </option>
                  ))}
                </select>
              )}
              {col === "cards" && draft.kind === "joker" && (
                <select aria-label="Effet du joker" value={draft.joker ?? "rejouer"} onChange={(e) => setDraft({ ...draft, joker: e.target.value })} className={sel}>
                  {JOKERS.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.label}
                    </option>
                  ))}
                </select>
              )}
              {c.seconds && (
                <label className="flex items-center gap-2 text-sm font-bold">
                  Chrono
                  <input
                    type="number"
                    min={0}
                    max={600}
                    value={draft.seconds ?? 0}
                    onChange={(e) => setDraft({ ...draft, seconds: Number(e.target.value) || 0 })}
                    className="h-10 w-20 rounded-xl border-[3px] border-ink bg-white px-2 text-sm font-bold"
                  />
                  s
                </label>
              )}
            </div>
            <div className="rounded-xl border-[3px] border-dashed border-ink bg-white p-3">
              <div className="mb-1 flex items-center justify-between">
                <span className="font-mono text-[10px] font-bold">APERÇU</span>
                <button type="button" onClick={() => setGender((g) => (g === "f" ? "h" : "f"))} className="text-[11px] font-bold underline">
                  {gender === "f" ? "Inès joue, Marc partenaire" : "Marc joue, Inès partenaire"}
                </button>
              </div>
              <p className="text-[15px] font-bold leading-snug">
                {gender === "f"
                  ? fill(draft.text || "…", "Inès", "Marc", { addressee: "f", other: "h" })
                  : fill(draft.text || "…", "Marc", "Inès", { addressee: "h", other: "f" })}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={saving || !draft.text.trim()} onClick={save} className="h-12 flex-1 rounded-2xl border-[3px] border-ink bg-ink text-sm font-black uppercase text-pop disabled:opacity-50">
                {saving ? "…" : "Enregistrer"}
              </button>
              {row && row.status !== "supprimé" && (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => {
                    const o = row.override ?? {};
                    if (row.status === "désactivé") {
                      // Réactiver : si rien d'autre n'avait été modifié, on revient au texte d'origine
                      const onlyFlag = !o.added && !o.text && !o.level && !o.kind && o.seconds === undefined && !o.joker;
                      void write(draft.id, onlyFlag ? null : { ...o, disabled: undefined, updatedAt: Date.now() });
                    } else void write(draft.id, { ...o, disabled: true, updatedAt: Date.now() });
                  }}
                  className="h-12 rounded-2xl border-[3px] border-ink bg-white px-3 text-sm font-black uppercase"
                >
                  {row.status === "désactivé" ? "Réactiver" : "Désactiver"}
                </button>
              )}
              {row && row.status !== "supprimé" && (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => {
                    if (!window.confirm("Supprimer ce contenu ?")) return;
                    if (row.override?.added) void write(draft.id, null);
                    else void write(draft.id, { deleted: true, updatedAt: Date.now() });
                  }}
                  className="h-12 rounded-2xl border-[3px] border-ink bg-passion px-3 text-sm font-black uppercase text-cream"
                >
                  Supprimer
                </button>
              )}
              {row && !row.override?.added && row.override && (
                <button type="button" disabled={saving} onClick={() => void write(draft.id, null)} className="h-12 rounded-2xl border-[3px] border-ink bg-white px-3 text-sm font-black uppercase">
                  {row.status === "supprimé" ? "Restaurer" : "Revenir à l'origine"}
                </button>
              )}
              {row?.override?.added && row.status === "supprimé" && (
                <button type="button" disabled={saving} onClick={() => void write(draft.id, { ...row.override, deleted: undefined, updatedAt: Date.now() })} className="h-12 rounded-2xl border-[3px] border-ink bg-white px-3 text-sm font-black uppercase">
                  Restaurer
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
