"use client";

import type { ReactNode } from "react";

type IconName = "soundOn" | "soundOff" | "back" | "settings" | "cards" | "quiz" | "dice" | "tower" | "wifi" | "timer" | "heart" | "heartFill" | "share" | "lock" | "plus";

const PATHS: Record<IconName, ReactNode> = {
  soundOn: (
    <>
      <path d="M4 9h4l5-4v14l-5-4H4z" />
      <path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" />
    </>
  ),
  soundOff: (
    <>
      <path d="M4 9h4l5-4v14l-5-4H4z" />
      <path d="m17 9 5 6M22 9l-5 6" />
    </>
  ),
  back: <path d="M15 5 8 12l7 7" />,
  settings: (
    <>
      <path d="M4 6h9M19 6h1M4 12h3M13 12h7M4 18h11" />
      <circle cx="16" cy="6" r="2.5" />
      <circle cx="10" cy="12" r="2.5" />
      <circle cx="18" cy="18" r="2.5" />
    </>
  ),
  cards: (
    <>
      <rect x="3" y="5" width="11" height="15" rx="2" transform="rotate(-10 8 12)" />
      <rect x="10" y="3" width="11" height="15" rx="2" />
    </>
  ),
  quiz: <path d="M4 9h16M4 15h16M10 3 8 21M16 3l-2 18" />,
  dice: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="4" />
      <circle cx="8.5" cy="8.5" r="1.4" fill="currentColor" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" />
      <circle cx="15.5" cy="15.5" r="1.4" fill="currentColor" />
    </>
  ),
  tower: (
    <>
      <rect x="4" y="3" width="16" height="4.5" rx="1" />
      <rect x="4" y="9.75" width="16" height="4.5" rx="1" />
      <rect x="4" y="16.5" width="16" height="4.5" rx="1" />
    </>
  ),
  wifi: (
    <>
      <path d="M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0" />
      <circle cx="12" cy="19.5" r="1.2" fill="currentColor" />
    </>
  ),
  timer: (
    <>
      <circle cx="12" cy="13" r="8" />
      <path d="M12 9v4l2.5 2M10 2h4" />
    </>
  ),
  heart: <path d="M12 20s-7-4.4-9.3-9C1 7.6 3 4 6.5 4c2 0 3.5 1.2 5.5 3.5C14 5.2 15.5 4 17.5 4 21 4 23 7.6 21.3 11 19 15.6 12 20 12 20z" />,
  heartFill: <path fill="currentColor" d="M12 20s-7-4.4-9.3-9C1 7.6 3 4 6.5 4c2 0 3.5 1.2 5.5 3.5C14 5.2 15.5 4 17.5 4 21 4 23 7.6 21.3 11 19 15.6 12 20 12 20z" />,
  share: <path d="M12 3v12M7 8l5-5 5 5M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" />,
  lock: (
    <>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
};

export function Icon({ name, size = 22, stroke = 2.4, className = "" }: { name: IconName; size?: number; stroke?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {PATHS[name]}
    </svg>
  );
}

export function IconButton({ label, icon, onClick, className = "bg-cream" }: { label: string; icon: IconName; onClick?: () => void; className?: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`brutal-sm press flex h-12 w-12 items-center justify-center rounded-2xl text-ink ${className}`}
    >
      <Icon name={icon} />
    </button>
  );
}

export function SoundToggle({ on, className = "bg-cream" }: { on: boolean; className?: string }) {
  return (
    <IconButton
      label={on ? "Couper le son" : "Activer le son"}
      icon={on ? "soundOn" : "soundOff"}
      className={className}
      onClick={async () => {
        const { saveSettings } = await import("@/lib/db");
        const { setSoundEnabled, sfx } = await import("@/lib/sound");
        setSoundEnabled(!on);
        if (!on) sfx.click();
        await saveSettings({ soundOn: !on });
      }}
    />
  );
}

export function Screen({ children, className = "bg-cream" }: { children: ReactNode; className?: string }) {
  return (
    <main
      className={`mx-auto flex min-h-dvh w-full max-w-md flex-col gap-5 px-5 pb-[max(1.75rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))] ${className}`}
    >
      {children}
    </main>
  );
}

export function TopBar({ onBack, title, right }: { onBack?: () => void; title?: string; right?: ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      {onBack ? <IconButton label="Retour" icon="back" onClick={onBack} /> : <span className="w-12" />}
      {title && <span className="text-[22px] font-extrabold">{title}</span>}
      <span className="flex min-w-12 justify-end">{right}</span>
    </div>
  );
}
