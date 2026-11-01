export type DanceVariant = 'stick' | 'trio' | 'robot' | 'cat' | 'blob' | 'lines';

export type DanceChoice = DanceVariant | 'auto';

export type Pt = [number, number];

export interface DancePalette {
  /** Accent colours, taken from the active skin. */
  a: string;
  b: string;
  /** Main stroke colour. */
  ink: string;
  muted: string;
}

/** What the drawing code needs for one frame. All levels run from 0 to 1. */
export interface DanceState {
  /** Smoothed loudness. */
  e: number;
  /** Seconds since start. */
  t: number;
  /** Dance phase in radians. Speeds up with the music. */
  ph: number;
  mid: number;
  bass: number;
  /** Beat pulse: jumps to 1 on a kick and fades. */
  beat: number;
  high: number;
  /** Changes 8 times a second, so hand-drawn lines "boil" like a doodle. */
  frame: number;
  /** Frequency bars, low to high pitch. */
  bars: number[];
  pal: DancePalette;
}

export interface Joints {
  hip: Pt;
  head: Pt;
  neck: Pt;
  /** Scale of this figure. */
  k: number;
  lFoot: Pt;
  lHand: Pt;
  lKnee: Pt;
  rFoot: Pt;
  rHand: Pt;
  rKnee: Pt;
  lElbow: Pt;
  rElbow: Pt;
  lean: number;
}

export interface AudioContextWindow {
  AudioContext?: typeof AudioContext;
  webkitAudioContext?: typeof AudioContext;
}
