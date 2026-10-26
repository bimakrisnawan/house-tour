// Line icons drawn for this UI (24 px grid, 1.6 px stroke, currentColor).
const P = {
  walk: 'M12 6.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM12 8v6m0 0-3 7m3-7 3 7M8 11l4-1.5 4 1.5',
  fly: 'M3 14l9-9 9 9M12 5v15',
  lamp: 'M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9V16h7v-2.1A6 6 0 0 0 12 3Z',
  time: 'M12 7v5l3 2M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z',
  measure: 'M3 17 17 3l4 4L7 21zM7 13l2 2M10 10l2 2M13 7l2 2',
  compare: 'M12 3v18M4 6h6v12H4zM14 6h6v12h-6z',
  photo: 'M3 8h4l2-3h6l2 3h4v12H3zM12 17a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z',
  menu: 'M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M16 6a2 2 0 1 0 4 0 2 2 0 0 0-4 0ZM8 12a2 2 0 1 0 4 0 2 2 0 0 0-4 0ZM16 18a2 2 0 1 0 4 0 2 2 0 0 0-4 0Z',
  plan: 'M3 4h18v16H3zM3 12h9V4M12 16v4',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 11v6M12 7.5v.5',
  close: 'M6 6l12 12M18 6 6 18',
  sound: 'M4 9h4l5-4v14l-5-4H4zM17 9a4 4 0 0 1 0 6',
  mute: 'M4 9h4l5-4v14l-5-4H4zM17 10l4 4M21 10l-4 4',
  up: 'M6 15l6-6 6 6',
  down: 'M6 9l6 6 6-6',
} as const;

export type IconName = keyof typeof P;

export const Icon = ({ name }: { name: IconName }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="icon">
    <path d={P[name]} />
  </svg>
);
