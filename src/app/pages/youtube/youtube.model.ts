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

export type YtMessage = '' | 'noresults' | 'failed' | 'badlink' | 'needlink' | 'badkey';

/** The part of the YouTube IFrame Player API that this page uses. https://developers.google.com/youtube/iframe_api_reference */
export interface YtPlayer {
  playVideo(): void;
  pauseVideo(): void;
  mute(): void;
  unMute(): void;
  destroy(): void;
  setVolume(volume: number): void;
  loadVideoById(videoId: string): void;
  setPlaybackQuality(quality: string): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  getDuration(): number;
  getCurrentTime(): number;
  getPlayerState(): number;
}

export interface YtPlayerOptions {
  host: string;
  width: string;
  height: string;
  playerVars: Record<string, number | string>;
  events: { onReady: () => void; onStateChange: (e: { data: number }) => void; onError: (e: { data: number }) => void };
}

export interface YtPlayerApi {
  Player: new (element: HTMLElement, options: YtPlayerOptions) => YtPlayer;
}

export interface YtWindow {
  YT?: YtPlayerApi;
  onYouTubeIframeAPIReady?: () => void;
}

/** YT.PlayerState values. */
export const YT_ENDED = 0;
export const YT_PLAYING = 1;
export const YT_PAUSED = 2;
