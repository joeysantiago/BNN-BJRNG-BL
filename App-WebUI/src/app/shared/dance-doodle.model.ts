export type DanceVariant = 'stick' | 'trio' | 'robot' | 'cat' | 'blob' | 'lines';

export type DanceChoice = DanceVariant | 'auto';

export type Pt = [number, number];

export interface DancePalette {
  /** Main stroke colour. */
  ink: string;
  /** Accent colours, taken from the active skin. */
  a: string;
  b: string;
  muted: string;
}

/** What the drawing code needs for one frame. All levels run from 0 to 1. */
export interface DanceState {
  /** Seconds since start. */
  t: number;
  /** Dance phase in radians. Speeds up with the music. */
  ph: number;
  /** Smoothed loudness. */
  e: number;
  /** Beat pulse: jumps to 1 on a kick and fades. */
  beat: number;
  bass: number;
  mid: number;
  high: number;
  /** Frequency bars, low to high pitch. */
  bars: number[];
  /** Changes 8 times a second, so hand-drawn lines "boil" like a doodle. */
  frame: number;
  pal: DancePalette;
}

export interface Joints {
  hip: Pt;
  neck: Pt;
  head: Pt;
  lElbow: Pt;
  lHand: Pt;
  rElbow: Pt;
  rHand: Pt;
  lKnee: Pt;
  lFoot: Pt;
  rKnee: Pt;
  rFoot: Pt;
  lean: number;
  /** Scale of this figure. */
  k: number;
}

export interface AudioContextWindow {
  AudioContext?: typeof AudioContext;
  webkitAudioContext?: typeof AudioContext;
}
