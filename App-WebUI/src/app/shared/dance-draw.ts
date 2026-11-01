import { DanceState, DanceVariant, Joints, Pt } from './dance-doodle.model';

export const W = 800;
export const H = 340;
export const BARS = 48;
const GROUND = 296;
const TAU = Math.PI * 2;

type Ctx = CanvasRenderingContext2D;
type Hat = 'none' | 'cap' | 'spikes';

const rnd = (n: number): number => {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
};
const wob = (s: DanceState, i: number): number => (rnd(s.frame * 13 + i * 7.3) - 0.5) * 2.4;
const dir = (a: number, len: number, o: Pt): Pt => [o[0] + Math.sin(a) * len, o[1] + Math.cos(a) * len];
const ellipse = (cx: number, cy: number, rx: number, ry: number, n = 22, rot = 0): Pt[] =>
  Array.from({ length: n + 1 }, (_, i) => {
    const a = (i / n) * TAU;
    const x = Math.cos(a) * rx;
    const y = Math.sin(a) * ry;
    return [cx + x * Math.cos(rot) - y * Math.sin(rot), cy + x * Math.sin(rot) + y * Math.cos(rot)] as Pt;
  });

/** A hand-drawn line: every stroke is drawn twice with a small, changing wobble. */
function sketch(c: Ctx, s: DanceState, pts: Pt[], seed: number, color: string, width: number): void {
  c.strokeStyle = color;
  c.lineWidth = width;
  c.lineCap = 'round';
  c.lineJoin = 'round';
  for (let pass = 0; pass < 2; pass++) {
    c.globalAlpha = pass ? 0.5 : 1;
    c.beginPath();
    pts.forEach(([x, y], i) => {
      const px = x + wob(s, seed + i + pass * 31);
      const py = y + wob(s, seed + i + 50 + pass * 31);
      if (i) {
        c.lineTo(px, py);
      } else {
        c.moveTo(px, py);
      }
    });
    c.stroke();
  }
  c.globalAlpha = 1;
}

function dot(c: Ctx, p: Pt, r: number, color: string): void {
  c.fillStyle = color;
  c.beginPath();
  c.arc(p[0], p[1], r, 0, TAU);
  c.fill();
}

/** Where every joint of a dancing figure is right now. */
function pose(s: DanceState, cx: number, k: number, phase: number): Joints {
  const p = s.ph + phase;
  const e = s.e;
  const L = (n: number) => n * k;
  const hop = Math.abs(Math.sin(p)) * L(6 + 22 * e) + s.beat * L(8);
  const lean = Math.sin(p * 0.5) * (0.1 + 0.3 * e);
  const hip: Pt = [cx + Math.sin(p * 0.5) * L(14 * e), GROUND - L(72) - hop];
  const neck = dir(Math.PI - lean, L(80), hip);
  const aL = -(0.5 + (1.3 + e) * (0.5 + 0.5 * Math.sin(p)));
  const aR = 0.5 + (1.3 + e) * (0.5 + 0.5 * Math.sin(p + Math.PI));
  const tL = -(0.16 + (0.1 + 0.35 * e) * (0.5 + 0.5 * Math.sin(p)));
  const tR = 0.16 + (0.1 + 0.35 * e) * (0.5 + 0.5 * Math.sin(p + Math.PI));
  const lElbow = dir(aL, L(38), neck);
  const rElbow = dir(aR, L(38), neck);
  const lKnee = dir(tL, L(36), hip);
  const rKnee = dir(tR, L(36), hip);
  return {
    hip,
    neck,
    lean,
    k,
    head: dir(Math.PI - lean * 1.3, L(26), neck),
    lElbow,
    rElbow,
    lHand: dir(aL - 0.6 - 0.5 * Math.sin(p * 2), L(36), lElbow),
    rHand: dir(aR + 0.6 + 0.5 * Math.sin(p * 2 + 1), L(36), rElbow),
    lKnee,
    rKnee,
    lFoot: dir(tL * 0.4, L(36), lKnee),
    rFoot: dir(tR * 0.4, L(36), rKnee),
  };
}

function face(c: Ctx, s: DanceState, h: Pt, r: number, ink: string): void {
  const open = Math.min(1, s.high * 1.6 + s.beat * 0.6);
  dot(c, [h[0] - r * 0.38, h[1] - r * 0.15], 2.6, ink);
  dot(c, [h[0] + r * 0.38, h[1] - r * 0.15], 2.6, ink);
  c.fillStyle = ink;
  c.strokeStyle = ink;
  c.lineWidth = 2.4;
  c.beginPath();
  if (open > 0.25) {
    c.ellipse(h[0], h[1] + r * 0.4, r * 0.3, 2 + open * r * 0.3, 0, 0, TAU);
  } else {
    c.arc(h[0], h[1] + r * 0.2, r * 0.32, 0.15 * Math.PI, 0.85 * Math.PI);
  }
  open > 0.25 ? c.fill() : c.stroke();
}

