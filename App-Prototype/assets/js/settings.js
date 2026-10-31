/* Settings page (/master). Moved from thakurg.html as it was; see App-Prototype/README.md for the page layout. */
'use strict';

// #region Settings (/master): every switch changes this prototype live, "Save" makes the draft the new saved state

const CFG = { unlocked: false, keySet: true, lockNotice: null, masterKey: '', saveNotice: null, saving: null, ytKeySet: false, ytNotice: null, player: 'creta', notice: null, importMessage: null, gaugeBad: false };
const clone = (o) => JSON.parse(JSON.stringify(o));
const pillHtml = (value) => `<span class="pill${value ? ' on' : ''}">${t(value ? 'cfg.on' : 'cfg.off')}</span>`;

/** Which saved sections differ from the draft. */
function pendingIn(section) {
  const a = S.settings;
  const b = S.saved;
  if (section === 'connection')
    return JSON.stringify(a.connection) !== JSON.stringify(b.connection);
  if (section === 'services')
    return JSON.stringify(a.services) !== JSON.stringify(b.services);
  const ids = FEATURES.filter((f) => f.group === section).map((f) => f.id);
  const featureDiff = ids.some((id) => a.features[id] !== b.features[id]);
  return section === 'speed' ? featureDiff || a.speed.gaugeStops.join() !== b.speed.gaugeStops.join() : featureDiff;
}

function changeCount() {
  let n = FEATURES.filter((f) => S.settings.features[f.id] !== S.saved.features[f.id]).length;
  if (S.settings.speed.gaugeStops.join() !== S.saved.speed.gaugeStops.join())
    n++;
  if (pendingIn('connection'))
    n++;
  if (pendingIn('services'))
    n++;
  return n;
}

function noticeHtml(section) {
  const n = CFG.saveNotice;
  return n && n.section === section ? `<p class="status${n.error ? ' bad' : ''}" role="${n.error ? 'alert' : 'status'}">${esc(n.text)}</p>` : '';
}

function saveButton(section, describedBy) {
  const pending = section === 'all' ? changeCount() : pendingIn(section);
  const label = t(CFG.saving === section ? 'cfg.save.saving' : section === 'all' ? 'cfg.save.all' : 'cfg.save');
  return `<button type="button" class="btn pri"${!pending || CFG.saving ? ' disabled' : ''}${pending ? '' : ` title="${t('cfg.save.nothing')}"`}${describedBy ? ` aria-describedby="${describedBy}"` : ''} data-act="cfgSave" data-s="${section}">${label}</button>`;
}

function switchRow(attrs, checked, label, help, diffHtml = '') {
  return `<li class="inset${diffHtml ? ' diff' : ''}"><label><input type="checkbox" role="switch"${checked ? ' checked' : ''} ${attrs} />
      <span class="txt"><b>${label}</b>${help ? `<small>${help}</small>` : ''}</span>${pillHtml(checked)}</label>${diffHtml}</li>`;
}

