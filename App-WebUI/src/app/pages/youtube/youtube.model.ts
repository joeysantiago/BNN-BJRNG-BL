export interface YtVideo {
  id: string;
  thumb: string;
  title: string;
  artist: string;
  /** Length in seconds, 0 when unknown. */
  duration: number;
}

export interface YtInput {
  /** Playlist id found in the pasted text. */
  list?: string;
  /** Video id found in the pasted text. */
  video?: string;
}

export interface YtDownloadInfo {
  /** What the server hands out: MP3 where it can convert, otherwise the original audio (M4A). */
  format: 'mp3' | 'm4a';
}

export interface YtPlaylist {
  id: string;
  name: string;
  songs: YtVideo[];
}

export type YtMessage = '' | 'noresults' | 'failed' | 'badlink' | 'needlink' | 'serverdown' | 'noplaylist';

/** The part of the YouTube IFrame Player API that this page uses. https://developers.google.com/youtube/iframe_api_reference */
export interface YtPlayer {
  mute(): void;
  unMute(): void;
  destroy(): void;
  playVideo(): void;
  pauseVideo(): void;
  getDuration(): number;
  getCurrentTime(): number;
  getPlayerState(): number;
  setVolume(volume: number): void;
  getAvailableQualityLevels(): string[];
  setPlaybackQuality(quality: string): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  loadVideoById(videoId: string, startSeconds?: number): void;
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
