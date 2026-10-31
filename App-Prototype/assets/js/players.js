/* Creta and Nexon players. Moved from thakurg.html as it was; see App-Prototype/README.md for the page layout. */
'use strict';

// #region Creta and Nexon players

const DEMO_SONGS = {
  creta: [
    ['Monsoon Drive', 'Creta Sessions'], ['Highway Lights', 'Night Riders'], ['Chai at Dawn', 'Lo-fi Bombay'], ['Desert Wind', 'Rajasthan Strings'],
    ['City of Dreams', 'Marine Drive Trio'], ['Slow Rain', 'Ambient Ghats'],
  ],
  nexon: [
    ['Electric Blue', 'Nexon Beats'], ['Charging Up', 'Volt'], ['Green Corridor', 'Eco Wave'], ['Night Shift', 'Synth Pune'], ['Silent Motor', 'EV Lounge'],
  ],
};
const TRACKS = {};
Object.entries(DEMO_SONGS).forEach(([id, list], pi) => {
  TRACKS[id] = list.map(([title, artist], i) => ({ id: `${id}-${i + 1}`, title, artist, seed: pi * 10 + i + 1, duration: 150 + ((i * 37 + pi * 11) % 90) }));
});
const PL = { creta: { pending: null, status: null, busy: false }, nexon: { pending: null, status: null, busy: false } };
const DANCE_OPTIONS = ['auto', 'stick', 'trio', 'robot', 'cat', 'blob', 'lines'];
const doodle = { choice: 'auto', raf: 0 };

['creta', 'nexon'].forEach((id) => {
  PLAYERS[id] = { id, pb: newPlayback(), list: () => TRACKS[id], redraw: () => S.route.path === '/' + id && render() };
});

/** tt(): Creta and Nexon share one page; the keys that differ use the player's own prefix. */
const tt = (id, name) => t(name.startsWith('seo.') ? `seo.${id}.${name.slice(4)}` : `${id}.${name}`);

function playerPage(id) {
  const p = PLAYERS[id];
  const pb = p.pb;
  const list = TRACKS[id];
  const st = PL[id];
  const cur = list[pb.index];
  let now = '';
  if (cur) {
    now = `<div class="now"><div class="art inset" aria-hidden="true"><img src="${artUrl(cur.seed, 160, 160, cur.title.slice(0, 1))}" alt="" width="160" height="160" /></div>
        <div class="meta"><span class="label">${t('creta.now')}</span><h2 class="title">${esc(cur.title)}</h2><p class="artist">${esc(cur.artist)}</p></div></div>
      ${on('audio.doodle') ? host('sc-doodle', `<div class="stage inset"><canvas id="doodle" aria-hidden="true"></canvas></div><div class="picks" role="group" aria-label="${t('dance.label')}">${DANCE_OPTIONS.map((o) => `<button type="button" class="btn sm${doodle.choice === o ? ' is-on' : ''}" aria-pressed="${doodle.choice === o}" data-act="dance" data-o="${o}">${t('dance.' + o)}</button>`).join('')}</div>`) : ''}
      ${on('audio.seek') ? seekHtml(pb, id, cur.duration) : ''}
      ${controlsHtml(pb, id, { shuffle: on('audio.shuffle'), repeat: on('audio.repeat') })}
      ${on('audio.volume') ? volumeHtml(pb, id) : ''}`;
  } else {
    now = `<div class="empty inset"><p class="empty-h">${t('creta.empty')}</p><p>${tt(id, 'empty2')}</p></div>`;
  }
  let playlist = '';
  if (on('audio.playlist')) {
    playlist = `<section class="card list" aria-labelledby="pl-h"><div class="list-head"><h2 id="pl-h">${t('creta.playlist')}</h2>
        ${on('audio.edit') ? `<a class="btn icon sm" href="${link('/' + id + '-add')}" aria-label="${t('creta.edit.add')}" title="${t('creta.edit.add')}">${ICONS.plus}</a>` : ''}</div>
      ${st.pending ? `<form class="setup inset" data-submit="trackDelete" data-p="${id}"><p>${t('creta.edit.confirm', { name: st.pending.title })}</p>
        <label>${t('creta.edit.password')}<input id="del-pw" name="pw" type="password" autocomplete="off" /></label>
        <div class="setup-actions"><button type="submit" class="btn pri">${t('creta.edit.delete')}</button><button type="button" class="btn" data-act="trackCancel" data-p="${id}">${t('creta.edit.cancel')}</button></div></form>` : ''}
      ${st.status ? `<p class="status${st.status.error ? ' bad' : ''}" role="${st.status.error ? 'alert' : 'status'}">${esc(st.status.text)}</p>` : ''}
      ${list.length ? `<ol>${list.map((tr, i) => `<li class="item"><button type="button" class="row${i === pb.index ? ' on' : ''}"${i === pb.index ? ' aria-current="true"' : ''} data-act="pbChoose" data-p="${id}" data-i="${i}">
          <span class="n" aria-hidden="true">${i + 1}</span><span class="tt"><b>${esc(tr.title)}</b>${tr.artist ? `<small>${esc(tr.artist)}</small>` : ''}</span>${i === pb.index && pb.playing ? eqHtml : ''}</button>
          ${on('audio.edit') ? `<button type="button" class="btn icon sm del" aria-label="${t('creta.edit.delete')}: ${esc(tr.title)}" title="${t('creta.edit.delete')}" data-act="trackAsk" data-p="${id}" data-i="${i}">${ICONS.trash}</button>` : ''}</li>`).join('')}</ol>`
        : `<p class="note">${t('creta.edit.none')}</p>`}
    </section>`;
  }
  return {
    title: traw(`seo.${id}.title`),
    html: host('sc-player', `<div class="wrap page"><section class="card player" aria-labelledby="player-h1"><h1 id="player-h1">${tt(id, 'h1')}</h1><p class="lead">${tt(id, 'lead')}</p>${now}</section>${playlist}</div>`),
    after() {
      startDoodle(pb);
      cleanup.push(stopDoodle);
    },
  };
}

