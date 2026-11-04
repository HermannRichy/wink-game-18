import type { Metadata, Viewport } from "next";
import "./globals.css";

const SITE_URL = "https://wink.hermannrichy.site";
const TITLE = "Wink — les jeux à deux qui font monter la température";
const DESCRIPTION =
  "Cartes coquines, quiz, Ludo Hot et La Tour : des jeux drôles et sensuels pour les couples. Gratuit, sans inscription, 100 % hors ligne. Réservé aux 18 ans et plus.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: TITLE, template: "%s · Wink" },
  description: DESCRIPTION,
  applicationName: "Wink",
  authors: [{ name: "Hermann Richy" }],
  creator: "Hermann Richy",
  publisher: "Digital Innovation",
  keywords: ["jeu couple", "jeu coquin", "action ou vérité", "jeu à deux", "soirée en amoureux", "ludo", "quiz couple", "PWA"],
  category: "games",
  manifest: "/manifest.webmanifest",
  alternates: { canonical: "/" },
  appleWebApp: { capable: true, title: "Wink", statusBarStyle: "default" },
  formatDetection: { telephone: false, email: false, address: false },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48" },
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    url: SITE_URL,
    siteName: "Wink",
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Wink, les jeux à deux qui font monter la température" }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/og.png"],
  },
  robots: { index: true, follow: true },
  other: { rating: "adult", "mobile-web-app-capable": "yes" },
};

export const viewport: Viewport = {
  themeColor: "#FF2E4D",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
