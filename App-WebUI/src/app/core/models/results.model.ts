export interface SpeedResult {
  id: string;
  /** Epoch milliseconds. */
  at: number;
  down: number;
  up: number;
  ping: number;
  jitter: number;
}
