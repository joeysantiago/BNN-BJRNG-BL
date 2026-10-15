import { isPlatformBrowser } from '@angular/common';
import { Meter, Phase } from './models/speed-engine.model';
import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';

const BASE = 'https://speed.cloudflare.com';
const PHASE_MS = 10000;
const WARMUP_MS = 1500;
const STREAMS = 6;
const MAX_LOG = Math.log10(1001);

/** Share of the gauge arc (0 to 1) for a speed in Mbps. The scale is logarithmic, 0 to 1 Gbps. */
export const gaugeFraction = (mbps: number): number => Math.min(1, Math.log10(1 + Math.max(0, mbps)) / MAX_LOG);

/**
 * Measures ping, jitter, download and upload against the nearest Cloudflare server.
 * Browser only: methods do nothing during prerendering.
 */
@Injectable({ providedIn: 'root' })
export class SpeedEngine {
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private ctrl: AbortController | null = null;

  readonly phase = signal<Phase>('idle');
  /** Live reading shown on the gauge, in Mbps. */
  readonly gauge = signal(0);
  readonly down = signal<number | null>(null);
  readonly up = signal<number | null>(null);
  readonly ping = signal<number | null>(null);
  readonly jitter = signal<number | null>(null);
  readonly finishedAt = signal<number | null>(null);
  /** True when there is no network, so the "No internet access" screen is shown. */
  readonly offline = signal(false);

  readonly running = computed(() => ['ping', 'down', 'up'].includes(this.phase()));
  /** True once a complete result (all four numbers) is available. */
  readonly hasResult = computed(
    () => this.phase() === 'done' && this.down() !== null && this.up() !== null && this.ping() !== null && this.jitter() !== null,
  );

  // #region Public Methods

  retry(): void {
    if (!this.browser) return;
    if (navigator.onLine === false) {
      this.offline.set(true);
      return;
    }
    this.offline.set(false);
    void this.run();
  }

  /** Start a test, or stop the one that is running. */
  toggle(): void {
    if (this.ctrl) {
      this.ctrl.abort();
      return;
    }
    void this.run();
  }

  /** Start listening for connection changes. Returns a cleanup function. */
  watchConnection(): () => void {
    if (!this.browser) return () => undefined;
    const onOffline = () => {
      this.ctrl?.abort();
      this.offline.set(true);
    };
    const onOnline = () => this.offline.set(false);
    window.addEventListener('offline', onOffline);
    window.addEventListener('online', onOnline);
    // Opened with no connection: show the message straight away.
    if (navigator.onLine === false) this.offline.set(true);
    return () => {
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('online', onOnline);
      this.ctrl?.abort();
    };
  }

  // #endregion

  // #region Private Methods

  private bust(): string {
    return 'r=' + Math.random().toString(36).slice(2);
  }

  private async run(): Promise<void> {
    if (!this.browser) return;
    if (navigator.onLine === false) {
      this.offline.set(true);
      return;
    }
    this.offline.set(false);
    this.ctrl = new AbortController();
    const signal = this.ctrl.signal;
    this.down.set(null);
    this.up.set(null);
    this.ping.set(null);
    this.jitter.set(null);
    this.finishedAt.set(null);
    this.gauge.set(0);

    try {
      this.phase.set('ping');
      const lat = await this.measureLatency(signal);
      this.ping.set(Math.round(lat.ping));
      this.jitter.set(Math.round(lat.jitter * 10) / 10);

      this.phase.set('down');
      const down = await this.measureDownload(signal, (m) => this.gauge.set(m));
      this.down.set(down);

      this.phase.set('up');
      this.gauge.set(0);
      const up = await this.measureUpload(signal, (m) => this.gauge.set(m));
      this.up.set(up);

      this.gauge.set(down);
      this.finishedAt.set(Date.now());
      this.phase.set('done');
    } catch (e) {
      this.gauge.set(0);
      if ((e as Error).name === 'AbortError') {
        this.phase.set('stopped');
      } else {
        this.phase.set('error');
        this.offline.set(true);
      }
    } finally {
      this.ctrl = null;
    }
  }

  private meter(onRate: (mbps: number) => void): Meter {
    const start = performance.now();
    let bytes = 0;
    let warmBytes: number | null = null;
    let warmAt = 0;
    let lastUi = 0;
    const m: Meter = {
      start,
      add: (n) => {
        bytes += n;
        const now = performance.now();
        if (warmBytes === null && now - start >= WARMUP_MS) {
          warmBytes = bytes;
          warmAt = now;
        }
        if (now - lastUi > 120) {
          lastUi = now;
          onRate(m.rate());
        }
      },
      rate: () => {
        const now = performance.now();
        if (warmBytes !== null && now - warmAt > 400) return ((bytes - warmBytes) * 8) / ((now - warmAt) / 1000) / 1e6;
        return (bytes * 8) / (Math.max(now - start, 1) / 1000) / 1e6;
      },
    };
    return m;
  }

  private async measureLatency(signal: AbortSignal): Promise<{ ping: number; jitter: number }> {
    const samples: number[] = [];
    for (let i = 0; i < 12; i++) {
      const t = performance.now();
      const res = await fetch(`${BASE}/__down?bytes=0&${this.bust()}`, { cache: 'no-store', signal });
      await res.arrayBuffer();
      if (i > 0) samples.push(performance.now() - t); // the first request includes connection setup
    }
    const sorted = [...samples].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    let jitter = 0;
    for (let j = 1; j < samples.length; j++) jitter += Math.abs(samples[j] - samples[j - 1]);
    return { ping: median, jitter: jitter / (samples.length - 1) };
  }

  private async measureUpload(signal: AbortSignal, onRate: (mbps: number) => void): Promise<number> {
    const m = this.meter(onRate);
    const end = m.start + PHASE_MS;
    const size = 1024 * 1024;
    const buf = new Uint8Array(size);
    for (let i = 0; i < size; i += 65536) crypto.getRandomValues(buf.subarray(i, i + 65536));
    const blob = new Blob([buf]);
    const stream = async () => {
      while (performance.now() < end) {
        await fetch(`${BASE}/__up?${this.bust()}`, { method: 'POST', body: blob, mode: 'no-cors', signal });
        m.add(size);
      }
    };
    await Promise.all(Array.from({ length: STREAMS }, stream));
    return m.rate();
  }

  private async measureDownload(signal: AbortSignal, onRate: (mbps: number) => void): Promise<number> {
    const m = this.meter(onRate);
    const end = m.start + PHASE_MS;
    const stream = async () => {
      while (performance.now() < end) {
        const res = await fetch(`${BASE}/__down?bytes=50000000&${this.bust()}`, { cache: 'no-store', signal });
        if (!res.ok || !res.body) throw new Error('HTTP ' + res.status);
        const reader = res.body.getReader();
        for (;;) {
          const c = await reader.read();
          if (c.done) break;
          m.add(c.value.length);
          if (performance.now() >= end) {
            void reader.cancel();
            break;
          }
        }
      }
    };
    await Promise.all(Array.from({ length: STREAMS }, stream));
    return m.rate();
  }

  // #endregion
}