function hatFor(c: Ctx, s: DanceState, h: Pt, r: number, hat: Hat, color: string, seed: number): void {
  if (hat === 'cap') {
    sketch(c, s, ellipse(h[0], h[1] - r * 0.15, r * 1.05, r * 0.85, 14).filter((p) => p[1] <= h[1] - r * 0.15), seed, color, 5);
    sketch(c, s, [[h[0] - r * 0.2, h[1] - r * 0.3], [h[0] + r * 1.5, h[1] - r * 0.1]], seed + 9, color, 5);
  }
  if (hat === 'spikes')
    for (let i = -2; i <= 2; i++) sketch(c, s, [[h[0] + i * r * 0.4, h[1] - r * 0.95], [h[0] + i * r * 0.62, h[1] - r * (1.6 + 0.4 * s.e + s.beat * 0.4)]], seed + i * 3, color, 4);
}

function stick(c: Ctx, s: DanceState, j: Joints, color: string, accent: string, hat: Hat, seed: number): void {
  const r = 22 * j.k;
  const w = 7 * j.k;
  sketch(c, s, [j.hip, j.lKnee, j.lFoot], seed, color, w);
  sketch(c, s, [j.hip, j.rKnee, j.rFoot], seed + 5, color, w);
  sketch(c, s, [j.neck, j.hip], seed + 10, color, w);
  sketch(c, s, [j.neck, j.lElbow, j.lHand], seed + 15, color, w);
  sketch(c, s, [j.neck, j.rElbow, j.rHand], seed + 20, color, w);
  dot(c, j.lHand, 5 * j.k, accent);
  dot(c, j.rHand, 5 * j.k, accent);
  sketch(c, s, ellipse(j.head[0], j.head[1], r, r, 16), seed + 25, color, w * 0.8);
  face(c, s, j.head, r, color);
  hatFor(c, s, j.head, r, hat, accent, seed + 40);
}

function robot(c: Ctx, s: DanceState, j: Joints, pal: DanceState['pal']): void {
  const k = j.k;
  c.lineCap = 'round';
  c.lineJoin = 'round';
  c.lineWidth = 10 * k;
  c.strokeStyle = pal.ink;
  for (const path of [[j.hip, j.lKnee, j.lFoot], [j.hip, j.rKnee, j.rFoot], [j.neck, j.lElbow, j.lHand], [j.neck, j.rElbow, j.rHand]]) {
    c.beginPath();
    path.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
    c.stroke();
  }
  for (const p of [j.lKnee, j.rKnee, j.lElbow, j.rElbow]) dot(c, p, 6 * k, pal.a);
  for (const p of [j.lFoot, j.rFoot]) {
    c.fillStyle = pal.ink;
    c.fillRect(p[0] - 14 * k, p[1] - 3 * k, 28 * k, 8 * k);
  }
  // Torso, with a tiny equalizer on the chest.
  c.save();
  c.translate(j.hip[0], j.hip[1]);
  c.rotate(j.lean);
  c.fillStyle = pal.muted;
  c.globalAlpha = 0.35;
  c.beginPath();
  c.roundRect(-24 * k, -86 * k, 48 * k, 90 * k, 8 * k);
  c.fill();
  c.globalAlpha = 1;
  c.lineWidth = 5 * k;
  c.stroke();
  for (let i = 0; i < 4; i++) {
    c.fillStyle = i % 2 ? pal.b : pal.a;
    const h = (6 + (s.bars[i * 6 + 2] ?? 0) * 46) * k;
    c.fillRect((-17 + i * 10) * k, -10 * k - h, 7 * k, h);
  }
  c.restore();
  // Head, eyes and antenna.
  const [hx, hy] = j.head;
  c.fillStyle = pal.muted;
  c.globalAlpha = 0.35;
  c.beginPath();
  c.roundRect(hx - 28 * k, hy - 22 * k, 56 * k, 44 * k, 10 * k);
  c.fill();
  c.globalAlpha = 1;
  c.lineWidth = 5 * k;
  c.stroke();
  c.fillStyle = pal.a;
  const eye = (3 + s.beat * 5) * k;
  c.fillRect(hx - 17 * k, hy - 8 * k, 12 * k, eye);
  c.fillRect(hx + 5 * k, hy - 8 * k, 12 * k, eye);
  c.fillStyle = pal.ink;
  c.fillRect(hx - 14 * k, hy + 8 * k, 28 * k, (2 + s.high * 9) * k);
  c.lineWidth = 4 * k;
  c.beginPath();
  c.moveTo(hx, hy - 22 * k);
  c.lineTo(hx + Math.sin(s.ph) * 6 * k, hy - 40 * k);
  c.stroke();
  dot(c, [hx + Math.sin(s.ph) * 6 * k, hy - 42 * k], (5 + s.beat * 5) * k, pal.b);
}

