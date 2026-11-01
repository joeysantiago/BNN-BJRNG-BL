/* Shared audio engine (Creta, Nexon and YouTube). Moved from thakurg.html as it was; see App-Prototype/README.md for the page layout. */
'use strict';

// #region Shared audio: a tiny synthesiser stands in for the real audio files, so play, pause, seek and volume all do something

const SCALES = [[0, 2, 4, 7, 9], [0, 3, 5, 7, 10], [0, 2, 3, 7, 8], [0, 4, 5, 7, 11]];
const synth = { ctx: null, gain: null, timer: null, next: 0, step: 0, seed: 1 };

function synthStart(seed, volume) {
  try {
    synth.ctx ??= new (window.AudioContext || window.webkitAudioContext)();
  } catch {
    return;
  }
  synthStop();
  synth.seed = seed;
  synth.gain = synth.ctx.createGain();
  synth.gain.gain.value = volume * 0.18;
  synth.gain.connect(synth.ctx.destination);
  synth.next = synth.ctx.currentTime + 0.05;
  synth.timer = setInterval(synthSchedule, 60);
  void synth.ctx.resume();
}

function synthSchedule() {
  const ctx = synth.ctx;
  const scale = SCALES[synth.seed % SCALES.length];
  const beat = 60 / (96 + (synth.seed % 4) * 12) / 2;
  while (synth.next < ctx.currentTime + 0.25) {
    const i = synth.step++;
    const pattern = (i * (synth.seed + 3) + Math.floor(i / 8) * 2) % scale.length;
    const note = 57 + scale[pattern] + (i % 16 >= 12 ? 12 : 0);
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = synth.seed % 2 ? 'triangle' : 'sine';
    osc.frequency.value = 440 * Math.pow(2, (note - 69) / 12);
    env.gain.setValueAtTime(0, synth.next);
    env.gain.linearRampToValueAtTime(1, synth.next + 0.02);
    env.gain.exponentialRampToValueAtTime(0.001, synth.next + beat * 1.8);
    osc.connect(env).connect(synth.gain);
    osc.start(synth.next);
    osc.stop(synth.next + beat * 2);
    if (i % 4 === 0) {
      const bass = ctx.createOscillator();
      const bEnv = ctx.createGain();
      bass.frequency.value = 440 * Math.pow(2, (45 + scale[(i / 4) % scale.length] - 69) / 12);
      bEnv.gain.setValueAtTime(0.7, synth.next);
      bEnv.gain.exponentialRampToValueAtTime(0.001, synth.next + beat * 3.5);
      bass.connect(bEnv).connect(synth.gain);
      bass.start(synth.next);
      bass.stop(synth.next + beat * 4);
    }
    synth.next += beat;
  }
}

function synthStop() {
  clearInterval(synth.timer);
  synth.timer = null;
  if (synth.gain) {
    synth.gain.disconnect();
    synth.gain = null;
  }
}

function synthVolume(volume) {
  if (synth.gain)
    synth.gain.gain.value = volume * 0.18;
}

const ICONS = {
  note: '<svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>',
  shuffle: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/></svg>',
  prev: '<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 5h2v14H6zM20 5v14L9 12z"/></svg>',
  next: '<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M16 5h2v14h-2zM4 5v14l11-7z"/></svg>',
  pause: '<svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg>',
  play: '<svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4v16l13-8z"/></svg>',
  repeat: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>',
  muted: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5L6 9H2v6h4l5 4zM23 9l-6 6M17 9l6 6"/></svg>',
  volume: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5L6 9H2v6h4l5 4zM15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/></svg>',
  trash: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v6M14 11v6"/></svg>',
  plus: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
  download: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v11M7 11l5 5 5-5M5 20h14"/></svg>',
  addList: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h12M3 12h12M3 18h8M17 15v6M14 18h6"/></svg>',
  full: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3"/></svg>',
};

/** One playback state per page (creta, nexon, youtube): index, time, shuffle, repeat, volume. */
function newPlayback() {
  return { index: 0, playing: false, time: 0, shuffle: false, repeat: 'off', volume: 0.8, muted: false, ticker: null };
}

function controlsHtml(pb, prefix, flags) {
  return `<div class="controls">
      ${flags.shuffle ? `<button type="button" class="btn icon${pb.shuffle ? ' is-on' : ''}" aria-pressed="${pb.shuffle}" aria-label="${t('creta.shuffle')}" data-act="pbShuffle" data-p="${prefix}">${ICONS.shuffle}</button>` : ''}
      <button type="button" class="btn icon" aria-label="${t('creta.prev')}" data-act="pbPrev" data-p="${prefix}">${ICONS.prev}</button>
      <button type="button" class="btn pri icon big" aria-label="${pb.playing ? t('creta.pause') : t('creta.play')}" data-act="pbToggle" data-p="${prefix}">${pb.playing ? ICONS.pause : ICONS.play}</button>
      <button type="button" class="btn icon" aria-label="${t('creta.next')}" data-act="pbNext" data-p="${prefix}">${ICONS.next}</button>
      ${flags.repeat ? `<button type="button" class="btn icon rep${pb.repeat !== 'off' ? ' is-on' : ''}" aria-pressed="${pb.repeat !== 'off'}" aria-label="${t('creta.repeat')}: ${pb.repeat}" data-act="pbRepeat" data-p="${prefix}">${ICONS.repeat}${pb.repeat === 'one' ? '<span class="one" aria-hidden="true">1</span>' : ''}</button>` : ''}
    </div>`;
}

