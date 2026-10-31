/* Speed test page. Moved from thakurg.html as it was; see App-Prototype/README.md for the page layout. */
'use strict';

// #region Speed test (simulated engine: same gauge, phases and texts as the real page, numbers are made up)

const ARC_START = 150;
const ARC_SWEEP = 240;
const SEGMENTS = 54;
const gaugeFraction = (mbps, stops) => {
  const v = Math.min(stops[stops.length - 1], Math.max(0, mbps));
  const next = stops.findIndex((s) => s > v);
  const i = next < 0 ? stops.length - 2 : next - 1;
  return (i + (v - stops[i]) / (stops[i + 1] - stops[i])) / (stops.length - 1);
};
const tickLabel = (mbps) => (mbps >= 1000 ? `${mbps / 1000}G` : String(mbps));
const gaugeAngle = (frac) => ARC_START + ARC_SWEEP * frac;
const polar = (r, deg) => [+(120 + r * Math.cos((deg * Math.PI) / 180)).toFixed(1), +(120 + r * Math.sin((deg * Math.PI) / 180)).toFixed(1)];
const litCount = (frac) => (frac > 0.002 ? Math.round(frac * (SEGMENTS - 1)) + 1 : 0);
const segClass = (i, lit) => (i < lit ? (i === lit - 1 ? 'on head' : 'on') : '');
let gaugePeak = 0;

const E = { phase: 'idle', gauge: 0, ping: null, jitter: null, down: null, up: null, loaded: null, startedAt: 0, finishedAt: 0, timer: null, progress: 0 };
const ST = { saved: false, shareOpen: false, copied: false, resultUrl: null };
let history_ = [];
try {
  history_ = JSON.parse(store.get('history') || '[]');
} catch {
  history_ = [];
}

const running = () => ['ping', 'down', 'up'].includes(E.phase);
const hasResult = () => E.phase === 'done';

function speedStatus() {
  switch (E.phase) {
    case 'ping':
      return t('st.ping_phase');
    case 'down':
      return t('st.down_phase');
    case 'up':
      return t('st.up_phase');
    case 'done':
      return t('st.complete', { time: timeText(E.finishedAt) });
    case 'stopped':
      return t('st.stopped');
    default:
      return t('st.ready');
  }
}

function gaugeUnit() {
  const scale = E.gauge >= 1000 ? 'gbps' : 'mbps';
  if (E.phase === 'down' || E.phase === 'done')
    return t(`unit.${scale}_down`);
  if (E.phase === 'up')
    return t(`unit.${scale}_up`);
  return t(`unit.${scale}`);
}

function loadedHint() {
  if (E.loaded === null || E.ping === null)
    return null;
  const extra = E.loaded - E.ping;
  return extra < 30 ? 'loaded.good' : extra < 100 ? 'loaded.fair' : 'loaded.bad';
}

function cell(key, phaseOn, value, unitHtml) {
  return `<div class="cell inset${E.phase === phaseOn ? ' on' : ''}${value !== null ? ' done' : ''}"><dt>${t(key)}</dt><dd>${value !== null ? `${value}<small>${unitHtml}</small>` : '–'}</dd></div>`;
}

function segmentsHtml(lit) {
  return Array.from({ length: SEGMENTS }, (_, i) => {
    const deg = gaugeAngle(i / (SEGMENTS - 1));
    const [x1, y1] = polar(84, deg);
    const [x2, y2] = polar(100, deg);
    return `<line class="${segClass(i, lit)}" style="--k: ${(i / (SEGMENTS - 1)).toFixed(3)}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" />`;
  }).join('');
}

function labelsHtml(stops, frac) {
  return stops.map((m, i) => {
    const f = i / (stops.length - 1);
    const [x, y] = polar(117, gaugeAngle(f));
    return `<text class="g-label${frac * 100 > 0.2 && f <= frac + 0.0001 ? ' on' : ''}" data-f="${f.toFixed(4)}" x="${x}" y="${y}" text-anchor="middle" dominant-baseline="central">${tickLabel(m)}</text>`;
  }).join('');
}

