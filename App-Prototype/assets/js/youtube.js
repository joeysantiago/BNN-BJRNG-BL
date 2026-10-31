/* YouTube page. Moved from thakurg.html as it was; see App-Prototype/README.md for the page layout. */
'use strict';

// #region YouTube

const YT_LIBRARY = [
  ['Kesariya', 'Arijit Singh'], ['Tum Hi Ho', 'Arijit Singh'], ['Kun Faya Kun', 'A. R. Rahman'], ['Channa Mereya', 'Arijit Singh'], ['Ilahi', 'Arijit Singh'],
  ['Shape of You', 'Ed Sheeran'], ['Believer', 'Imagine Dragons'], ['Perfect', 'Ed Sheeran'], ['Levitating', 'Dua Lipa'], ['Blinding Lights', 'The Weeknd'],
  ['Lag Ja Gale', 'Lata Mangeshkar'], ['Jai Ho', 'A. R. Rahman'], ['Raataan Lambiyan', 'Jubin Nautiyal'], ['Apna Bana Le', 'Arijit Singh'], ['Pasoori', 'Ali Sethi'],
].map(([title, artist], i) => ({ id: 'yt' + (i + 1), title, artist, seed: 40 + i, duration: 180 + ((i * 29) % 120), thumb: artUrl(40 + i, 160, 90, title.slice(0, 1)) }));

const YT = { results: [], queue: [], message: '', busy: false, showVideo: true, quality: 'auto', tip: true, playlists: [], target: null, openList: null, downloading: null };
PLAYERS.yt = { id: 'yt', pb: newPlayback(), list: () => YT.queue, redraw: () => S.route.path === '/youtube' && render() };