function seekHtml(pb, prefix, duration) {
  return `<div class="seek"><span class="t" aria-hidden="true" id="${prefix}-time">${clockTime(pb.time)}</span>
      <input id="${prefix}-seek" type="range" min="0" max="${duration}" step="1" value="${Math.floor(pb.time)}" aria-label="${t('creta.seek')}" data-input="pbSeek" data-p="${prefix}" />
      <span class="t" aria-hidden="true">${clockTime(duration)}</span></div>`;
}

function volumeHtml(pb, prefix) {
  return `<div class="vol"><button type="button" class="btn sm icon" aria-pressed="${pb.muted}" aria-label="${t('creta.mute')}" data-act="pbMute" data-p="${prefix}">${pb.muted || pb.volume === 0 ? ICONS.muted : ICONS.volume}</button>
      <input id="${prefix}-vol" type="range" min="0" max="1" step="0.02" value="${pb.muted ? 0 : pb.volume}" aria-label="${t('creta.volume')}" data-input="pbVolume" data-p="${prefix}" /></div>`;
}

const eqHtml = '<span class="eq" aria-hidden="true"><i></i><i></i><i></i></span>';

/** The players a page can drive. Each entry knows its list, its playback state and how to redraw. */
const PLAYERS = {};

function pbOf(el) {
  return PLAYERS[el.dataset.p];
}

function pbPlay(p, index) {
  const pb = p.pb;
  const list = p.list();
  if (!list.length)
    return;
  if (index !== undefined && index !== pb.index) {
    pb.index = index;
    pb.time = 0;
  }
  pb.playing = true;
  synthStart(list[pb.index].seed, pb.muted ? 0 : pb.volume);
  clearInterval(pb.ticker);
  pb.ticker = setInterval(() => {
    pb.time += 0.25;
    const dur = list[pb.index]?.duration ?? 0;
    if (pb.time >= dur) {
      pbEnded(p);
      return;
    }
    const tm = document.getElementById(p.id + '-time');
    if (tm) {
      tm.textContent = clockTime(pb.time);
      const seek = document.getElementById(p.id + '-seek');
      if (seek && document.activeElement !== seek)
        seek.value = Math.floor(pb.time);
    }
  }, 250);
  p.redraw();
}

function pbPause(p) {
  p.pb.playing = false;
  clearInterval(p.pb.ticker);
  synthStop();
  p.redraw();
}

function pbStep(p, dir) {
  const pb = p.pb;
  const n = p.list().length;
  if (!n)
    return;
  const next = pb.shuffle && n > 1 ? (pb.index + 1 + Math.floor(Math.random() * (n - 1))) % n : (pb.index + dir + n) % n;
  pb.index = next;
  pb.time = 0;
  if (pb.playing)
    pbPlay(p);
  else
    p.redraw();
}

function pbEnded(p) {
  const pb = p.pb;
  pb.time = 0;
  if (pb.repeat === 'one')
    return pbPlay(p);
  if (pb.repeat === 'off' && pb.index === p.list().length - 1 && !pb.shuffle)
    return pbPause(p);
  pbStep(p, 1);
}

ACT.pbToggle = (el) => {
  const p = pbOf(el);
  p.pb.playing ? pbPause(p) : pbPlay(p);
};
ACT.pbPrev = (el) => {
  const p = pbOf(el);
  if (p.pb.time > 3) {
    p.pb.time = 0;
    p.redraw();
  } else {
    pbStep(p, -1);
  }
};
ACT.pbNext = (el) => pbStep(pbOf(el), 1);
ACT.pbShuffle = (el) => {
  const p = pbOf(el);
  p.pb.shuffle = !p.pb.shuffle;
  p.redraw();
};
ACT.pbRepeat = (el) => {
  const p = pbOf(el);
  p.pb.repeat = { off: 'all', all: 'one', one: 'off' }[p.pb.repeat];
  p.redraw();
};
ACT.pbMute = (el) => {
  const p = pbOf(el);
  p.pb.muted = !p.pb.muted;
  synthVolume(p.pb.muted ? 0 : p.pb.volume);
  p.redraw();
};
ACT.pbChoose = (el) => {
  const p = pbOf(el);
  pbPlay(p, +el.dataset.i);
};
INPUT.pbSeek = (el) => {
  const p = pbOf(el);
  p.pb.time = +el.value;
  document.getElementById(p.id + '-time').textContent = clockTime(p.pb.time);
};
INPUT.pbVolume = (el) => {
  const p = pbOf(el);
  p.pb.volume = +el.value;
  p.pb.muted = false;
  synthVolume(p.pb.volume);
};

function stopAllPlayback() {
  Object.values(PLAYERS).forEach((p) => {
    clearInterval(p.pb.ticker);
    p.pb.playing = false;
  });
  synthStop();
  if (typeof stopDoodle === 'function')
    stopDoodle();
}

// #endregion

