/* Add songs (creta-add / nexon-add). Moved from thakurg.html as it was; see App-Prototype/README.md for the page layout. */
'use strict';

// #region Add songs (creta-add / nexon-add)

const ADD = { creta: { status: null }, nexon: { status: null } };

function addPage(id) {
  const st = ADD[id];
  const list = TRACKS[id];
  return {
    title: traw('creta.add.h1'),
    html: host('sc-add', `<div class="wrap page"><section class="card add" aria-labelledby="add-h1"><h1 id="add-h1">${t('creta.add.h1')}</h1>
      <p class="lead">${t('creta.add.lead', { name: PAGES[S.lang][id] })}</p>
      <form class="setup inset" data-submit="upload" data-p="${id}">
        <label>${t('creta.edit.password')}<input name="pw" type="password" autocomplete="off" /></label>
        <label>${t('creta.edit.pick')}<input name="files" type="file" accept="audio/*,.mp3,.m4a,.aac,.ogg,.opus,.wav,.flac" multiple /></label>
        <div class="setup-actions"><button type="submit" class="btn pri">${t('creta.edit.upload')}</button><a class="btn" href="${link('/' + id)}">${t('creta.add.back')}</a></div>
      </form>
      ${st.status ? `<p class="status${st.status.error ? ' bad' : ''}" role="${st.status.error ? 'alert' : 'status'}">${esc(st.status.text)}</p>` : ''}
    </section>
    <section class="card list" aria-labelledby="cur-h"><h2 id="cur-h">${t('creta.add.current')}</h2>
      ${list.length ? `<ol>${list.map((tr, i) => `<li><span class="n" aria-hidden="true">${i + 1}</span><span class="tt"><b>${esc(tr.title)}</b>${tr.artist ? `<small>${esc(tr.artist)}</small>` : ''}</span></li>`).join('')}</ol>` : `<p class="note">${t('creta.edit.none')}</p>`}
    </section></div>`),
  };
}

/** The files stay in the browser: their names are added to the playlist, the sound is the demo synthesiser. */
SUBMIT.upload = (form, data) => {
  const id = form.dataset.p;
  const files = data.getAll('files').filter((f) => f && f.name);
  if (!String(data.get('pw')).trim())
    ADD[id].status = { error: true, text: msg('MUSIC_PASSWORD_INVALID') };
  else if (!files.length)
    ADD[id].status = { error: true, text: msg('MUSIC_NO_FILES') };
  else {
    const bad = files.find((f) => !/\.(mp3|m4a|aac|ogg|oga|opus|wav|flac|weba)$/i.test(f.name));
    if (bad) {
      ADD[id].status = { error: true, text: msg('MUSIC_FILE_TYPE_INVALID', bad.name.split('.').pop()) };
    } else {
      files.forEach((f, i) => TRACKS[id].push({ id: `${id}-u${Date.now()}${i}`, title: f.name.replace(/\.[^.]+$/, ''), artist: '', seed: TRACKS[id].length + 20 + i, duration: 120 + i * 13 }));
      ADD[id].status = { error: false, text: msg('MUSIC_TRACKS_UPLOADED', files.length) };
    }
  }
  render();
};

// #endregion

