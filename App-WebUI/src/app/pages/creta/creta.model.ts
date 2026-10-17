export interface Track {
  id: number;
  title: string;
  /** Address of the audio, from the music API. */
  audioUrl: string;
  artist: string | null;
  /** Address of the cover picture, or null when the song has none. */
  coverUrl: string | null;
}

export interface TracksResponse {
  tracks: Track[];
}

export type Repeat = 'off' | 'all' | 'one';

export type PlayerId = 'creta' | 'nexon';
