export type Phase = 'idle' | 'ping' | 'down' | 'up' | 'done' | 'stopped' | 'error';

export interface Meter {
  start: number;
  add(n: number): void;
  /** Live speed in Mbps over the last second. */
  rate(): number;
  /** True when the phase should end: time is up, or the speed has been steady for a while. */
  over(): boolean;
  /** Final speed in Mbps: the sustained speed after warm-up, ignoring stalls and bursts. */
  final(): number;
}

export interface PhaseResult {
  rate: number;
  /** Median ping in ms measured while the line was busy, or null when too few samples. */
  loaded: number | null;
}