function cfgPage() {
  let html;
  if (!CFG.unlocked) {
    const isNew = !CFG.keySet;
    html = `<section class="card head" aria-labelledby="cfg-lock-h"><h1 id="cfg-lock-h">${t(isNew ? 'cfg.lock.new.h1' : 'cfg.lock.h1')}</h1><p class="lead">${t(isNew ? 'cfg.lock.new.lead' : 'cfg.lock.lead')}</p>
      <form class="setup inset" data-submit="cfgUnlock"><label class="stack"><span>${t('cfg.save.master')}</span><input name="pw" type="password" autocomplete="off" /></label>
        <div class="setup-actions"><button type="submit" class="btn pri">${t('cfg.lock.btn')}</button></div></form>
      ${CFG.lockNotice ? `<p class="status${CFG.lockNotice.error ? ' bad' : ''}" role="alert">${esc(CFG.lockNotice.text)}</p>` : ''}
      <p class="note">Prototype: any password of 6 or more characters opens this page.</p></section>`;
  } else {
    const n = changeCount();
    const groups = FEATURE_GROUPS.map((g) => {
      const items = FEATURES.filter((f) => f.group === g.id).map((f) => {
        const value = S.settings.features[f.id];
        const was = S.saved.features[f.id];
        return switchRow(`data-change="cfgFeature" data-id="${f.id}"`, value, esc(f.label), esc(f.help), value !== was ? `<small class="was">${t('cfg.default', { value: traw(was ? 'cfg.on' : 'cfg.off') })}</small>` : '');
      });
      const gauge = g.id === 'speed' ? `<div class="setup inset"><label class="stack"><span>${t('cfg.gauge')}</span><input type="text" inputmode="numeric" autocomplete="off" value="${S.settings.speed.gaugeStops.join(', ')}" aria-invalid="${CFG.gaugeBad}" data-change="cfgGauge" /></label>
          <small class="${CFG.gaugeBad ? 'was bad' : 'was'}">${t(CFG.gaugeBad ? 'cfg.gauge.bad' : 'cfg.gauge.help')}</small></div>` : '';
      return `<section class="card grp" aria-labelledby="cfg-${g.id}"><div class="sechead"><h2 id="cfg-${g.id}">${esc(g.label)}</h2>${saveButton(g.id, 'cfg-' + g.id)}</div>
        <p class="help">${esc(g.help)}</p>${noticeHtml(g.id)}<ul class="rows">${items.join('')}</ul>${gauge}</section>`;
    });
    const conn = S.settings.connection;
    const svc = S.settings.services;
    html = `<section class="card head" aria-labelledby="cfg-h1"><h1 id="cfg-h1">${t('cfg.h1')}</h1><p class="lead">${t('cfg.lead')}</p><p class="note">${t('cfg.note')}</p></section>
      <section class="card topbar" aria-labelledby="cfg-save-h"><h2 id="cfg-save-h" class="sr-only">${t('cfg.save.all')}</h2>
        <label class="stack"><span>${t('cfg.save.master')}</span><input id="cfg-key" type="password" autocomplete="off" value="${esc(CFG.masterKey)}" data-input="cfgKey" /><small class="help">${t('cfg.save.master.help')}</small></label>
        <div class="bar"><p class="status" role="status">${n ? t('cfg.changed', { n }) : t('cfg.nochange')}</p>
          <div class="acts"><button type="button" class="btn"${!n || CFG.saving ? ' disabled' : ''} data-act="cfgReset">${t('cfg.reset')}</button>${saveButton('all')}</div></div>${noticeHtml('all')}</section>
      ${groups.join('')}
      <section class="card grp" aria-labelledby="cfg-conn"><div class="sechead"><h2 id="cfg-conn">${t('cfg.conn.h')}</h2>${saveButton('connection', 'cfg-conn')}</div>${noticeHtml('connection')}
        <ul class="rows">${switchRow('data-change="cfgConnAll"', conn.enabled, t('cfg.conn.all'))}${CONN_FIELDS.map((f) => switchRow(`data-change="cfgConnField" data-id="${f}"`, conn.fields[f], t('conn.' + f))).join('')}</ul></section>
      <section class="card grp" aria-labelledby="cfg-svc"><div class="sechead"><h2 id="cfg-svc">${t('cfg.svc.h')}</h2>${saveButton('services', 'cfg-svc')}</div>${noticeHtml('services')}
        <ul class="rows">${switchRow('data-change="cfgSvcAll"', svc.enabled, t('cfg.svc.all'))}
          <li class="inset"><label class="stack"><span>${t('cfg.svc.refresh')}</span><input type="number" min="0" step="10" value="${svc.refreshSeconds}" data-change="cfgSecs" /></label></li>
          ${svc.items.map((s) => switchRow(`data-change="cfgSvc" data-id="${s.id}"`, s.enabled, esc(s.name))).join('')}</ul></section>
      <section class="card grp" aria-labelledby="cfg-yt"><h2 id="cfg-yt">${t('cfg.yt.h')}</h2><p class="help">${t('cfg.yt.lead')}</p>
        <p class="status" role="status">${t(CFG.ytKeySet ? 'cfg.yt.set' : 'cfg.yt.notset')}</p>
        <form class="setup inset" data-submit="cfgYt"><label class="stack"><span>${t('cfg.yt.label')}</span><input name="key" type="password" autocomplete="off" spellcheck="false" /></label>
          <div class="setup-actions"><button type="submit" class="btn pri">${t('cfg.yt.save')}</button></div></form>
        ${CFG.ytNotice ? `<p class="status${CFG.ytNotice.error ? ' bad' : ''}" role="status">${esc(CFG.ytNotice.text)}</p>` : ''}</section>
      <section class="card grp" aria-labelledby="cfg-pw"><h2 id="cfg-pw">${t('cfg.pw.h')}</h2><p class="help">${t('cfg.pw.help')}</p>
        <label class="stack"><span>${t('cfg.pw.player')}</span><select data-change="cfgPlayer">${['creta', 'nexon'].map((p) => `<option value="${p}"${p === CFG.player ? ' selected' : ''}>${pageName(p)}</option>`).join('')}</select></label>
        <form class="pw" data-submit="cfgPwChange" autocomplete="off"><h3>${t('cfg.pw.change.h', { name: PAGES[S.lang][CFG.player] })}</h3>
          <div class="fields"><label class="stack"><span>${t('cfg.pw.current')}</span><input type="password" name="secret" required autocomplete="current-password" /></label>
            <label class="stack"><span>${t('cfg.pw.new')}</span><input type="password" name="next" required minlength="6" maxlength="64" pattern="[!-~]{6,64}" autocomplete="new-password" /></label>
            <label class="stack"><span>${t('cfg.pw.confirm')}</span><input type="password" name="confirm" required minlength="6" maxlength="64" pattern="[!-~]{6,64}" autocomplete="new-password" /></label></div>
          <div class="bar"><p class="help">${t('cfg.pw.rule')}</p><button type="submit" class="btn pri">${t('cfg.pw.change.btn')}</button></div></form>
        <form class="pw" data-submit="cfgPwReset" autocomplete="off"><h3>${t('cfg.pw.reset.h', { name: PAGES[S.lang][CFG.player] })}</h3>
          <div class="fields"><label class="stack"><span>${t('cfg.pw.new')}</span><input type="password" name="next" required minlength="6" maxlength="64" pattern="[!-~]{6,64}" autocomplete="new-password" /></label>
            <label class="stack"><span>${t('cfg.pw.confirm')}</span><input type="password" name="confirm" required minlength="6" maxlength="64" pattern="[!-~]{6,64}" autocomplete="new-password" /></label></div>
          <div class="bar"><p class="help">${t('cfg.pw.rule')}</p><button type="submit" class="btn pri">${t('cfg.pw.reset.btn')}</button></div></form>
        ${CFG.notice ? `<p class="status${CFG.notice.error ? ' bad' : ''}" role="${CFG.notice.error ? 'alert' : 'status'}">${esc(CFG.notice.text)}</p>` : ''}</section>
      <section class="card grp" aria-labelledby="cfg-json"><h2 id="cfg-json">${t('cfg.json.h')}</h2><p class="help">${t('cfg.json.help')}</p>
        <label class="sr-only" for="cfg-json-box">${t('cfg.json.h')}</label><textarea id="cfg-json-box" rows="10" spellcheck="false">${esc(JSON.stringify(S.settings, null, 2))}</textarea>
        <div class="bar">${CFG.importMessage ? `<p class="status${CFG.importMessage === 'bad' ? ' bad' : ''}" role="${CFG.importMessage === 'bad' ? 'alert' : 'status'}">${t(CFG.importMessage === 'ok' ? 'cfg.json.ok' : 'cfg.json.bad')}</p>` : ''}
          <button type="button" class="btn pri" data-act="cfgImport">${t('cfg.json.import')}</button></div></section>`;
  }
  return { title: traw('seo.cfg.title'), html: host('sc-cfg', `<div class="wrap page">${html}</div>`) };
}