ACT.trackAsk = (el) => {
  PL[el.dataset.p].pending = TRACKS[el.dataset.p][+el.dataset.i];
  PL[el.dataset.p].status = null;
  render();
  document.getElementById('del-pw')?.focus();
};
ACT.trackCancel = (el) => {
  PL[el.dataset.p].pending = null;
  render();
};
SUBMIT.trackDelete = (form, data) => {
  const id = form.dataset.p;
  const st = PL[id];
  if (!String(data.get('pw')).trim()) {
    st.status = { error: true, text: msg('MUSIC_PASSWORD_INVALID') };
    return render();
  }
  const list = TRACKS[id];
  const at = list.indexOf(st.pending);
  const pb = PLAYERS[id].pb;
  list.splice(at, 1);
  if (at < pb.index || pb.index >= list.length)
    pb.index = Math.max(0, pb.index - 1);
  if (!list.length)
    pbPause(PLAYERS[id]);
  st.pending = null;
  st.status = { error: false, text: msg('MUSIC_TRACK_DELETED') };
  render();
};
ACT.dance = (el) => {
  doodle.choice = el.dataset.o;
  render();
};

/** The dancing doodle: moves with the beat while playing and rests when paused. */
function startDoodle(pb) {
  const cv = document.getElementById('doodle');
  if (!cv)
    return;
  const g = cv.getContext('2d');
  const draw = (now) => {
    const w = (cv.width = cv.clientWidth * devicePixelRatio);
    const h = (cv.height = cv.clientHeight * devicePixelRatio);
    const css = getComputedStyle(cv);
    const ink = css.getPropertyValue('--accent').trim() || '#e3bd68';
    const ink2 = css.getPropertyValue('--text').trim() || '#fff';
    g.clearRect(0, 0, w, h);
    const beat = pb.playing ? now / 230 : 0;
    const amp = pb.playing ? 1 : 0.15;
    const kind = doodle.choice === 'auto' ? DANCE_OPTIONS[1 + (Math.floor(now / 8000) % (DANCE_OPTIONS.length - 1))] : doodle.choice;
    g.lineWidth = 3 * devicePixelRatio;
    g.lineCap = 'round';
    g.strokeStyle = ink;
    g.fillStyle = ink;
    const s = Math.min(w, h) / 120;
    const figure = (cx, phase) => {
      const b = Math.sin(beat + phase) * amp;
      const by = h / 2 + 8 * s + Math.abs(b) * -6 * s;
      g.beginPath();
      g.arc(cx, by - 30 * s, 8 * s, 0, Math.PI * 2);
      g.stroke();
      g.beginPath();
      g.moveTo(cx, by - 22 * s);
      g.lineTo(cx + b * 4 * s, by + 4 * s);
      g.moveTo(cx, by - 14 * s);
      g.lineTo(cx - 16 * s, by - 14 * s - b * 14 * s);
      g.moveTo(cx, by - 14 * s);
      g.lineTo(cx + 16 * s, by - 14 * s + b * 14 * s);
      g.moveTo(cx + b * 4 * s, by + 4 * s);
      g.lineTo(cx - 10 * s, by + 26 * s + b * 4 * s);
      g.moveTo(cx + b * 4 * s, by + 4 * s);
      g.lineTo(cx + 10 * s, by + 26 * s - b * 4 * s);
      g.stroke();
    };
    if (kind === 'stick')
      figure(w / 2, 0);
    else if (kind === 'trio')
      [-1, 0, 1].forEach((k) => figure(w / 2 + k * 42 * s, k * 1.2));
    else if (kind === 'robot') {
      const b = Math.sin(beat) * amp;
      g.strokeRect(w / 2 - 14 * s, h / 2 - 40 * s + b * 3 * s, 28 * s, 22 * s);
      g.strokeRect(w / 2 - 18 * s, h / 2 - 14 * s, 36 * s, 30 * s);
      g.beginPath();
      g.moveTo(w / 2 - 18 * s, h / 2 - 8 * s);
      g.lineTo(w / 2 - 34 * s, h / 2 - 8 * s + (b > 0 ? -16 : 16) * s * Math.abs(b));
      g.moveTo(w / 2 + 18 * s, h / 2 - 8 * s);
      g.lineTo(w / 2 + 34 * s, h / 2 - 8 * s + (b > 0 ? 16 : -16) * s * Math.abs(b));
      g.moveTo(w / 2 - 10 * s, h / 2 + 16 * s);
      g.lineTo(w / 2 - 10 * s, h / 2 + 36 * s);
      g.moveTo(w / 2 + 10 * s, h / 2 + 16 * s);
      g.lineTo(w / 2 + 10 * s, h / 2 + 36 * s);
      g.stroke();
    } else if (kind === 'cat') {
      const b = Math.sin(beat) * amp;
      const cx = w / 2 + b * 10 * s;
      g.beginPath();
      g.ellipse(cx, h / 2 + 14 * s, 22 * s, 16 * s, 0, 0, Math.PI * 2);
      g.moveTo(cx + 14 * s, h / 2 - 8 * s);
      g.arc(cx, h / 2 - 8 * s, 14 * s, 0, Math.PI * 2);
      g.moveTo(cx - 12 * s, h / 2 - 16 * s);
      g.lineTo(cx - 8 * s, h / 2 - 30 * s);
      g.lineTo(cx - 2 * s, h / 2 - 20 * s);
      g.moveTo(cx + 12 * s, h / 2 - 16 * s);
      g.lineTo(cx + 8 * s, h / 2 - 30 * s);
      g.lineTo(cx + 2 * s, h / 2 - 20 * s);
      g.moveTo(cx + 22 * s, h / 2 + 14 * s);
      g.quadraticCurveTo(cx + 40 * s, h / 2 - 4 * s + b * 12 * s, cx + 34 * s, h / 2 - 20 * s);
      g.stroke();
    } else if (kind === 'blob') {
      g.beginPath();
      for (let i = 0; i <= 40; i++) {
        const a = (i / 40) * Math.PI * 2;
        const r = 30 * s * (1 + 0.12 * amp * Math.sin(a * 3 + beat * 2) + 0.08 * amp * Math.cos(a * 5 - beat));
        const x = w / 2 + r * Math.cos(a);
        const y = h / 2 + r * Math.sin(a);
        i ? g.lineTo(x, y) : g.moveTo(x, y);
      }
      g.globalAlpha = 0.85;
      g.fill();
      g.globalAlpha = 1;
    } else {
      const n = 24;
      const bw = w / (n * 1.6);
      for (let i = 0; i < n; i++) {
        const v = pb.playing ? 0.25 + 0.75 * Math.abs(Math.sin(now / 180 + i * 0.7) * Math.cos(now / 470 + i * 0.3)) : 0.08;
        g.fillStyle = i % 2 ? ink : ink2;
        g.fillRect(w / 2 - (n * bw * 1.6) / 2 + i * bw * 1.6, h - 10 * s - v * (h - 20 * s), bw, v * (h - 20 * s));
      }
    }
    doodle.raf = requestAnimationFrame(draw);
  };
  doodle.raf = requestAnimationFrame(draw);
}

function stopDoodle() {
  cancelAnimationFrame(doodle.raf);
}

// #endregion

