/** Statistiques anonymes (GA4) : aucun nom, aucun texte de défi, aucun code de salon. */
export const GA_ID = "G-CX5E2NZDKT";

type Gtag = (...args: unknown[]) => void;

export function track(event: string, params?: Record<string, string | number>) {
  if (typeof window === "undefined") return;
  (window as unknown as { gtag?: Gtag }).gtag?.("event", event, params);
}
