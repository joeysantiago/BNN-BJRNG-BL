export type Phase = 'idle' | 'ping' | 'down' | 'up' | 'done' | 'stopped' | 'error';

export interface Meter {
  start: number;
  /** Live speed in Mbps over the last second. */
  rate(): number;
  /** Final speed in Mbps: the sustained speed after warm-up, ignoring stalls and bursts. */
  final(): number;
  /** True when the phase should end: time is up, or the speed has been steady for a while. */
  over(): boolean;
  add(n: number): void;
}

export interface PhaseResult {
  rate: number;
  /** Median ping in ms measured while the line was busy, or null when too few samples. */
  loaded: number | null;
}