function cat(c: Ctx, s: DanceState, cx: number): void {
  const { ink, a, b } = s.pal;
  const p = s.ph;
  const hop = Math.abs(Math.sin(p)) * (8 + 28 * s.e) + s.beat * 8;
  const by = GROUND - 56 - hop;
  const hy = by - 72 + Math.sin(p * 2) * 4 * s.e;
  const hx = cx + Math.sin(p * 0.5) * 10 * s.e;
  // Tail
  const tipX = cx + 130 + Math.sin(p * 0.9) * (14 + 30 * s.e);
  const tipY = by - 50 + Math.cos(p * 0.9) * (10 + 26 * s.e);
  const tail: Pt[] = Array.from({ length: 13 }, (_, i) => {
    const u = i / 12;
    const x = (1 - u) ** 2 * (cx + 50) + 2 * (1 - u) * u * (cx + 130) + u * u * tipX;
    const y = (1 - u) ** 2 * (by + 20) + 2 * (1 - u) * u * (by + 40) + u * u * tipY;
    return [x, y];
  });
  sketch(c, s, tail, 1, b, 9);
  // Legs and arms
  sketch(c, s, [[cx - 28, by + 40], [cx - 30, GROUND - hop * 0.2]], 20, ink, 8);
  sketch(c, s, [[cx + 28, by + 40], [cx + 30, GROUND - hop * 0.2]], 25, ink, 8);
  const lA = -(0.5 + (1.3 + s.e) * (0.5 + 0.5 * Math.sin(p)));
  const rA = 0.5 + (1.3 + s.e) * (0.5 + 0.5 * Math.sin(p + Math.PI));
  sketch(c, s, [[cx - 44, by - 6], dir(lA, 46, [cx - 44, by - 6])], 30, ink, 8);
  sketch(c, s, [[cx + 44, by - 6], dir(rA, 46, [cx + 44, by - 6])], 35, ink, 8);
  // Body and head
  c.fillStyle = a;
  c.globalAlpha = 0.22;
  c.beginPath();
  ellipse(cx, by, 58, 52).forEach((q, i) => (i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1])));
  c.fill();
  ellipse(hx, hy, 40, 36).forEach((q, i) => (i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1])));
  c.fill();
  c.globalAlpha = 1;
  sketch(c, s, ellipse(cx, by, 58, 52), 40, ink, 6);
  sketch(c, s, ellipse(hx, hy, 40, 36), 70, ink, 6);
  sketch(c, s, [[hx - 34, hy - 18], [hx - 26, hy - 56], [hx - 8, hy - 32]], 100, ink, 6);
  sketch(c, s, [[hx + 34, hy - 18], [hx + 26, hy - 56], [hx + 8, hy - 32]], 110, ink, 6);
  // Face
  if (s.beat > 0.3) {
    for (const sx of [-1, 1]) {
      c.strokeStyle = ink;
      c.lineWidth = 3;
      c.beginPath();
      c.arc(hx + sx * 15, hy - 4, 7, Math.PI * 1.1, Math.PI * 1.9);
      c.stroke();
    }
  } else {
    dot(c, [hx - 15, hy - 5], 3.4, ink);
    dot(c, [hx + 15, hy - 5], 3.4, ink);
  }
  dot(c, [hx, hy + 5], 3.2, b);
  c.strokeStyle = ink;
  c.lineWidth = 2.6;
  c.beginPath();
  c.arc(hx - 6, hy + 11, 6, 0.1 * Math.PI, 0.9 * Math.PI);
  c.arc(hx + 6, hy + 11, 6, 0.1 * Math.PI, 0.9 * Math.PI);
  c.stroke();
  for (const sx of [-1, 1])
    for (let i = -1; i <= 1; i++) sketch(c, s, [[hx + sx * 24, hy + 8 + i * 5], [hx + sx * (50 + s.mid * 8), hy + 4 + i * 11 + Math.sin(p * 2) * 3]], 120 + i + sx * 7, ink, 2.4);
}