function dialHtml() {
  const stops = S.settings.speed.gaugeStops;
  const frac = gaugeFraction(E.gauge, stops);
  gaugePeak = E.gauge;
  return `<div class="dial${running() ? ' live' : ''}">
      <svg viewBox="-18 -18 276 218" role="img" aria-label="${speedStatus()}">
        <circle class="g-inner" cx="120" cy="120" r="72" />
        <g id="g-seg" class="g-seg" aria-hidden="true">${segmentsHtml(litCount(frac))}</g>
        <g aria-hidden="true">${labelsHtml(stops, frac)}</g>
        <g id="g-peak" class="g-peak" transform="rotate(${gaugeAngle(frac).toFixed(2)} 120 120)" style="opacity: ${frac * 100 > 0.2 ? 1 : 0}" aria-hidden="true"><path d="M223 120 L230 116 L230 124 Z" /></g>
      </svg>
      <div class="read" aria-hidden="true"><span class="val" id="g-val">${fmtSpeed(E.gauge)}</span><span class="unit" id="g-unit">${gaugeUnit()}</span></div>
    </div>`;
}

function shareText() {
  return traw('share.text', { down: `${fmtSpeed(E.down)} ${traw(speedUnitKey(E.down))}`, up: `${fmtSpeed(E.up)} ${traw(speedUnitKey(E.up))}`, ping: E.ping }) + ' https://thakurg.com/';
}