const isKey = (v) => /^[!-~]{6,64}$/.test(v);

SUBMIT.cfgUnlock = (form, data) => {
  if (!isKey(String(data.get('pw')))) {
    CFG.lockNotice = { error: true, text: msg('MASTER_KEY_INVALID') };
    return render();
  }
  CFG.masterKey = String(data.get('pw'));
  CFG.unlocked = true;
  render();
};
INPUT.cfgKey = (el) => (CFG.masterKey = el.value);
CHANGE.cfgFeature = (el) => {
  S.settings.features[el.dataset.id] = el.checked;
  render();
};
CHANGE.cfgGauge = (el) => {
  const stops = el.value.split(',').map((x) => x.trim()).filter(Boolean).map(Number);
  const ok = stops.length >= 2 && stops.length <= 20 && stops[0] === 0 && stops.every((v, i) => Number.isInteger(v) && (i === 0 || v > stops[i - 1]));
  CFG.gaugeBad = !ok;
  if (ok)
    S.settings.speed.gaugeStops = stops;
  render();
};
CHANGE.cfgConnAll = (el) => {
  S.settings.connection.enabled = el.checked;
  render();
};
CHANGE.cfgConnField = (el) => {
  S.settings.connection.fields[el.dataset.id] = el.checked;
  render();
};
CHANGE.cfgSvcAll = (el) => {
  S.settings.services.enabled = el.checked;
  render();
};
CHANGE.cfgSvc = (el) => {
  S.settings.services.items.find((s) => s.id === el.dataset.id).enabled = el.checked;
  render();
};
CHANGE.cfgSecs = (el) => {
  S.settings.services.refreshSeconds = Math.max(0, Math.round(+el.value || 0));
  render();
};
ACT.cfgReset = () => {
  S.settings = clone(S.saved);
  CFG.gaugeBad = false;
  CFG.saveNotice = null;
  render();
};

