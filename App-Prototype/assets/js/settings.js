/* Settings page (/master). Moved from thakurg.html as it was; see App-Prototype/README.md for the page layout. */
'use strict';

// #region Settings (/master): every switch changes this prototype live, "Save" makes the draft the new saved state

// Common login: /master needs a login; saving, the YouTube key and Users & access are for administrators (the master key and player passwords are gone).
const CFG = { saveNotice: null, saving: null, ytKeySet: false, ytNotice: null, importMessage: null, gaugeBad: false, drafts: {}, userNotice: null, userSaving: null };
const isAdmin = () => !!AUTH.current()?.isAdmin;
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
  const pending = isAdmin() && (section === 'all' ? changeCount() : pendingIn(section));
  const label = t(CFG.saving === section ? 'cfg.save.saving' : section === 'all' ? 'cfg.save.all' : 'cfg.save');
  return `<button type="button" class="btn pri"${!pending || CFG.saving ? ' disabled' : ''}${pending ? '' : ` title="${t('cfg.save.nothing')}"`}${describedBy ? ` aria-describedby="${describedBy}"` : ''} data-act="cfgSave" data-s="${section}">${label}</button>`;
}

function switchRow(attrs, checked, label, help, diffHtml = '') {
  return `<li class="inset${diffHtml ? ' diff' : ''}"><label><input type="checkbox" role="switch"${checked ? ' checked' : ''} ${attrs} />
      <span class="txt"><b>${label}</b>${help ? `<small>${help}</small>` : ''}</span>${pillHtml(checked)}</label>${diffHtml}</li>`;
}

function cfgPage() {
  const admin = isAdmin();
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
  const html = `<section class="card head" aria-labelledby="cfg-h1"><h1 id="cfg-h1">${t('cfg.h1')}</h1><p class="lead">${t('cfg.lead')}</p><p class="note">${t('cfg.note')}</p></section>
    <section class="card topbar" aria-labelledby="cfg-save-h"><h2 id="cfg-save-h" class="sr-only">${t('cfg.save.all')}</h2>
      ${admin ? '' : `<p class="status bad" role="note">${t('auth.adminOnly')}</p>`}
      <div class="bar"><p class="status" role="status">${n ? t('cfg.changed', { n }) : t('cfg.nochange')}</p>
        <div class="acts"><button type="button" class="btn"${!n || CFG.saving ? ' disabled' : ''} data-act="cfgReset">${t('cfg.reset')}</button>${saveButton('all')}</div></div>${noticeHtml('all')}</section>
    ${admin ? usersPanelHtml() : ''}
    ${groups.join('')}
    <section class="card grp" aria-labelledby="cfg-conn"><div class="sechead"><h2 id="cfg-conn">${t('cfg.conn.h')}</h2>${saveButton('connection', 'cfg-conn')}</div>${noticeHtml('connection')}
      <ul class="rows">${switchRow('data-change="cfgConnAll"', conn.enabled, t('cfg.conn.all'))}${CONN_FIELDS.map((f) => switchRow(`data-change="cfgConnField" data-id="${f}"`, conn.fields[f], t('conn.' + f))).join('')}</ul></section>
    <section class="card grp" aria-labelledby="cfg-svc"><div class="sechead"><h2 id="cfg-svc">${t('cfg.svc.h')}</h2>${saveButton('services', 'cfg-svc')}</div>${noticeHtml('services')}
      <ul class="rows">${switchRow('data-change="cfgSvcAll"', svc.enabled, t('cfg.svc.all'))}
        <li class="inset"><label class="stack"><span>${t('cfg.svc.refresh')}</span><input type="number" min="0" step="10" value="${svc.refreshSeconds}" data-change="cfgSecs" /></label></li>
        ${svc.items.map((s) => switchRow(`data-change="cfgSvc" data-id="${s.id}"`, s.enabled, esc(s.name))).join('')}</ul></section>
    <section class="card grp" aria-labelledby="cfg-yt"><h2 id="cfg-yt">${t('cfg.yt.h')}</h2><p class="help">${t('cfg.yt.lead')}</p>
      <p class="status" role="status">${t(CFG.ytKeySet ? 'cfg.yt.set' : 'cfg.yt.notset')}</p>
      ${admin ? `<form class="setup inset" data-submit="cfgYt"><label class="stack"><span>${t('cfg.yt.label')}</span><input name="key" type="password" autocomplete="off" spellcheck="false" /></label>
        <div class="setup-actions"><button type="submit" class="btn pri">${t('cfg.yt.save')}</button></div></form>` : `<p class="note">${t('auth.adminOnly.yt')}</p>`}
      ${CFG.ytNotice ? `<p class="status${CFG.ytNotice.error ? ' bad' : ''}" role="status">${esc(CFG.ytNotice.text)}</p>` : ''}</section>
    <section class="card grp" aria-labelledby="cfg-json"><h2 id="cfg-json">${t('cfg.json.h')}</h2><p class="help">${t('cfg.json.help')}</p>
      <label class="sr-only" for="cfg-json-box">${t('cfg.json.h')}</label><textarea id="cfg-json-box" rows="10" spellcheck="false">${esc(JSON.stringify(S.settings, null, 2))}</textarea>
      <div class="bar">${CFG.importMessage ? `<p class="status${CFG.importMessage === 'bad' ? ' bad' : ''}" role="${CFG.importMessage === 'bad' ? 'alert' : 'status'}">${t(CFG.importMessage === 'ok' ? 'cfg.json.ok' : 'cfg.json.bad')}</p>` : ''}
        <button type="button" class="btn pri" data-act="cfgImport">${t('cfg.json.import')}</button></div></section>`;
  return { title: traw('seo.cfg.title'), html: host('sc-cfg', `<div class="wrap page">${html}</div>`) };
}

