import { TrackerIconName, TrackerIconShape } from './models/tracker.model';

/**
 * SnapTracker line icons (24 x 24, drawn with the current text colour), as shapes so they render the same when prerendered. The icons both apps have use
 * SnapKhata's drawings unchanged (khata-icons.ts), so SnapTracker looks the same; info, sms, copies, pause, play, layers, down, up, tag and spark are its own, in the same style.
 */
export const TRACKER_ICONS: Record<TrackerIconName, TrackerIconShape[]> = {
  home: [{ tag: 'path', d: 'm3 10 9-7 9 7v10a2 2 0 0 1-2 2h-4v-7H9v7H5a2 2 0 0 1-2-2z' }],
  list: [{ tag: 'path', d: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01' }],
  user: [{ tag: 'circle', cx: 12, cy: 8, r: 4 }, { tag: 'path', d: 'M4 21a8 8 0 0 1 16 0' }],
  plus: [{ tag: 'path', d: 'M12 5v14M5 12h14' }],
  search: [{ tag: 'circle', cx: 11, cy: 11, r: 7 }, { tag: 'path', d: 'm20 20-3.5-3.5' }],
  x: [{ tag: 'path', d: 'M18 6 6 18M6 6l12 12' }],
  check: [{ tag: 'path', d: 'M20 6 9 17l-5-5' }],
  alert: [{ tag: 'circle', cx: 12, cy: 12, r: 10 }, { tag: 'path', d: 'M12 8v4M12 16h.01' }],
  bell: [{ tag: 'path', d: 'M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9' }, { tag: 'path', d: 'M10.3 21a1.94 1.94 0 0 0 3.4 0' }],
  settings: [{ tag: 'circle', cx: 12, cy: 12, r: 3 }, { tag: 'path', d: 'M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z' }],
  shield: [{ tag: 'path', d: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z' }, { tag: 'path', d: 'm9 12 2 2 4-4' }],
  trash: [{ tag: 'path', d: 'M3 6h18M8 6V4h8v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6' }],
  edit: [{ tag: 'path', d: 'M12 20h9' }, { tag: 'path', d: 'M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z' }],
  download: [{ tag: 'path', d: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3' }],
  zap: [{ tag: 'path', d: 'M13 2 3 14h9l-1 8 10-12h-9z' }],
  trend: [{ tag: 'path', d: 'm22 7-8.5 8.5-5-5L2 17' }, { tag: 'path', d: 'M16 7h6v6' }],
  wallet: [{ tag: 'path', d: 'M20 7H5a2 2 0 0 1 0-4h13v4' }, { tag: 'path', d: 'M3 5v14a2 2 0 0 0 2 2h15V7' }, { tag: 'circle', cx: 16, cy: 14, r: 1.5 }],
  chev: [{ tag: 'path', d: 'm9 18 6-6-6-6' }],
  info: [{ tag: 'circle', cx: 12, cy: 12, r: 10 }, { tag: 'path', d: 'M12 16v-4M12 8h.01' }],
  sms: [{ tag: 'path', d: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z' }, { tag: 'path', d: 'M8 9h8M8 13h5' }],
  copies: [{ tag: 'rect', x: 8, y: 8, width: 13, height: 13, rx: 2 }, { tag: 'path', d: 'M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1' }],
  pause: [{ tag: 'path', d: 'M9 5v14M15 5v14' }],
  play: [{ tag: 'path', d: 'm7 4 13 8-13 8z' }],
  layers: [{ tag: 'path', d: 'm12 2 10 5-10 5L2 7z' }, { tag: 'path', d: 'm2 17 10 5 10-5M2 12l10 5 10-5' }],
  down: [{ tag: 'path', d: 'M12 5v14M19 12l-7 7-7-7' }],
  up: [{ tag: 'path', d: 'M12 19V5M5 12l7-7 7 7' }],
  tag: [{ tag: 'path', d: 'M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z' }, { tag: 'circle', cx: 7.5, cy: 7.5, r: 1.5 }],
  spark: [{ tag: 'path', d: 'M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8' }],
};

/** Icons drawn for left-to-right that turn around in Arabic (right to left). */
export const TRACKER_FLIP_ICONS: readonly TrackerIconName[] = ['chev'];
