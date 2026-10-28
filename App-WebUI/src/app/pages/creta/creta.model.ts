export interface Track {
  title: string;
  artist?: string;
  /** File name inside the audio folder, for example "song.mp3". */
  file: string;
  /** Optional cover image, also inside the audio folder. */
  cover?: string;
}

export type Repeat = 'off' | 'all' | 'one';

export type PlayerId = 'creta' | 'nexon';

export interface PlayerConfig {
  /** Public URL folder holding the audio files and playlist.json. */
  dir: string;
  /** Same folder inside the repository. */
  repoDir: string;
  /** Page path, with trailing slash. */
  path: string;
  /** Display name. */
  name: string;
  /** SHA-256 (hex) of the password needed to delete a song. */
  passwordHash: string;
}