function ytPage() {
  const pb = PLAYERS.yt.pb;
  const cur = YT.queue[pb.index];
  const canSearch = on('yt.search');
  let player = '';
  if (on('yt.play') && cur) {
    player = `${on('yt.video') ? `<div class="vopts">
          <button type="button" class="btn sm vtoggle${YT.showVideo ? ' is-on' : ''}" role="switch" aria-checked="${YT.showVideo}" data-act="ytVideo">${t(YT.showVideo ? 'yt.video.on' : 'yt.video.off')}</button>
          ${YT.showVideo ? `<label class="sr-only" for="yt-quality">${t('yt.quality')}</label><select id="yt-quality" class="btn sm inset" data-change="ytQuality"><option value="auto">${t('yt.quality.auto')}</option>${['hd1080', 'hd720', 'large', 'medium', 'small'].map((q) => `<option value="${q}"${YT.quality === q ? ' selected' : ''}>${{ hd1080: '1080p', hd720: '720p', large: '480p', medium: '360p', small: '240p' }[q]}</option>`).join('')}</select>
            <button type="button" class="btn sm" aria-label="${t('yt.fullscreen')}" data-act="ytFull">${ICONS.full}${t('yt.fullscreen')}</button>` : ''}
        </div>` : ''}
      ${!YT.showVideo ? `<p class="note">${t('yt.bg.on')}</p>` : ''}
      <div class="now"><div class="art inset" aria-hidden="true"><img src="${cur.thumb}" alt="" width="160" height="90" /></div>
        <div class="meta"><span class="label">${t('creta.now')}</span><h2 class="title">${esc(cur.title)}</h2><p class="artist">${esc(cur.artist)}</p></div></div>
      ${on('yt.seek') ? seekHtml(pb, 'yt', cur.duration) : ''}
      ${controlsHtml(pb, 'yt', { shuffle: on('yt.shuffle'), repeat: on('yt.repeat') })}
      ${on('yt.volume') ? volumeHtml(pb, 'yt') : ''}`;
  } else if (on('yt.play')) {
    player = `<div class="empty inset"><p class="empty-h">${t('yt.empty')}</p><p>${t('yt.empty2')}</p></div>`;
  }
  const video = `<div class="video${cur ? ' on' : ''}${YT.showVideo ? '' : ' off'}"><div class="host" id="yt-host">${cur ? `<img src="${artUrl(cur.seed, 640, 360, cur.title)}" alt="" style="width:100%;height:100%;object-fit:cover;display:block" />` : ''}</div></div>`;
  const songButtons = (v) => `${on('yt.queue') ? `<button type="button" class="btn icon sm" aria-label="${t('yt.add')}: ${esc(v.title)}" title="${t('yt.add')}" data-act="ytEnqueue" data-id="${v.id}">${ICONS.plus}</button>` : ''}
      ${on('yt.download') ? `<button type="button" class="btn icon sm" aria-label="${t('yt.download')}: ${esc(v.title)}" title="${t('yt.download')}"${YT.downloading === v.id ? ' disabled' : ''} data-act="ytDownload" data-id="${v.id}">${ICONS.download}</button>` : ''}
      ${on('yt.playlists') ? `<button type="button" class="btn icon sm" aria-label="${t('yt.pl.add')}: ${esc(v.title)}" title="${t('yt.pl.add')}" data-act="ytToList" data-id="${v.id}">${ICONS.addList}</button>` : ''}`;
  const results = YT.results.length ? `<section class="card list" aria-labelledby="yt-res"><h2 id="yt-res">${t('yt.results')}</h2><ul>${YT.results.map((v) => `<li class="item">
      <button type="button" class="row"${on('yt.play') ? '' : ' disabled'} data-act="ytPlay" data-id="${v.id}"><img src="${v.thumb}" alt="" width="64" height="36" loading="lazy" /><span class="tt"><b>${esc(v.title)}</b><small>${esc(v.artist)} · ${clockTime(v.duration)}</small></span></button>
      ${songButtons(v)}</li>`).join('')}</ul></section>` : '';
  const queue = on('yt.queue') && YT.queue.length ? `<section class="card list" aria-labelledby="yt-q-h"><h2 id="yt-q-h">${t('yt.queue')}</h2><ol>${YT.queue.map((v, i) => `<li class="item">
      <button type="button" class="row${i === pb.index ? ' on' : ''}"${i === pb.index ? ' aria-current="true"' : ''} data-act="pbChoose" data-p="yt" data-i="${i}"><span class="n" aria-hidden="true">${i + 1}</span><span class="tt"><b>${esc(v.title)}</b><small>${esc(v.artist)}</small></span>${i === pb.index && pb.playing ? eqHtml : ''}</button>
      ${on('yt.playlists') ? `<button type="button" class="btn icon sm" aria-label="${t('yt.pl.add')}: ${esc(v.title)}" title="${t('yt.pl.add')}" data-act="ytToList" data-id="${v.id}">${ICONS.addList}</button>` : ''}
      <button type="button" class="btn icon sm" aria-label="${t('yt.remove')}: ${esc(v.title)}" title="${t('yt.remove')}" data-act="ytRemove" data-i="${i}">${ICONS.trash}</button></li>`).join('')}</ol>
      ${on('yt.playlists') ? `<form class="find pl-save" data-submit="ytSaveQueue"><input name="name" type="text" class="inset" maxlength="60" placeholder="${t('yt.pl.name')}" aria-label="${t('yt.pl.name')}" /><button type="submit" class="btn">${t('yt.pl.saveq')}</button></form>` : ''}
    </section>` : '';
  const lists = on('yt.playlists') ? `<section class="card list" aria-labelledby="yt-pl-h"><h2 id="yt-pl-h">${t('yt.pl.title')}</h2>
      <form class="find pl-new" data-submit="ytNewList"><input name="name" type="text" class="inset" maxlength="60" placeholder="${t('yt.pl.new')}" aria-label="${t('yt.pl.new')}" /><button type="submit" class="btn pri">${t('yt.pl.create')}</button></form>
      ${YT.playlists.length ? `<label class="pl-target"><span>${t('yt.pl.addto')}</span><select class="btn sm inset" data-change="ytTarget">${YT.playlists.map((p) => `<option value="${p.id}"${p.id === YT.target ? ' selected' : ''}>${esc(p.name)}</option>`).join('')}</select></label>
        <ul>${YT.playlists.map((p) => `<li class="pl"><details${p.id === YT.openList ? ' open' : ''}><summary><b>${esc(p.name)}</b><small>${p.songs.length}</small></summary>
          <div class="find pl-edit"><input type="text" class="inset" maxlength="60" value="${esc(p.name)}" aria-label="${t('yt.pl.rename')}" data-change="ytRename" data-id="${p.id}" />
            <button type="button" class="btn sm"${p.songs.length ? '' : ' disabled'} data-act="ytPlayList" data-id="${p.id}">${t('yt.pl.play')}</button><button type="button" class="btn sm" data-act="ytDelList" data-id="${p.id}">${t('yt.pl.delete')}</button></div>
          ${p.songs.length ? `<ol>${p.songs.map((s, i) => `<li class="item"><span class="tt"><b>${esc(s.title)}</b><small>${esc(s.artist)}</small></span>
            <button type="button" class="btn icon sm"${i === 0 ? ' disabled' : ''} aria-label="${t('yt.pl.up')}: ${esc(s.title)}" data-act="ytMove" data-id="${p.id}" data-i="${i}" data-by="-1">↑</button>
            <button type="button" class="btn icon sm"${i === p.songs.length - 1 ? ' disabled' : ''} aria-label="${t('yt.pl.down')}: ${esc(s.title)}" data-act="ytMove" data-id="${p.id}" data-i="${i}" data-by="1">↓</button>
            <button type="button" class="btn icon sm" aria-label="${t('yt.remove')}: ${esc(s.title)}" data-act="ytDelSong" data-id="${p.id}" data-i="${i}">✕</button></li>`).join('')}</ol>` : `<p class="note">${t('yt.pl.nosongs')}</p>`}
        </details></li>`).join('')}</ul>` : `<p class="note">${t('yt.pl.empty')}</p>`}
    </section>` : '';
  const html = `<div class="wrap page"><section class="card player" aria-labelledby="yt-h1"><h1 id="yt-h1">${t('yt.h1')}</h1><p class="lead">${t('yt.lead')}</p>
      <form class="find" role="search" data-submit="ytSearch"><label class="sr-only" for="yt-q">${t('yt.label')}</label>
        <input id="yt-q" name="q" type="search" class="inset" autocomplete="off" spellcheck="false" enterkeyhint="search" placeholder="${t(canSearch ? 'yt.placeholder' : 'yt.placeholder.link')}" />
        <button type="submit" class="btn pri"${YT.busy ? ' disabled' : ''}>${YT.busy ? t('yt.searching') : t(canSearch ? 'yt.go' : 'yt.play')}</button></form>
      ${YT.message ? `<p class="err" role="alert">${t(YT.message)}</p>` : ''}
      ${YT.tip ? `<p class="tip inset" role="note"><span>${t('yt.tip.desktop')}</span><button type="button" class="btn sm" data-act="ytTip">${t('yt.tip.ok')}</button></p>` : ''}
      ${video}${player}<p class="note">${t('yt.note')}</p></section>${results}${queue}${lists}</div>`;
  return { title: traw('seo.yt.title'), html: host('sc-yt', html) };
}

