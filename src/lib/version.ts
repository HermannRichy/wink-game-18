"use client";

/** Commit de la version qui tourne sur ce téléphone */
export const RUNNING_SHA = process.env.NEXT_PUBLIC_BUILD_SHA ?? "";

/** Vrai si une version plus récente est en ligne (lue sur le serveur, jamais en cache) */
export async function isOutdated(): Promise<string | null> {
  if (!RUNNING_SHA || !navigator.onLine) return null;
  try {
    const r = await fetch(`/version.json?t=${Date.now()}`, { cache: "no-store" });
    if (!r.ok) return null;
    const { sha } = (await r.json()) as { sha?: string };
    return sha && sha !== RUNNING_SHA ? sha : null;
  } catch {
    return null;
  }
}

/** Met à jour le service worker puis recharge (une seule fois par version, pour ne jamais boucler) */
export async function applyUpdate(target: string) {
  const key = "wink-reloaded-for";
  try {
    if (sessionStorage.getItem(key) === target) return false;
    sessionStorage.setItem(key, target);
  } catch {
    /* ignore */
  }
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) {
      await reg.update().catch(() => {});
      // On laisse le nouveau service worker prendre le contrôle (4 s max)
      await new Promise<void>((resolve) => {
        const done = () => resolve();
        navigator.serviceWorker.addEventListener("controllerchange", done, { once: true });
        if (!reg.installing && !reg.waiting) setTimeout(done, 600);
        setTimeout(done, 4000);
      });
    }
  } catch {
    /* ignore */
  }
  window.location.reload();
  return true;
}
