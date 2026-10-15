import { isPlatformBrowser } from '@angular/common';
import { Meter, Phase, PhaseResult } from './models/speed-engine.model';
import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';

const BASE = 'https://speed.cloudflare.com';
/** The longest a download or upload phase can run. */
export const PHASE_MS = 10000;
/** A phase may end early once the speed has been steady for three seconds, but never before this. */
const MIN_MS = 6000;
const WARMUP_MS = 1500;
const BIN_MS = 100;
/** One connection fewer than the browser limit of six per host, so the latency probe is not queued behind the data streams. */
const STREAMS = 5;
const UPLOAD_BYTES = 8 * 1024 * 1024;
const MAX_LOG = Math.log10(1001);

/** Share of the gauge arc (0 to 1) for a speed in Mbps. The scale is logarithmic, 0 to 1 Gbps. */
export const gaugeFraction = (mbps: number): number => Math.min(1, Math.log10(1 + Math.max(0, mbps)) / MAX_LOG);

const median = (values: number[]): number | null => {
  if (values.length < 3) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
};

/**
 * Measures ping, jitter, download, upload and latency under load against the nearest Cloudflare server.
 * Browser only: methods do nothing during prerendering.
 */
@Injectable({ providedIn: 'root' })
export class SpeedEngine {
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private ctrl: AbortController | null = null;
  private payload: Blob | null = null;

  readonly phase = signal<Phase>('idle');
  /** Live reading shown on the gauge, in Mbps. */
  readonly gauge = signal(0);
  readonly down = signal<number | null>(null);
  readonly up = signal<number | null>(null);
  readonly ping = signal<number | null>(null);
  readonly jitter = signal<number | null>(null);
  /** Ping in ms while downloading and while uploading. Much higher than idle ping means bufferbloat. */
  readonly loadedDown = signal<number | null>(null);
  readonly loadedUp = signal<number | null>(null);
  readonly startedAt = signal<number | null>(null);
  readonly phaseStartedAt = signal<number | null>(null);
  readonly finishedAt = signal<number | null>(null);
  /** True when there is no network, so the "No internet access" screen is shown. */
  readonly offline = signal(false);

  readonly running = computed(() => ['ping', 'down', 'up'].includes(this.phase()));
  /** The worse of the two loaded pings. */
  readonly loaded = computed(() => {
    const v = [this.loadedDown(), this.loadedUp()].filter((x): x is number => x !== null);
    return v.length ? Math.max(...v) : null;
  });
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
    for (const s of [this.down, this.up, this.ping, this.jitter, this.loadedDown, this.loadedUp, this.finishedAt]) s.set(null);
    this.gauge.set(0);
    this.startedAt.set(Date.now());