/** Saving copies the draft of one section (or all) to the saved settings, after a short pause like a real request. */
ACT.cfgSave = (el) => {
  const section = el.dataset.s;
  if (!isKey(CFG.masterKey)) {
    CFG.saveNotice = { section, error: true, text: traw('cfg.save.nokey') };
    return render();
  }
  CFG.saving = section;
  render();
  setTimeout(() => {
    if (section === 'all') {
      S.saved = clone(S.settings);
    } else if (section === 'connection' || section === 'services') {
      S.saved[section] = clone(S.settings[section]);
    } else {
      FEATURES.filter((f) => f.group === section).forEach((f) => (S.saved.features[f.id] = S.settings.features[f.id]));
      if (section === 'speed')
        S.saved.speed = clone(S.settings.speed);
    }
    CFG.saving = null;
    CFG.saveNotice = { section, error: false, text: msg('SETTINGS_SAVED') };
    render();
  }, 500);
};
SUBMIT.cfgYt = (form, data) => {
  const key = String(data.get('key')).trim();
  CFG.ytNotice = key.length >= 20 ? { error: false, text: msg('YOUTUBE_KEY_SAVED') } : { error: true, text: msg('YOUTUBE_KEY_REJECTED') };
  if (!CFG.ytNotice.error)
    CFG.ytKeySet = true;
  render();
};
CHANGE.cfgPlayer = (el) => {
  CFG.player = el.value;
  CFG.notice = null;
  render();
};
SUBMIT.cfgPwChange = (form, data) => {
  if (data.get('next') !== data.get('confirm'))
    CFG.notice = { error: true, text: traw('cfg.pw.mismatch') };
  else if (!isKey(String(data.get('next'))))
    CFG.notice = { error: true, text: msg('MUSIC_PASSWORD_WEAK') };
  else
    CFG.notice = { error: false, text: msg('MUSIC_PASSWORD_CHANGED') };
  render();
};
SUBMIT.cfgPwReset = (form, data) => {
  if (data.get('next') !== data.get('confirm'))
    CFG.notice = { error: true, text: traw('cfg.pw.mismatch') };
  else if (!isKey(String(data.get('next'))))
    CFG.notice = { error: true, text: msg('MUSIC_PASSWORD_WEAK') };
  else
    CFG.notice = { error: false, text: msg('MUSIC_PASSWORD_RESET') };
  render();
};
ACT.cfgImport = () => {
  try {
    const next = JSON.parse(document.getElementById('cfg-json-box').value);
    if (!next || typeof next.features !== 'object' || !next.connection || !next.services || !next.speed)
      throw new Error('shape');
    S.settings = Object.assign(defaultSettings(), next);
    CFG.importMessage = 'ok';
  } catch {
    CFG.importMessage = 'bad';
  }
  render();
};

// #endregion

