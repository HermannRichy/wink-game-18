"use client";

import { useState } from "react";
import { MOODS, TAGS, saveProfile, type Mood, type SingleProfile } from "@/lib/singles";
import { Screen, TopBar } from "@/components/ui";
import { sfx } from "@/lib/sound";

const field = "h-12 w-full rounded-[14px] border-[3px] border-ink bg-white px-3 text-[16px] font-bold placeholder:text-ink/40";

export function SinglesProfile({
  initial,
  defaults,
  onSave,
  onBack,
  cta = "Trouver quelqu'un",
}: {
  initial: SingleProfile | null;
  defaults: { nick: string };
  onSave: (p: SingleProfile) => void;
  onBack: () => void;
  cta?: string;
}) {
  const [nick, setNick] = useState(initial?.nick ?? defaults.nick);
  const [age, setAge] = useState(initial ? String(initial.age) : "");
  const [gender, setGender] = useState<"h" | "f" | "">(initial?.gc ? initial.gender : "");
  const [ageMin, setAgeMin] = useState(String(initial?.ageMin ?? 18));
  const [ageMax, setAgeMax] = useState(String(initial?.ageMax ?? 35));
  const [city, setCity] = useState(initial?.city ?? "");
  const [country, setCountry] = useState(initial?.country ?? "Bénin");
  const [tags, setTags] = useState<string[]>(initial?.tags ?? []);
  const [mood, setMood] = useState<Mood>(initial?.mood ?? "jouer");
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const a = Number(age);
    const lo = Number(ageMin);
    const hi = Number(ageMax);
    if (!nick.trim()) return setError("Choisis un pseudo.");
    if (!a) return setError("Indique ton âge.");
    if (a < 18) return setError("Le mode Célibataires est réservé aux 18 ans et plus.");
    if (a > 99) return setError("Âge invalide.");
    if (!gender) return setError("Indique si tu es un homme ou une femme.");
    if (!(lo >= 18 && hi <= 99 && lo <= hi)) return setError("Âge recherché : entre 18 et 99, du plus petit au plus grand.");
    if (!city.trim() || !country.trim()) return setError("Indique ta ville et ton pays.");
    if (tags.length !== 3) return setError("Choisis 3 centres d'intérêt.");
    const p: SingleProfile = { nick: nick.trim().slice(0, 20), age: a, gender, ageMin: lo, ageMax: hi, city: city.trim().slice(0, 40), country: country.trim().slice(0, 40), tags, mood, gc: true };
    saveProfile(p);
    sfx.success();
    onSave(p);
  }

  const seg = (on: boolean) => `h-11 flex-1 rounded-xl border-[3px] border-ink text-[14px] font-extrabold ${on ? "bg-ink text-cream" : "bg-cream"}`;

  return (
    <Screen>
      <TopBar onBack={onBack} right={<span className="rounded-full bg-ink px-3 py-1 text-[11px] font-extrabold uppercase text-pop">Célibataires</span>} />
      <div>
        <h1 className="text-[34px] font-black leading-none tracking-[-1.5px]">Ton profil secret</h1>
        <p className="mt-2 rounded-xl border-[2.5px] border-dashed border-ink bg-white px-3 py-2 text-[12.5px] font-bold">
          🔒 Il reste sur ton téléphone. Seul le minimum part le temps de trouver un match, puis c&apos;est effacé.
        </p>
      </div>
      <form onSubmit={submit} className="flex flex-1 flex-col gap-3.5">
        <div className="flex gap-2.5">
          <label className="flex flex-[2] flex-col gap-1 text-xs font-extrabold">
            Pseudo
            <input value={nick} onChange={(e) => setNick(e.target.value)} maxLength={20} autoComplete="off" placeholder="Ton pseudo" className={`${field} bg-candy`} />
          </label>
          <label className="flex flex-1 flex-col gap-1 text-xs font-extrabold">
            Âge
            <input value={age} onChange={(e) => setAge(e.target.value.replace(/\D/g, ""))} inputMode="numeric" maxLength={2} placeholder="25" className={field} />
          </label>
        </div>
        <div role="group" aria-label="Je suis" className="flex flex-col gap-1 text-xs font-extrabold">
          Je suis · je cherche
          <div className="flex gap-2">
            <button type="button" aria-pressed={gender === "h"} onClick={() => setGender("h")} className={seg(gender === "h")}>
              Homme → Femme
            </button>
            <button type="button" aria-pressed={gender === "f"} onClick={() => setGender("f")} className={seg(gender === "f")}>
              Femme → Homme
            </button>
          </div>
        </div>
        <div className="flex items-end gap-2 text-xs font-extrabold">
          <label className="flex flex-1 flex-col gap-1">
            Âge recherché, de
            <input value={ageMin} onChange={(e) => setAgeMin(e.target.value.replace(/\D/g, ""))} inputMode="numeric" maxLength={2} aria-label="Âge minimum recherché" className={field} />
          </label>
          <label className="flex flex-1 flex-col gap-1">
            à
            <input value={ageMax} onChange={(e) => setAgeMax(e.target.value.replace(/\D/g, ""))} inputMode="numeric" maxLength={2} aria-label="Âge maximum recherché" className={field} />
          </label>
        </div>
        <div className="flex gap-2.5 text-xs font-extrabold">
          <label className="flex flex-1 flex-col gap-1">
            Ville
            <input value={city} onChange={(e) => setCity(e.target.value)} maxLength={40} placeholder="Cotonou" className={field} />
          </label>
          <label className="flex flex-1 flex-col gap-1">
            Pays
            <input value={country} onChange={(e) => setCountry(e.target.value)} maxLength={40} className={field} />
          </label>
        </div>
        <div role="group" aria-label="Centres d'intérêt" className="flex flex-col gap-1.5 text-xs font-extrabold">
          3 centres d&apos;intérêt ({tags.length}/3)
          <div className="flex flex-wrap gap-1.5">
            {TAGS.map((t) => {
              const on = tags.includes(t);
              return (
                <button
                  key={t}
                  type="button"
                  aria-pressed={on}
                  onClick={() => {
                    sfx.click();
                    setTags((cur) => (on ? cur.filter((x) => x !== t) : cur.length < 3 ? [...cur, t] : cur));
                  }}
                  className={`rounded-full border-[2.5px] border-ink px-3 py-1.5 text-[12.5px] font-extrabold ${on ? "bg-pop" : "bg-white"} ${!on && tags.length >= 3 ? "opacity-40" : ""}`}
                >
                  {t}
                </button>
              );
            })}
          </div>
        </div>
        <div role="radiogroup" aria-label="Envie du moment" className="flex flex-col gap-1.5 text-xs font-extrabold">
          Envie du moment
          <div className="flex gap-2">
            {MOODS.map((m) => (
              <button key={m.id} type="button" role="radio" aria-checked={mood === m.id} onClick={() => setMood(m.id)} className={seg(mood === m.id)}>
                {m.label}
              </button>
            ))}
          </div>
          <span className="font-semibold">{MOODS.find((m) => m.id === mood)?.desc}. On prend toujours la plus douce des deux envies.</span>
        </div>
        {error && (
          <p role="alert" className="rounded-xl border-[3px] border-ink bg-candy p-2.5 text-sm font-bold">
            {error}
          </p>
        )}
        <button type="submit" className="brutal press mt-auto h-[58px] rounded-[18px] bg-passion text-lg font-black uppercase text-cream">
          {cta}
        </button>
      </form>
    </Screen>
  );
}