    try {
      this.begin('ping');
      const lat = await this.measureLatency(signal);
      this.ping.set(Math.round(lat.ping));
      this.jitter.set(Math.round(lat.jitter * 10) / 10);

      this.begin('down');
      const down = await this.measureDownload(signal, (m) => this.gauge.set(m));
      this.down.set(down.rate);
      this.loadedDown.set(down.loaded);

      this.begin('up');
      this.gauge.set(0);
      const up = await this.measureUpload(signal, (m) => this.gauge.set(m));
      this.up.set(up.rate);
      this.loadedUp.set(up.loaded);

      this.gauge.set(down.rate);
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

  private begin(phase: Phase): void {
    this.phase.set(phase);
    this.phaseStartedAt.set(Date.now());
  }

  /**
   * Counts bytes in 100 ms bins. The live gauge reads the last second. The final number is the mean of the bins after
   * warm-up with the slowest and fastest tenth removed, so TCP slow start, stalls and socket-buffer bursts do not skew it.
   */
  private meter(onRate: (mbps: number) => void): Meter {
    const start = performance.now();
    const bins: number[] = [];
    const warm = WARMUP_MS / BIN_MS;
    let lastUi = 0;
    let lastCheck = 0;
    let steady = false;

    const index = (now: number) => Math.floor((now - start) / BIN_MS);
    const mbps = (bytes: number, count: number) => (bytes * 8) / ((count * BIN_MS) / 1000) / 1e6;
    const sum = (from: number, to: number) => {
      let total = 0;
      for (let k = from; k < to; k++) total += bins[k] ?? 0;
      return total;
    };
    /** Speed in each of the last three whole seconds. Steady when they differ by under 6%. */
    const isSteady = (i: number) => {
      if (i < 30) return false;
      const w = [sum(i - 30, i - 20), sum(i - 20, i - 10), sum(i - 10, i)].map((b) => mbps(b, 10));
      const mean = (w[0] + w[1] + w[2]) / 3;
      return mean > 0 && Math.min(...w) > 0 && (Math.max(...w) - Math.min(...w)) / mean < 0.06;
    };

    const m: Meter = {
      start,
      add: (n) => {
        const now = performance.now();
        const i = index(now);
        bins[i] = (bins[i] ?? 0) + n;
        if (now - lastUi > 120) {
          lastUi = now;
          onRate(m.rate());
        }
      },
      rate: () => {
        const i = index(performance.now());
        const from = Math.max(0, i - 10);
        return i > from ? mbps(sum(from, i), i - from) : 0;
      },
      over: () => {
        const now = performance.now();
        if (now - start >= PHASE_MS) return true;
        if (now - start < MIN_MS) return false;
        if (now - lastCheck > 500) {
          lastCheck = now;
          steady = isSteady(index(now));
        }
        return steady;
      },
      final: () => {
        const last = index(performance.now());
        const rates: number[] = [];
        for (let k = warm; k < last; k++) rates.push(mbps(bins[k] ?? 0, 1));
        if (rates.length < 10) return mbps(sum(0, last), Math.max(last, 1));
        rates.sort((a, b) => a - b);
        const cut = Math.floor(rates.length * 0.1);
        const kept = rates.slice(cut, rates.length - cut);
        return kept.reduce((a, b) => a + b, 0) / kept.length;
      },
    };
    return m;
  }

  /** Pings every 200 ms while the line is busy. Samples taken during warm-up are dropped. */
  private async probe(signal: AbortSignal, m: Meter, out: number[]): Promise<void> {
    while (!m.over() && !signal.aborted) {
      const t = performance.now();
      try {
        const res = await fetch(`${BASE}/__down?bytes=0&${this.bust()}`, { cache: 'no-store', signal });
        await res.arrayBuffer();
        if (t - m.start >= WARMUP_MS) out.push(performance.now() - t);
      } catch {
        /* a failed ping must not fail the test */
      }
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
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
    const mid = sorted[Math.floor(sorted.length / 2)];
    let jitter = 0;
    for (let j = 1; j < samples.length; j++) jitter += Math.abs(samples[j] - samples[j - 1]);
    return { ping: mid, jitter: jitter / (samples.length - 1) };
  }

  private async measureDownload(signal: AbortSignal, onRate: (mbps: number) => void): Promise<PhaseResult> {
    const m = this.meter(onRate);
    const pings: number[] = [];
    const stream = async () => {
      while (!m.over()) {
        const res = await fetch(`${BASE}/__down?bytes=50000000&${this.bust()}`, { cache: 'no-store', signal });
        if (!res.ok || !res.body) throw new Error('HTTP ' + res.status);
        const reader = res.body.getReader();
        for (;;) {
          const c = await reader.read();
          if (c.done) break;
          m.add(c.value.length);
          if (m.over()) {
            void reader.cancel();
            break;
          }
        }
      }
    };
    await Promise.all([...Array.from({ length: STREAMS }, stream), this.probe(signal, m, pings)]);
    return { rate: m.final(), loaded: this.rounded(median(pings)) };
  }

  /**
   * Upload with XMLHttpRequest, because only it reports progress while a request is still being sent. fetch can only count a
   * request once it has finished, which makes the reading jump and under-reports fast links.
   */
  private async measureUpload(signal: AbortSignal, onRate: (mbps: number) => void): Promise<PhaseResult> {
    const m = this.meter(onRate);
    const pings: number[] = [];
    const live = new Set<XMLHttpRequest>();
    const abortAll = () => live.forEach((x) => x.abort());
    const watchdog = setInterval(() => m.over() && abortAll(), 100);
    signal.addEventListener('abort', abortAll);
    const body = this.uploadBody();

    const send = () =>
      new Promise<void>((resolve, reject) => {
        const x = new XMLHttpRequest();
        let sent = 0;
        live.add(x);
        x.open('POST', `${BASE}/__up?${this.bust()}`);
        x.upload.onprogress = (e) => {
          m.add(e.loaded - sent);
          sent = e.loaded;
        };
        x.onload = () => {
          live.delete(x);
          resolve();
        };
        x.onabort = () => {
          live.delete(x);
          resolve();
        };
        x.onerror = () => {
          live.delete(x);
          reject(new Error('Upload failed'));
        };
        x.send(body);
      });
    const stream = async () => {
      while (!m.over() && !signal.aborted) await send();
    };

    try {
      await Promise.all([...Array.from({ length: STREAMS }, stream), this.probe(signal, m, pings)]);
    } finally {
      clearInterval(watchdog);
      signal.removeEventListener('abort', abortAll);
      abortAll();
    }
    if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
    return { rate: m.final(), loaded: this.rounded(median(pings)) };
  }

  /** Random bytes, so nothing on the way can compress the upload. Built once. */
  private uploadBody(): Blob {
    if (!this.payload) {
      const buf = new Uint8Array(UPLOAD_BYTES);
      for (let i = 0; i < UPLOAD_BYTES; i += 65536) crypto.getRandomValues(buf.subarray(i, i + 65536));
      this.payload = new Blob([buf]);
    }
    return this.payload;
  }

  private rounded(v: number | null): number | null {
    return v === null ? null : Math.round(v);
  }

  // #endregion
}