const ytFind = (id) => YT_LIBRARY.find((v) => v.id === id);

SUBMIT.ytSearch = (form, data) => {
  const q = String(data.get('q')).trim();
  YT.message = '';
  if (!q) {
    YT.message = on('yt.search') ? '' : 'yt.needlink';
    return render();
  }
  const isLink = /^(https?:\/\/)?(www\.|m\.|music\.)?(youtube\.com|youtu\.be)\//i.test(q);
  if (/^https?:\/\//i.test(q) && !isLink) {
    YT.message = 'yt.badlink';
    return render();
  }
  if (!on('yt.search') && !isLink) {
    YT.message = 'yt.needlink';
    return render();
  }
  YT.busy = true;
  render();
  setTimeout(() => {
    YT.busy = false;
    if (isLink) {
      const v = YT_LIBRARY[q.length % YT_LIBRARY.length];
      YT.queue.push(v);
      pbPlay(PLAYERS.yt, YT.queue.length - 1);
      return;
    }
    const words = q.toLowerCase().split(/\s+/);
    const hits = YT_LIBRARY.filter((v) => words.some((w) => (v.title + ' ' + v.artist).toLowerCase().includes(w)));
    YT.results = hits.length ? hits : YT_LIBRARY.slice(0, 8);
    render();
  }, 600);
};
ACT.ytPlay = (el) => {
  const v = ytFind(el.dataset.id);
  let i = YT.queue.indexOf(v);
  if (i < 0) {
    YT.queue.push(v);
    i = YT.queue.length - 1;
  }
  pbPlay(PLAYERS.yt, i);
};
ACT.ytEnqueue = (el) => {
  YT.queue.push(ytFind(el.dataset.id));
  render();
};
ACT.ytRemove = (el) => {
  const i = +el.dataset.i;
  const pb = PLAYERS.yt.pb;
  YT.queue.splice(i, 1);
  if (i < pb.index || pb.index >= YT.queue.length)
    pb.index = Math.max(0, pb.index - 1);
  if (!YT.queue.length)
    pbPause(PLAYERS.yt);
  render();
};
ACT.ytDownload = (el) => {
  YT.downloading = el.dataset.id;
  render();
  setTimeout(() => {
    YT.downloading = null;
    YT.message = 'yt.serverdown';
    render();
  }, 900);
};
ACT.ytTip = () => {
  YT.tip = false;
  render();
};
ACT.ytVideo = () => {
  YT.showVideo = !YT.showVideo;
  render();
};
ACT.ytFull = () => document.getElementById('yt-host')?.requestFullscreen?.().catch(() => null);
CHANGE.ytQuality = (el) => (YT.quality = el.value);
ACT.ytToList = (el) => {
  if (!YT.playlists.length) {
    YT.message = 'yt.pl.pick';
    return render();
  }
  const list = YT.playlists.find((p) => p.id === YT.target) ?? YT.playlists[0];
  list.songs.push(ytFind(el.dataset.id));
  YT.openList = list.id;
  render();
};
SUBMIT.ytNewList = (form, data) => {
  const name = String(data.get('name')).trim();
  if (!name)
    return;
  const p = { id: 'pl' + Date.now(), name, songs: [] };
  YT.playlists.push(p);
  YT.target = p.id;
  YT.message = '';
  render();
};
SUBMIT.ytSaveQueue = (form, data) => {
  const name = String(data.get('name')).trim();
  if (!name)
    return;
  const p = { id: 'pl' + Date.now(), name, songs: YT.queue.slice() };
  YT.playlists.push(p);
  YT.target = p.id;
  YT.openList = p.id;
  render();
};
CHANGE.ytTarget = (el) => (YT.target = el.value);
CHANGE.ytRename = (el) => {
  const p = YT.playlists.find((x) => x.id === el.dataset.id);
  if (el.value.trim())
    p.name = el.value.trim();
  render();
};
ACT.ytPlayList = (el) => {
  YT.queue = YT.playlists.find((x) => x.id === el.dataset.id).songs.slice();
  pbPlay(PLAYERS.yt, 0);
};
ACT.ytDelList = (el) => {
  YT.playlists = YT.playlists.filter((x) => x.id !== el.dataset.id);
  if (YT.target === el.dataset.id)
    YT.target = YT.playlists[0]?.id ?? null;
  render();
};
ACT.ytMove = (el) => {
  const p = YT.playlists.find((x) => x.id === el.dataset.id);
  const i = +el.dataset.i;
  const j = i + +el.dataset.by;
  [p.songs[i], p.songs[j]] = [p.songs[j], p.songs[i]];
  YT.openList = p.id;
  render();
};
ACT.ytDelSong = (el) => {
  const p = YT.playlists.find((x) => x.id === el.dataset.id);
  p.songs.splice(+el.dataset.i, 1);
  YT.openList = p.id;
  render();
};

// #endregion

