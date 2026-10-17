import { ApiService } from './api.service';
import { isPlatformBrowser } from '@angular/common';
import { Meter, Phase, PhaseResult } from './models/speed-engine.model';
import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';

/** The longest a download or upload phase can run. */
export const PHASE_MS = 10000;
/** A phase may end early once the speed has been steady for three seconds, but never before this. */
const MIN_MS = 6000;
const WARMUP_MS = 1500;
const BIN_MS = 100;
/** One connection fewer than the browser limit of six per host, so the latency probe is not queued behind the data streams. */
const STREAMS = 5;
const UPLOAD_BYTES = 4 * 1024 * 1024;
const CHUNK_MIN = 128 * 1024;
const CHUNK_MAX = UPLOAD_BYTES;
const MAX_LOG = Math.log10(1001);

/** Share of the gauge arc (0 to 1) for a speed in Mbps. The scale is logarithmic, 0 to 1 Gbps. */
export const gaugeFraction = (mbps: number): number => Math.min(1, Math.log10(1 + Math.max(0, mbps)) / MAX_LOG);

const median = (values: number[]): number | null => {
  if (values.length < 3)
    return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
};

/**
 * Measures ping, jitter, download, upload and latency under load against our own speed test server (the API).
 * Browser only: methods do nothing during prerendering.
 */
@Injectable({ providedIn: 'root' })
export class SpeedEngine {
  /** Live reading shown on the gauge, in Mbps. */
  readonly gauge = signal(0);

  /** True when there is no network, so the "No internet access" screen is shown. */
  readonly offline = signal(false);
  private payload: Blob | null = null;
  readonly phase = signal<Phase>('idle');
  private readonly api = inject(ApiService);
  readonly up = signal<number | null>(null);
  private ctrl: AbortController | null = null;
  readonly down = signal<number | null>(null);
  readonly ping = signal<number | null>(null);
  readonly jitter = signal<number | null>(null);
  readonly loadedUp = signal<number | null>(null);
  readonly startedAt = signal<number | null>(null);
  readonly finishedAt = signal<number | null>(null);

  /** Ping in ms while downloading and while uploading. Much higher than idle ping means bufferbloat. */
  readonly loadedDown = signal<number | null>(null);
  readonly phaseStartedAt = signal<number | null>(null);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  readonly running = computed(() => ['ping', 'down', 'up'].includes(this.phase()));

  /** True once a complete result (all four numbers) is available. */
  readonly hasResult = computed(
    () => this.phase() === 'done' && this.down() !== null && this.up() !== null && this.ping() !== null && this.jitter() !== null,
  );

  /** The worse of the two loaded pings. */
  readonly loaded = computed(() => {
    const v = [this.loadedDown(), this.loadedUp()].filter((x): x is number => x !== null);
    return v.length ? Math.max(...v) : null;
  });

  // #region Public Methods

