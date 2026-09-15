import type { ReactNode } from "react";

const paths: Record<string, ReactNode> = {
  back: <path d="m12 19-7-7 7-7m-7 7h14" />,
  play: <path d="m8 5 11 7-11 7Z" />,
  pause: <><path d="M8 5v14M16 5v14" /></>,
  previous: <path d="m14 18-6-6 6-6" />,
  next: <path d="m10 6 6 6-6 6" />,
  reset: <><path d="M3 10a9 9 0 1 1 2.7 8.4M3 4v6h6" /></>,
  star: <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3l-5.6 2.9 1.1-6.2L3 9.6l6.2-.9Z" />,
  edit: <><path d="m16 3 5 5-12 12H4v-5ZM14 5l5 5" /></>,
  history: <><path d="M3 10a9 9 0 1 1 2.7 8.4M3 4v6h6M12 7v5l3 2" /></>,
  more: <><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></>,
  expand: <path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5" />,
  close: <path d="m6 6 12 12M6 18 18 6" />,
  list: <><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" /></>,
  audio: <><path d="m11 5-6 4H2v6h3l6 4ZM15 8a6 6 0 0 1 0 8M18 5a10 10 0 0 1 0 14" /></>,
  pedal: <><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M8 8h8M8 11h8" /><circle cx="12" cy="17" r="1" /></>,
  tools: <><path d="M4 7h16M4 17h16M8 4v6M16 14v6" /></>,
  check: <path d="m20 6-11 11-5-5" />,
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  up: <path d="m6 14 6-6 6 6" />,
  down: <path d="m6 10 6 6 6-6" />,
  music: <><path d="M9 18V5l12-2v13M9 9l12-2" /><ellipse cx="6" cy="18" rx="3" ry="3" /><ellipse cx="18" cy="16" rx="3" ry="3" /></>,
  help: <><circle cx="12" cy="12" r="9" /><path d="M9.5 9a2.5 2.5 0 1 1 4.3 1.7c-1.1.8-1.8 1.1-1.8 2.3M12 17h.01" /></>,
  print: <><path d="M6 9V3h12v6M6 17H3V9h18v8h-3M6 14h12v7H6Z" /></>,
  download: <path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5" />,
  copy: <><rect x="8" y="8" width="12" height="13" rx="2" /><path d="M16 8V3H3v13h5" /></>,
  share: <><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="m9 10 6-4M9 14l6 4" /></>,
};

export function DemoIcon({ name, filled = false }: { name: string; filled?: boolean }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] ?? paths.music}</svg>;
}

