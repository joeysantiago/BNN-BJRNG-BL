export interface SpeedResult {
  id: string;
  /** Epoch milliseconds. */
  at: number;
  up: number;
  down: number;
  ping: number;
  jitter: number;
}