function heroHtml() {
  const ICON = {
    clock: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    timer: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 2h4M12 14l3-3"/><circle cx="12" cy="14" r="8"/></svg>',
    share: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/></svg>',
    save: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M17 21v-8H7v8M7 3v5h8"/></svg>',
    image: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>',
  };
  const hint = on('speed.loaded') ? loadedHint() : null;
  const label = running() ? t('st.stop') : E.phase === 'idle' ? t('st.start') : t('st.again');
  let actions = '';
  if (hasResult()) {
    actions = `<div class="actions">
        ${on('speed.share') ? `<button type="button" class="btn" aria-haspopup="true" aria-expanded="${ST.shareOpen}" data-act="stShare">${ICON.share}${t('act.share')}</button>` : ''}
        ${on('speed.save') ? `<button type="button" class="btn"${ST.saved ? ' disabled' : ''} data-act="stSave">${ICON.save}${ST.saved ? t('act.saved') : t('act.save')}</button>` : ''}
        ${on('speed.image') ? `<button type="button" class="btn" data-act="stImage">${ICON.image}${t('act.image')}</button>` : ''}
      </div>`;
    if (on('speed.share') && ST.shareOpen) {
      const text = encodeURIComponent(shareText());
      const links = [
        ['share.whatsapp', `https://wa.me/?text=${text}`],
        ['share.x', `https://x.com/intent/post?text=${text}`],
        ['share.facebook', `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent('https://thakurg.com/')}`],
        ['share.telegram', `https://t.me/share/url?url=${encodeURIComponent('https://thakurg.com/')}&text=${text}`],
      ];
      actions += `<div class="share-panel inset" role="group" aria-label="${t('share.menu')}"><span class="share-h">${t('share.menu')}</span>
          ${links.map(([k, href]) => `<a class="btn sm" href="${href}" target="_blank" rel="noopener noreferrer">${t(k)}</a>`).join('')}
          <button type="button" class="btn sm" data-act="stCopy">${ST.copied ? t('act.copied') : t('act.copy')}</button></div>`;
    }
  }
  return `<section class="card hero" id="st-hero" aria-labelledby="st-h1">
    <h1 id="st-h1">${t('st.h1a')} <em>${t('st.h1b')}</em></h1>
    <p class="lead">${t('st.lead')}</p>
    <div class="hero-grid"><div class="hero-meter">
    ${ST.resultUrl ? `<img class="result-img" src="${ST.resultUrl}" width="1200" height="630" alt="${speedStatus()}" />` : dialHtml()}
    ${on('speed.clock') ? `<div class="live" role="group" aria-label="${t('clk.now')}">
      <span class="chip inset">${ICON.clock}<span class="k">${t('clk.now')}</span><span class="v" id="clk-now">${new Date().toLocaleTimeString(langInfo().locale)}</span></span>
      <span class="chip inset">${ICON.timer}<span class="k">${t('clk.elapsed')}</span><span class="v" id="clk-el">${elapsedText()}</span></span>
    </div>` : ''}
    ${on('speed.progress') ? `<div class="prog" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(E.progress)}" aria-label="${speedStatus()}"><i id="prog-i" style="width: ${E.progress}%"></i></div>` : ''}
    </div><div class="hero-side">
    <p class="status" aria-live="polite">${speedStatus()}</p>
    <button type="button" class="btn pri lg go${running() ? ' stop' : ''}" data-act="stGo">${label}</button>
    <dl class="res" aria-label="${t('res.label')}">
      ${cell('res.download', 'down', E.down !== null ? fmtSpeed(E.down) : null, E.down !== null ? t(speedUnitKey(E.down)) : '')}
      ${cell('res.upload', 'up', E.up !== null ? fmtSpeed(E.up) : null, E.up !== null ? t(speedUnitKey(E.up)) : '')}
      ${cell('res.ping', 'ping', E.ping, t('unit.ms'))}
      ${cell('res.jitter', 'ping', E.jitter, t('unit.ms'))}
    </dl>
    ${hint ? `<p class="loaded inset${hint === 'loaded.bad' ? ' bad' : ''}"><span class="k">${t('res.loaded')}</span><b>${E.loaded}<small>${t('unit.ms')}</small></b><span class="hint">${t(hint)}</span></p>` : ''}
    ${actions}
    </div></div>
    <p class="note">${t('st.note')}</p>
  </section>`;
}

function elapsedText() {
  if (!E.startedAt)
    return '0:00';
  return clockTime(((E.finishedAt || Date.now()) - E.startedAt) / 1000);
}

function histHtml() {
  const items = history_.length
    ? `<ul class="hist-list">${history_.map((r) => `<li class="inset"><div><time datetime="${new Date(r.at).toISOString()}">${esc(new Date(r.at).toLocaleString(langInfo().locale, { dateStyle: 'medium', timeStyle: 'short' }))}</time>
        <p>${t('hist.item', { down: `${fmtSpeed(r.down)} ${traw(speedUnitKey(r.down))}`, up: `${fmtSpeed(r.up)} ${traw(speedUnitKey(r.up))}`, ping: Math.round(r.ping), jitter: r.jitter.toFixed(1) })}</p></div>
        <button type="button" class="btn sm" data-act="histDel" data-id="${r.id}">${t('hist.delete')}</button></li>`).join('')}</ul>`
    : `<p class="empty">${t('hist.empty')}</p>`;
  return `<section class="card hist" aria-labelledby="hist-h"><div class="hist-head"><h2 id="hist-h">${t('hist.title')}</h2>
      ${history_.length ? `<button type="button" class="btn sm" data-act="histClear">${t('hist.clear')}</button>` : ''}</div>${items}<p class="note">${t('hist.note')}</p></section>`;
}

function infoHtml() {
  const list = (prefix, n) => range(n).map((i) => `<li>${t(`${prefix}.${i}`)}</li>`).join('');
  return `<article class="card prose info" id="about-speed-test">
    <h2>${t('info.h2.intro')}</h2><p>${t('info.intro')}</p>
    <h2>${t('info.h2.mean')}</h2><ul>${list('info.mean', 4)}</ul>
    <h2>${t('info.h2.good')}</h2><p>${t('info.good')}</p>
    <h2>${t('info.h2.accurate')}</h2><ol>${list('info.acc', 4)}</ol>
    <h2>${t('info.h2.fix')}</h2><ul>${list('info.fix', 6)}</ul>
    <h2>${t('info.h2.faq')}</h2>
    ${range(8).map((i) => `<details><summary>${t(`faq.${i}.q`)}</summary><p>${t(`faq.${i}.a`)}</p></details>`).join('')}
  </article>`;
}

function speedPage() {
  const html = `<div class="wrap page">${heroHtml()}
    ${S.settings.connection.enabled ? host('sc-conn', connHtml()) : ''}
    ${S.settings.services.enabled ? host('sc-svc', svcHtml()) : ''}
    ${on('speed.history') ? histHtml() : ''}
    ${on('speed.info') ? infoHtml() : ''}</div>`;
  return {
    title: traw('seo.home.title'),
    html: host('sc-speed', html),
    after() {
      const clock = setInterval(() => {
        const now = document.getElementById('clk-now');
        if (now)
          now.textContent = new Date().toLocaleTimeString(langInfo().locale);
      }, 1000);
      cleanup.push(() => clearInterval(clock));
      if (!SV.checkedAt && !SV.checking)
        svcCheck();
    },
  };
}

function redrawHero() {
  const el = document.getElementById('st-hero');
  if (el)
    el.outerHTML = heroHtml();
}

/** Moves only the needle, numbers and progress bar between phase changes, so buttons are not redrawn under the pointer. */
function paintGauge() {
  const stops = S.settings.speed.gaugeStops;
  const frac = gaugeFraction(E.gauge, stops);
  const seg = document.getElementById('g-seg');
  if (seg) {
    const lit = litCount(frac);
    [...seg.children].forEach((el, i) => el.setAttribute('class', segClass(i, lit)));
    gaugePeak = Math.max(gaugePeak, E.gauge);
    const peakFrac = gaugeFraction(gaugePeak, stops);
    const peak = document.getElementById('g-peak');
    peak.setAttribute('transform', `rotate(${gaugeAngle(peakFrac).toFixed(2)} 120 120)`);
    peak.style.opacity = peakFrac * 100 > 0.2 ? '1' : '0';
    document.querySelectorAll('.sc-speed .g-label').forEach((el) => el.classList.toggle('on', lit > 0 && +el.dataset.f <= frac + 0.0001));
    document.getElementById('g-val').textContent = fmtSpeed(E.gauge);
    document.getElementById('g-unit').innerHTML = gaugeUnit();
  }
  const prog = document.getElementById('prog-i');
  if (prog)
    prog.style.width = E.progress + '%';
  const el = document.getElementById('clk-el');
  if (el)
    el.textContent = elapsedText();
}

const PHASES = [
  { id: 'ping', ms: 2500 },
  { id: 'down', ms: 7000 },
  { id: 'up', ms: 6000 },
];

function stRun() {
  const target = { down: rand(120, 340), up: rand(30, 95), ping: Math.round(rand(9, 28)), jitter: +rand(0.6, 4.5).toFixed(1) };
  Object.assign(E, { phase: 'ping', gauge: 0, ping: null, jitter: null, down: null, up: null, loaded: null, startedAt: Date.now(), finishedAt: 0, progress: 0 });
  Object.assign(ST, { saved: false, shareOpen: false, copied: false, resultUrl: null });
  const total = PHASES.reduce((s, p) => s + p.ms, 0);
  let index = 0;
  let phaseStart = performance.now();
  redrawHero();
  const step = () => {
    const p = PHASES[index];
    const k = Math.min(1, (performance.now() - phaseStart) / p.ms);
    const done = PHASES.slice(0, index).reduce((s, x) => s + x.ms, 0);
    E.progress = ((done + k * p.ms) / total) * 100;
    if (p.id === 'down' || p.id === 'up') {
      const ramp = 1 - Math.pow(1 - Math.min(1, k * 2.2), 3);
      E.gauge = target[p.id] * ramp * (1 + Math.sin(k * 40) * 0.04 * ramp);
    } else {
      E.gauge = 0;
    }
    paintGauge();
    if (k < 1) {
      E.timer = requestAnimationFrame(step);
      return;
    }
    if (p.id === 'ping') {
      E.ping = target.ping;
      E.jitter = target.jitter;
    } else {
      E[p.id] = +target[p.id].toFixed(1);
      if (p.id === 'down')
        E.loaded = target.ping + Math.round(rand(8, 70));
    }
    index++;
    if (index === PHASES.length) {
      E.phase = 'done';
      E.gauge = E.down;
      E.finishedAt = Date.now();
      E.progress = 100;
      redrawHero();
      return;
    }
    E.phase = PHASES[index].id;
    E.gauge = 0;
    phaseStart = performance.now();
    redrawHero();
    E.timer = requestAnimationFrame(step);
  };
  E.timer = requestAnimationFrame(step);
}

function stStop(redraw = true) {
  cancelAnimationFrame(E.timer);
  E.phase = 'stopped';
  E.gauge = 0;
  E.finishedAt = Date.now();
  if (redraw)
    redrawHero();
}
ACT.stGo = () => (running() ? stStop() : stRun());
ACT.stShare = () => {
  ST.shareOpen = !ST.shareOpen;
  redrawHero();
};
ACT.stCopy = () => {
  navigator.clipboard?.writeText(shareText()).catch(() => null);
  ST.copied = true;
  redrawHero();
};
ACT.stSave = () => {
  history_.unshift({ id: Date.now(), at: E.finishedAt, down: E.down, up: E.up, ping: E.ping, jitter: E.jitter });
  store.set('history', JSON.stringify(history_.slice(0, 50)));
  ST.saved = true;
  render();
};
ACT.histDel = (el) => {
  history_ = history_.filter((r) => String(r.id) !== el.dataset.id);
  store.set('history', JSON.stringify(history_));
  render();
};
ACT.histClear = () => {
  history_ = [];
  store.set('history', '[]');
  render();
};

/** Draws the 1200 × 630 result card, shows it in place of the gauge and offers it as a download. */
ACT.stImage = () => {
  const c = document.createElement('canvas');
  c.width = 1200;
  c.height = 630;
  const g = c.getContext('2d');
  const css = getComputedStyle(document.documentElement);
  const grad = g.createLinearGradient(0, 0, 1200, 630);
  grad.addColorStop(0, '#2a1033');
  grad.addColorStop(1, '#170a1c');
  g.fillStyle = grad;
  g.fillRect(0, 0, 1200, 630);
  g.fillStyle = css.getPropertyValue('--accent').trim() || '#e3bd68';
  g.font = '700 54px Fraunces Variable, serif';
  g.fillText(traw('share.title'), 70, 120);
  const cells = [
    [traw('res.download'), fmtSpeed(E.down), traw(speedUnitKey(E.down))],
    [traw('res.upload'), fmtSpeed(E.up), traw(speedUnitKey(E.up))],
    [traw('res.ping'), String(E.ping), traw('unit.ms')],
    [traw('res.jitter'), String(E.jitter), traw('unit.ms')],
  ];
  cells.forEach(([k, v, u], i) => {
    const x = 70 + (i % 2) * 540;
    const y = 230 + Math.floor(i / 2) * 180;
    g.fillStyle = 'rgba(255,255,255,.08)';
    g.fillRect(x - 20, y - 70, 500, 150);
    g.fillStyle = '#cfc1d6';
    g.font = '600 30px Manrope Variable, sans-serif';
    g.fillText(k, x, y - 25);
    g.fillStyle = '#f5ecf7';
    g.font = '800 64px Manrope Variable, sans-serif';
    g.fillText(`${v} ${u}`, x, y + 50);
  });
  g.fillStyle = '#cfc1d6';
  g.font = '600 28px Manrope Variable, sans-serif';
  g.fillText('thakurg.com', 70, 590);
  ST.resultUrl = c.toDataURL('image/png');
  const a = document.createElement('a');
  a.href = ST.resultUrl;
  a.download = 'speed-test.png';
  a.click();
  redrawHero();
};

// #endregion