  retry(): void {
    if (!this.browser)
      return;
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
    if (!this.browser)
      return () => undefined;
    const onOffline = () => {
      this.ctrl?.abort();
      this.offline.set(true);
    };
    const onOnline = () => this.offline.set(false);
    window.addEventListener('offline', onOffline);
    window.addEventListener('online', onOnline);
    // Opened with no connection: show the message straight away.
    if (navigator.onLine === false)
      this.offline.set(true);
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

  /** Random bytes, so nothing on the way can compress the upload. Built once. */
  private uploadBody(): Blob {
    if (!this.payload) {
      const buf = new Uint8Array(UPLOAD_BYTES);
      for (let i = 0; i < UPLOAD_BYTES; i += 65536) crypto.getRandomValues(buf.subarray(i, i + 65536));
      this.payload = new Blob([buf]);
    }
    return this.payload;
  }

  /** Address of a speed test endpoint, with a random query value so no cache can answer it. */
  private url(path: string): string {
    return this.api.url(`/speedtest/${path}${path.includes('?') ? '&' : '?'}${this.bust()}`);
  }

  private begin(phase: Phase): void {
    this.phase.set(phase);
    this.phaseStartedAt.set(Date.now());
  }

  private async run(): Promise<void> {
    if (!this.browser)
      return;
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
      const down = await this.measureDownload(signal, (m) => this.follow(m));
      this.down.set(down.rate);
      this.loadedDown.set(down.loaded);

      this.begin('up');
      this.gauge.set(0);
      const up = await this.measureUpload(signal, (m) => this.follow(m));
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

  /** Eases the gauge toward the latest reading so it moves smoothly instead of jumping. */
  private follow(mbps: number): void {
    this.gauge.update((g) => (Math.abs(mbps - g) < 0.05 ? mbps : g + (mbps - g) * 0.4));
  }

  private rounded(v: number | null): number | null {
    return v === null ? null : Math.round(v);
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
      if (i < 30)
        return false;
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
        if (now - start >= PHASE_MS)
          return true;
        if (now - start < MIN_MS)
          return false;
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
        if (rates.length < 10)
          return mbps(sum(0, last), Math.max(last, 1));
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
        const res = await fetch(this.url('ping'), { cache: 'no-store', signal });
        await res.arrayBuffer();
        if (t - m.start >= WARMUP_MS)
          out.push(performance.now() - t);
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
      const res = await fetch(this.url('ping'), { cache: 'no-store', signal });
      await res.arrayBuffer();
      if (i > 0)
        samples.push(performance.now() - t); // the first request includes connection setup
    }
    const sorted = [...samples].sort((a, b) => a - b);
    const mid = sorted[Math.floor(sorted.length / 2)];
    let jitter = 0;
    for (let j = 1; j < samples.length; j++) jitter += Math.abs(samples[j] - samples[j - 1]);
    return { ping: mid, jitter: jitter / (samples.length - 1) };
  }

  /**
   * Upload with fetch in small chunks. A cross-origin XMLHttpRequest with an upload progress listener forces a CORS preflight that
   * the speed server does not answer, so nothing was counted. Each chunk is counted when it completes, and its size follows the
   * current speed so the reading stays smooth on slow and fast links alike.
   */
  private async measureUpload(signal: AbortSignal, onRate: (mbps: number) => void): Promise<PhaseResult> {
    const m = this.meter(onRate);
    const pings: number[] = [];
    const local = new AbortController();
    const abortAll = () => local.abort();
    const watchdog = setInterval(() => {
      onRate(m.rate());
      if (m.over())
        abortAll();
    }, 80);
    signal.addEventListener('abort', abortAll);
    const body = this.uploadBody();

    const stream = async () => {
      let size = CHUNK_MIN;
      while (!m.over() && !signal.aborted) {
        const t = performance.now();
        try {
          const res = await fetch(this.url('upload'), { method: 'POST', body: body.slice(0, size), cache: 'no-store', signal: local.signal });
          await res.arrayBuffer();
          if (!res.ok)
            throw new Error('HTTP ' + res.status);
        } catch (e) {
          if (local.signal.aborted)
            return;
          throw e;
        }
        m.add(size);
        // Aim for about a quarter of a second per chunk.
        const bytesPerSecond = size / Math.max((performance.now() - t) / 1000, 0.01);
        size = Math.min(CHUNK_MAX, Math.max(CHUNK_MIN, Math.round(bytesPerSecond / 4)));
      }
    };

    try {
      await Promise.all([...Array.from({ length: STREAMS }, stream), this.probe(signal, m, pings)]);
    } finally {
      clearInterval(watchdog);
      signal.removeEventListener('abort', abortAll);
      abortAll();
    }
    if (signal.aborted)
      throw new DOMException('Aborted', 'AbortError');
    return { rate: m.final(), loaded: this.rounded(median(pings)) };
  }

  private async measureDownload(signal: AbortSignal, onRate: (mbps: number) => void): Promise<PhaseResult> {
    const m = this.meter(onRate);
    const pings: number[] = [];
    const stream = async () => {
      while (!m.over()) {
        const res = await fetch(this.url('download?bytes=50000000'), { cache: 'no-store', signal });
        if (!res.ok || !res.body)
          throw new Error('HTTP ' + res.status);
        const reader = res.body.getReader();
        for (;;) {
          const c = await reader.read();
          if (c.done)
            break;
          m.add(c.value.length);
          if (m.over()) {
            void reader.cancel();
            break;
          }
        }
      }
    };
    // Refresh the gauge on a timer, so it moves from the first moment and not only when data arrives.
    const ui = setInterval(() => onRate(m.rate()), 80);
    try {
      await Promise.all([...Array.from({ length: STREAMS }, stream), this.probe(signal, m, pings)]);
    } finally {
      clearInterval(ui);
    }
    return { rate: m.final(), loaded: this.rounded(median(pings)) };
  }

  // #endregion
}
