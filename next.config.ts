import withSerwistInit from "@serwist/next";
import { randomUUID } from "node:crypto";
import type { NextConfig } from "next";

const revision = randomUUID();

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
  images: { unoptimized: true },
};

export default withSerwist(nextConfig);
