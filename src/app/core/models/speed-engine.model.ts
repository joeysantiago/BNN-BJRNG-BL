export type Phase = 'idle' | 'ping' | 'down' | 'up' | 'done' | 'stopped' | 'error';

export interface Meter {
  start: number;
  add(n: number): void;
  rate(): number;
}
