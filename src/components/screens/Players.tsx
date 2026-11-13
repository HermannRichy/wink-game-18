"use client";

import { useState } from "react";
import { LEVELS, LEVEL_BG, type Gender, type Level } from "@/data/cards";
import { saveSettings, type Settings } from "@/lib/db";
import { Screen, TopBar } from "@/components/ui";
import { sfx } from "@/lib/sound";


export function GenderPicker({ value, onChange, label }: { value: Gender; onChange: (g: Gender) => void; label: string }) {
  return (
    <div role="group" aria-label={label} className="grid grid-cols-2 gap-2">
      {(
        [
          ["h", "Homme"],
          ["f", "Femme"],
        ] as const
      ).map(([g, name]) => (
        <button
          key={g}
          type="button"
          aria-pressed={value === g}
          onClick={() => {
            sfx.click();
            onChange(g);
          }}
          className={`h-11 rounded-xl border-[3px] border-ink text-[15px] font-bold ${value === g ? "bg-ink text-cream" : "bg-cream"}`}
        >
          {name}
        </button>
      ))}
    </div>
  );
}

export function Players({
  settings,
  onDone,
  onBack,
  onTour,
  join,
}: {
  settings: Settings;
  onDone: () => void;
  onBack?: () => void;
  onTour?: () => void;
  /** Arrivée par un code ou un lien d'invitation : seulement son propre prénom */
  join?: boolean;
}) {
  const [p1, setP1] = useState(settings.player1);
  const [p2, setP2] = useState(settings.player2);
  const [g1, setG1] = useState<Gender>(settings.player1Gender);
  const [g2, setG2] = useState<Gender>(settings.player2Gender);
  const [level, setLevel] = useState<Level>(settings.maxLevel);
  // Seule ta propre identité est obligatoire ; celle du ou de la partenaire sert aux jeux sur un seul téléphone
  const ready = p1.trim().length > 0 && g1 !== "" && (p2.trim().length === 0 || g2 !== "");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!ready) return;
    sfx.success();
    await saveSettings(join ? { player1: p1.trim(), player1Gender: g1 } : { player1: p1.trim(), player2: p2.trim(), player1Gender: g1, player2Gender: p2.trim() ? g2 : "", maxLevel: level });
    onDone();
  }

  return (
    <Screen>
      <TopBar onBack={onBack} right={<span className="font-mono text-[13px] font-bold">{onBack ? "RÉGLAGES" : join ? "AVANT DE REJOINDRE" : "DERNIÈRE ÉTAPE"}</span>} />

      <div className="flex flex-col gap-1.5">
        <h1 className="text-[44px] font-black leading-[0.95] tracking-[-2px]">
          {join ? (
            <>
              Et <span className="highlight">toi</span>, c&apos;est ?
            </>
          ) : (
            <>
              Qui joue <span className="highlight">ce soir</span> ?
            </>
          )}
        </h1>
        <p className="text-base font-medium">
          {join ? "Ton prénom et ton genre accordent chaque défi. On ne te le redemandera pas." : "Ton prénom d'abord, celui de ton ou ta partenaire ensuite. Ils accordent chaque défi."}
        </p>
      </div>

      <form onSubmit={submit} className="flex flex-1 flex-col gap-5">
        <div className="flex flex-col gap-3.5">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-bold">Toi</span>
            <input
              value={p1}
              onChange={(e) => setP1(e.target.value)}
              maxLength={20}
              autoComplete="off"
              placeholder="Ton prénom"
              aria-label="Ton prénom"
              className="h-14 rounded-2xl border-[3px] border-ink bg-candy px-4 text-xl font-bold shadow-[4px_4px_0_#141414] placeholder:text-ink/50"
            />
          </label>
          <GenderPicker value={g1} onChange={setG1} label="Ton genre" />
          {!join && (
          <>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-bold">
              Ton ou ta partenaire <span className="font-medium opacity-60">(facultatif)</span>
            </span>
            <input
              value={p2}
              onChange={(e) => setP2(e.target.value)}
              maxLength={20}
              autoComplete="off"
              placeholder="Son prénom"
              aria-label="Prénom de ton ou ta partenaire"
              className="h-14 rounded-2xl border-[3px] border-ink bg-flame px-4 text-xl font-bold shadow-[4px_4px_0_#141414] placeholder:text-ink/50"
            />
          </label>
          <GenderPicker value={g2} onChange={setG2} label="Genre de ton ou ta partenaire" />
          <p className="-mt-1 text-xs font-medium">Pour jouer à deux sur un seul téléphone. En ligne, son prénom arrive tout seul.</p>
          </>
          )}
        </div>

        {!join && (
        <fieldset className="flex flex-col gap-2.5">
          <legend className="mb-2.5 text-sm font-bold">Jusqu'où on va ?</legend>
          {LEVELS.map((lv) => {
            const on = level === lv.id;
            return (
              <button
                key={lv.id}
                type="button"
                aria-pressed={on}
                onClick={() => {
                  sfx.click();
                  setLevel(lv.id);
                }}
                className={`flex h-16 items-center justify-between rounded-2xl border-[3px] border-ink px-4 text-left transition ${on ? `${LEVEL_BG[lv.id]} shadow-[4px_4px_0_#141414]` : "bg-cream"}`}
              >
                <span className="flex flex-col">
                  <span className="text-lg font-extrabold">{lv.name}</span>
                  <span className="text-[13px] font-medium">{lv.desc}</span>
                </span>
                <span className={`h-[22px] w-[22px] rounded-full border-[3px] border-ink ${on ? "bg-ink" : ""}`} />
              </button>
            );
          })}
          <p className="text-xs font-medium">Les cartes montent en intensité au fil de la partie, sans jamais dépasser ce niveau.</p>
        </fieldset>
        )}

        <button
          type="submit"
          disabled={!ready}
          className="brutal press mt-auto h-[60px] rounded-[18px] bg-passion text-lg font-extrabold tracking-wide disabled:opacity-50"
        >
          {join ? "REJOINDRE LA PARTIE" : "C'EST PARTI"}
        </button>
        {onTour && (
          <button
            type="button"
            onClick={() => {
              sfx.click();
              onTour();
            }}
            className="text-sm font-semibold underline"
          >
            Revoir la visite guidée
          </button>
        )}
      </form>
    </Screen>
  );
}

/** Avant un jeu sur un seul téléphone : prénom et genre de ton ou ta partenaire (retenus pour la suite) */
export function PartnerSheet({ settings, onDone, onCancel }: { settings: Settings; onDone: () => void; onCancel: () => void }) {
  const [name, setName] = useState(settings.player2);
  const [gender, setGender] = useState<Gender>(settings.player2Gender);
  const ok = name.trim().length > 0 && gender !== "";
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/60 p-4" role="dialog" aria-modal="true" aria-labelledby="partner-title" onClick={onCancel}>
      <form
        className="pop-in flex w-full max-w-md flex-col gap-3.5 rounded-[26px] border-[3px] border-ink bg-cream p-5 shadow-[6px_6px_0_#141414]"
        onClick={(e) => e.stopPropagation()}
        onSubmit={async (e) => {
          e.preventDefault();
          if (!ok) return;
          sfx.success();
          await saveSettings({ player2: name.trim(), player2Gender: gender });
          onDone();
        }}
      >
        <h2 id="partner-title" className="text-[30px] font-black leading-none tracking-tight">
          Avec qui tu joues ?
        </h2>
        <p className="-mt-1 text-sm font-medium">Son prénom et son genre accordent les défis. On le retient pour la prochaine fois.</p>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={20}
          autoComplete="off"
          autoFocus
          placeholder="Son prénom"
          aria-label="Prénom de ton ou ta partenaire"
          className="h-14 rounded-2xl border-[3px] border-ink bg-flame px-4 text-xl font-bold shadow-[4px_4px_0_#141414] placeholder:text-ink/50"
        />
        <GenderPicker value={gender} onChange={setGender} label="Genre de ton ou ta partenaire" />
        <button type="submit" disabled={!ok} className="brutal press h-14 rounded-2xl bg-passion text-base font-extrabold disabled:opacity-50">
          ON JOUE
        </button>
      </form>
    </div>
  );
}
