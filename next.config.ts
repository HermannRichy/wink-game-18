import withSerwistInit from "@serwist/next";
import { randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";
import type { NextConfig } from "next";

const revision = randomUUID();
const SHA = (process.env.VERCEL_GIT_COMMIT_SHA ?? "").slice(0, 7);
// Version publiée, lue par l'app pour savoir si elle tourne sur une ancienne version
try {
  writeFileSync("public/version.json", JSON.stringify({ sha: SHA }));
} catch {
  /* lecture seule */
}

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  additionalPrecacheEntries: [{ url: "/", revision }],
  // Le moteur physique (WASM intégré) pèse ~2,3 Mo : on le met aussi en cache pour le hors ligne
  maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
  cacheOnNavigation: true,
  reloadOnOnline: false,
  disable: process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = {
  output: "export",
  // Version affichée dans les réglages : date du build + commit (Vercel)
  env: {
    NEXT_PUBLIC_BUILD_TIME: new Date().toISOString(),
    NEXT_PUBLIC_BUILD_SHA: SHA,
  },
  images: { unoptimized: true },
};

export default withSerwist(nextConfig);