/** Users & access (administrators): one row per account with its administrator switch and one tick per app, saved per person (PUT /admin/users/{id}). */
function usersPanelHtml() {
  const r = AUTH.access();
  if (!r.ok)
    return '';
  const me = AUTH.current();
  const rows = r.data.users.map((u) => {
    const d = CFG.drafts[u.id] || { isAdmin: u.isAdmin, apps: u.apps.slice() };
    const dirty = d.isAdmin !== u.isAdmin || d.apps.slice().sort().join() !== u.apps.slice().sort().join();
    const notice = CFG.userNotice && CFG.userNotice.id === u.id ? `<p class="status${CFG.userNotice.error ? ' bad' : ''}" role="${CFG.userNotice.error ? 'alert' : 'status'}">${esc(CFG.userNotice.text)}</p>` : '';
    const apps = r.data.apps.map((a) => `<label class="chk"><input type="checkbox"${d.apps.includes(a.code) ? ' checked' : ''} data-change="cfgUserApp" data-id="${u.id}" data-app="${a.code}" /><span>${t('auth.app.' + a.code)}${a.autoGrant ? `<small>${t('auth.users.auto')}</small>` : ''}</span></label>`).join('');
    return `<li class="inset user${dirty ? ' diff' : ''}"><div class="who"><b>${esc(u.displayName)}${me && me.id === u.id ? ` <small>(${t('auth.users.you')})</small>` : ''}</b><small dir="ltr">${esc(u.email)}</small></div>
      <label class="chk admin"><input type="checkbox" role="switch"${d.isAdmin ? ' checked' : ''} data-change="cfgUserAdmin" data-id="${u.id}" /><span><b>${t('auth.users.admin')}</b><small>${t('auth.users.adminHelp')}</small></span></label>
      <fieldset class="apps"><legend class="sr-only">${t('auth.users.apps', { email: u.email })}</legend>${apps}</fieldset>
      <div class="acts"><button type="button" class="btn pri sm"${dirty && !CFG.userSaving ? '' : ' disabled'} data-act="cfgUserSave" data-id="${u.id}">${t(CFG.userSaving === u.id ? 'auth.users.saving' : 'auth.users.save')}</button>${notice}</div></li>`;
  });
  return `<section class="card grp" aria-labelledby="cfg-users"><h2 id="cfg-users">${t('auth.users.h')}</h2><p class="help">${t('auth.users.lead')}</p>
    <ul class="users">${rows.join('')}</ul></section>`;
}

/** The draft of one user's access, made from the saved account the first time it is changed. */
function userDraft(id) {
  if (!CFG.drafts[id]) {
    const u = AUTH.access().data.users.find((x) => x.id === id);
    CFG.drafts[id] = { isAdmin: u.isAdmin, apps: u.apps.slice() };
  }
  return CFG.drafts[id];
}

CHANGE.cfgUserAdmin = (el) => {
  userDraft(+el.dataset.id).isAdmin = el.checked;
  render();
};
CHANGE.cfgUserApp = (el) => {
  const d = userDraft(+el.dataset.id);
  d.apps = d.apps.filter((code) => code !== el.dataset.app);
  if (el.checked)
    d.apps.push(el.dataset.app);
  render();
};
ACT.cfgUserSave = (el) => {
  const id = +el.dataset.id;
  const d = userDraft(id);
  CFG.userSaving = id;
  render();
  setTimeout(() => {
    const r = AUTH.setAccess(id, d.isAdmin, d.apps);
    CFG.userSaving = null;
    CFG.userNotice = { id, error: !r.ok, text: msg(r.code, ...(r.args || [])) };
    if (r.ok)
      delete CFG.drafts[id];
    // An administrator who removed their own flag (another one remains) now sees the page as a user does.
    render();
  }, 400);
};
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
  if (!isAdmin()) {
    CFG.saveNotice = { section, error: true, text: msg('AUTH_FORBIDDEN') };
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
  if (!isAdmin())
    CFG.ytNotice = { error: true, text: msg('AUTH_FORBIDDEN') };
  else if (key.length >= 20)
    CFG.ytNotice = { error: false, text: msg('YOUTUBE_KEY_SAVED') };
  else
    CFG.ytNotice = { error: true, text: msg('YOUTUBE_KEY_REJECTED') };
  if (!CFG.ytNotice.error)
    CFG.ytKeySet = true;
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