function blob(c: Ctx, s: DanceState, cx: number): void {
  const { ink, a, b } = s.pal;
  const p = s.ph;
  const sq = 1 + 0.16 * Math.sin(p * 2) * (0.3 + s.e) + s.beat * 0.12;
  const rx = 74 * sq;
  const ry = 74 / sq;
  const hop = Math.abs(Math.sin(p)) * (6 + 30 * s.e);
  const cy = GROUND - ry - 8 - hop;
  const edge: Pt[] = Array.from({ length: 41 }, (_, i) => {
    const ang = (i / 40) * TAU;
    const r = 1 + 0.05 * Math.sin(ang * 3 + p * 2) * (0.4 + s.e);
    return [cx + Math.cos(ang) * rx * r, cy + Math.sin(ang) * ry * r];
  });
  // Arms and feet
  for (const sx of [-1, 1]) {
    const w = Math.sin(p + (sx > 0 ? Math.PI : 0));
    sketch(c, s, [[cx + sx * rx * 0.9, cy], [cx + sx * (rx + 34), cy - 18 - w * (20 + 44 * s.e)], [cx + sx * (rx + 54), cy - 40 - w * (30 + 60 * s.e)]], 5 + sx, ink, 7);
    sketch(c, s, [[cx + sx * 26, cy + ry * 0.9], [cx + sx * 30, GROUND - hop * 0.15]], 15 + sx, ink, 8);
  }
  c.fillStyle = a;
  c.globalAlpha = 0.3;
  c.beginPath();
  edge.forEach((q, i) => (i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1])));
  c.fill();
  c.globalAlpha = 1;
  sketch(c, s, edge, 30, ink, 6);
  // Face: big eyes that look side to side, mouth opens with the music.
  const look = Math.sin(p * 0.5) * 5;
  for (const sx of [-1, 1]) {
    dot(c, [cx + sx * 24, cy - 14], 13, '#ffffff');
    c.strokeStyle = ink;
    c.lineWidth = 3;
    c.beginPath();
    c.arc(cx + sx * 24, cy - 14, 13, 0, TAU);
    c.stroke();
    dot(c, [cx + sx * 24 + look, cy - 12], 6, '#1c1226');
  }
  c.fillStyle = b;
  c.strokeStyle = ink;
  c.beginPath();
  c.ellipse(cx, cy + 24, 16 + s.mid * 10, 4 + (s.high * 0.8 + s.beat * 0.6) * 24, 0, 0, TAU);
  c.fill();
  c.stroke();
}

/** Tall bars behind the dancers: the lines that go up and down with the music. */
function bars(c: Ctx, s: DanceState, base: number, max: number, alpha: number): void {
  const bw = W / s.bars.length;
  c.lineCap = 'round';
  c.lineWidth = bw * 0.5;
  s.bars.forEach((v, i) => {
    c.globalAlpha = alpha;
    c.strokeStyle = i % 2 ? s.pal.b : s.pal.a;
    c.beginPath();
    c.moveTo(bw * (i + 0.5), base);
    c.lineTo(bw * (i + 0.5), base - 6 - v * max);
    c.stroke();
  });
  c.globalAlpha = 1;
}

function lines(c: Ctx, s: DanceState): void {
  const bw = W / s.bars.length;
  c.lineCap = 'round';
  c.lineWidth = bw * 0.55;
  s.bars.forEach((v, i) => {
    const h = 8 + v * 150;
    c.strokeStyle = i % 2 ? s.pal.b : s.pal.a;
    c.beginPath();
    c.moveTo(bw * (i + 0.5), H / 2 - h);
    c.lineTo(bw * (i + 0.5), H / 2 + h);
    c.stroke();
  });
  [[s.pal.ink, 0, 4], [s.pal.a, 1.7, 3]].forEach(([color, off, width]) => {
    c.strokeStyle = color as string;
    c.lineWidth = width as number;
    c.beginPath();
    for (let x = 0; x <= W; x += 8) {
      const y = H / 2 + Math.sin(x * 0.02 + s.ph * 2 + (off as number)) * (10 + s.e * 80) * Math.sin(x * 0.005 + s.ph * 0.4);
      if (x) {
        c.lineTo(x, y);
      } else {
        c.moveTo(x, y);
      }
    }
    c.stroke();
  });
}

export function drawDance(c: Ctx, variant: DanceVariant, s: DanceState): void {
  const { ink, a, b } = s.pal;
  if (variant === 'lines')
    return lines(c, s);
  bars(c, s, H - 6, 170, 0.28);
  if (variant === 'stick')
    stick(c, s, pose(s, W / 2, 1, 0), ink, a, 'none', 1);
  if (variant === 'robot')
    robot(c, s, pose(s, W / 2, 1, 0), s.pal);
  if (variant === 'cat')
    cat(c, s, W / 2 - 40);
  if (variant === 'blob')
    blob(c, s, W / 2);
  if (variant === 'trio') {
    stick(c, s, pose(s, W * 0.22, 0.9, 0), ink, a, 'cap', 1);
    stick(c, s, pose(s, W * 0.5, 1.05, 1.6), a, b, 'none', 200);
    stick(c, s, pose(s, W * 0.78, 0.9, 3.2), b, a, 'spikes', 400);
  }
}
