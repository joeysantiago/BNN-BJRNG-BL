export interface YtVideo {
  id: string;
  title: string;
  artist: string;
  /** Length in seconds, 0 when unknown. */
  duration: number;
  thumb: string;
}

export interface YtInput {
  /** Video id found in the pasted text. */
  video?: string;
  /** Playlist id found in the pasted text. */
  list?: string;
}

/** Whether the local helper (npm run youtube) answers: unknown until the first check. */
export type HelperState = 'checking' | 'up' | 'down';
