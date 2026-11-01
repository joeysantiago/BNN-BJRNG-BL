/* Common login screens of the thakurg.com pages that draw through core.js: the user menu in the site header, the "log in" / "no access" panel shown instead of
   a protected page, and the Log in, Sign up and Profile screens (/login, /signup, /profile, page file pages/account.html). The accounts are in auth.js. */
'use strict';

// #region Common login

const ACC = { menuOpen: false, busy: false, notice: null, email: '', name: '', profileNotice: null, pwNotice: null };
const ACC_ICONS = {
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1"/>',
  lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  eyeOff: '<path d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4M6.1 6.1A17 17 0 0 0 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.9-2"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
  sliders: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
};
const accIcon = (name, size = 18) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ACC_ICONS[name]}</svg>`;
const accNotice = (n) => (n ? `<p class="status${n.error ? ' bad' : ''}" role="${n.error ? 'alert' : 'status'}">${esc(n.text)}</p>` : '');
const accResult = (r) => msg(r.code, ...(r.args || []));

/** Where to go after logging in: an address of this site, never the login screens themselves. */
function accNext() {
  const next = S.route.query.next || '';
  return next.startsWith('/') && !next.startsWith('//') && !/^\/(login|signup)(\?|$)/.test(next) ? next : '/profile';
}

/** The current address, so the login screens can come back here. */
const accHere = () => (location.hash.startsWith('#/') ? location.hash.slice(1) : S.route.path);
const accLoginLink = (screen, next) => link(`/${screen}${next ? '?next=' + encodeURIComponent(next) : ''}`);

/** The user menu in the top-right of the site header: Log in when logged out; the name with Profile, Master (administrators) and Log out when logged in. */
function authMenuHtml() {
  const me = AUTH.current();
  if (!me) {
    if (/^\/(login|signup)$/.test(S.route.path))
      return '';
    return `<a class="btn sm acc-login" href="${accLoginLink('login', AUTH.need(S.route.path) ? accHere() : '')}">${accIcon('user')}<span>${t('auth.login')}</span></a>`;
  }
  const items = `<p class="acc-who"><b>${esc(me.displayName)}</b><small>${esc(me.email)}</small></p>
      <a class="skin-opt" href="${link('/profile')}">${accIcon('user')}<span>${t('auth.profile')}</span></a>
      ${me.isAdmin ? `<a class="skin-opt" href="${link('/master')}">${accIcon('sliders')}<span>${t('auth.master')}</span></a>` : ''}
      <button type="button" class="skin-opt" data-act="authLogout">${accIcon('logout')}<span>${t('auth.logout')}</span></button>`;
  return `<div class="menu acc-menu"><button type="button" class="btn sm acc-btn${ACC.menuOpen ? ' is-on' : ''}" aria-haspopup="true" aria-expanded="${ACC.menuOpen}" aria-controls="acc-pop" aria-label="${t('auth.menu', { name: me.displayName })}" data-act="authMenu">
      <span class="acc-avatar" aria-hidden="true">${esc(me.displayName.slice(0, 1).toUpperCase())}</span><span class="acc-name">${esc(me.displayName)}</span></button>
    ${ACC.menuOpen ? `<div class="pop card acc-pop" id="acc-pop">${items}</div>` : ''}</div>`;
}

/** The panel shown instead of a page that needs a login (or an app the account cannot open). null when the page may be shown. */
function authGate(path) {
  const why = AUTH.blocked(path);
  if (!why)
    return null;
  const need = AUTH.need(path);
  const name = traw('auth.app.' + need.name);
  const here = accHere();
  let html;
  if (why === 'login') {
    html = `<h1 id="gate-h1">${t('auth.gate.login.h1', { name })}</h1><p class="msg">${t('auth.gate.login.lead', { name })}</p>
      <div class="acts"><a class="btn pri lg" href="${accLoginLink('login', here)}">${t('auth.login')}</a><a class="btn lg" href="${accLoginLink('signup', here)}">${t('auth.signup')}</a></div>`;
  } else {
    html = `<h1 id="gate-h1">${t('auth.gate.denied.h1', { name })}</h1><p class="msg" role="alert">${esc(msg('AUTH_FORBIDDEN'))}</p>
      <p class="msg">${t('auth.gate.signedAs', { email: AUTH.current().email })}</p>
      <div class="acts"><a class="btn pri lg" href="${link('/profile')}">${t('auth.gate.apps')}</a><button type="button" class="btn lg" data-act="authSwitch">${t('auth.gate.switch')}</button></div>`;
  }
  return {
    title: traw(why === 'login' ? 'auth.gate.login.h1' : 'auth.gate.denied.h1', { name }),
    html: host('sc-acc', `<div class="wrap page"><section class="card gate" aria-labelledby="gate-h1"><p class="lock inset" aria-hidden="true">${accIcon('lock', 40)}</p>${html}</section></div>`),
  };
}

const passwordField = (id, name, label, autocomplete, hint) => `<label class="stack" for="${id}"><span>${label}</span>
    <span class="acc-pw"><input id="${id}" name="${name}" type="password" autocomplete="${autocomplete}" required${autocomplete === 'current-password' ? '' : ` minlength="${AUTH.MIN_PASSWORD}"`} spellcheck="false" />
      <button type="button" class="btn sm icon" data-act="authEye" data-for="${id}" aria-label="${t('auth.show')}" aria-pressed="false">${accIcon('eye')}</button></span>
    ${hint ? `<small class="help">${hint}</small>` : ''}</label>`;

/** /login and /signup. */
function accFormHtml(kind) {
  const signup = kind === 'signup';
  const next = S.route.query.next;
  const other = signup ? 'login' : 'signup';
  const busy = ACC.busy ? ' disabled' : '';
  const demo = signup ? '' : `<aside class="card acc-demo" aria-labelledby="demo-h"><h2 id="demo-h">${t('auth.demo.h')}</h2><p class="help">${t('auth.demo.lead')}</p>
      <ul>${AUTH.DEMO.map((d) => `<li><button type="button" class="btn acc-use" data-act="authDemo" data-e="${esc(d.email)}" data-p="${esc(d.password)}" aria-label="${t('auth.demo.use', { email: d.email })}"><b>${t(d.isAdmin ? 'auth.demo.admin' : 'auth.demo.user')}</b><span dir="ltr">${esc(d.email)} / ${esc(d.password)}</span></button></li>`).join('')}</ul></aside>`;
  return `<section class="card acc-card" aria-labelledby="acc-h1"><h1 id="acc-h1">${t(signup ? 'auth.signup.h1' : 'auth.login.h1')}</h1><p class="lead">${t(signup ? 'auth.signup.lead' : 'auth.login.lead')}</p>
      <form class="acc-form" data-submit="${signup ? 'authSignup' : 'authLogin'}" novalidate>
        <label class="stack" for="acc-email"><span>${t('auth.email')}</span><input id="acc-email" name="email" type="email" inputmode="email" autocomplete="${signup ? 'email' : 'username'}" required spellcheck="false" dir="ltr" value="${esc(ACC.email)}" /></label>
        ${signup ? `<label class="stack" for="acc-name"><span>${t('auth.name')}</span><input id="acc-name" name="name" type="text" autocomplete="nickname" maxlength="100" value="${esc(ACC.name)}" /><small class="help">${t('auth.name.hint')}</small></label>` : ''}
        ${passwordField('acc-pw', 'password', t('auth.password'), signup ? 'new-password' : 'current-password', signup ? t('auth.password.rule', { min: AUTH.MIN_PASSWORD }) : '')}
        ${accNotice(ACC.notice)}
        <button type="submit" class="btn pri lg acc-submit"${busy}>${t(ACC.busy ? 'auth.busy' : signup ? 'auth.signup.btn' : 'auth.login.btn')}</button>
      </form>
      <p class="acc-switch"><a href="${accLoginLink(other, next)}">${t(signup ? 'auth.signup.toLogin' : 'auth.login.toSignup')}</a></p></section>${demo}`;
}

/** /profile: display name, language, password, apps and log out. */
function accProfileHtml(me) {
  const apps = AUTH.APPS.map((a) => {
    const open = me.isAdmin || me.apps.includes(a.code);
    return `<li class="inset"><span class="tt"><b>${t('auth.app.' + a.code)}</b>${a.autoGrant ? `<small>${t('auth.users.auto')}</small>` : ''}</span>
      ${open ? `<a class="btn sm" href="${link(a.home)}">${t('auth.apps.open')}</a>` : `<span class="pill">${t('auth.apps.none')}</span>`}</li>`;
  }).join('');
  return `<section class="card acc-head" aria-labelledby="acc-h1"><span class="acc-avatar lg" aria-hidden="true">${esc(me.displayName.slice(0, 1).toUpperCase())}</span>
      <div><h1 id="acc-h1">${t('auth.profile.h1')}</h1><p class="lead">${t('auth.profile.lead', { email: me.email })}</p>${me.isAdmin ? `<span class="pill on">${t('auth.profile.admin')}</span>` : ''}</div></section>
    <form class="card acc-form" data-submit="authProfile" aria-labelledby="det-h" novalidate><h2 id="det-h">${t('auth.profile.details')}</h2>
      <div class="fields"><label class="stack" for="acc-dn"><span>${t('auth.name')}</span><input id="acc-dn" name="name" type="text" autocomplete="nickname" maxlength="100" required value="${esc(me.displayName)}" /></label>
        <label class="stack" for="acc-lang"><span>${t('auth.language')}</span><select id="acc-lang" name="language">${LANGS.map((l) => `<option value="${l.code}"${l.code === me.language ? ' selected' : ''}>${l.native}</option>`).join('')}</select></label></div>
      ${accNotice(ACC.profileNotice)}
      <div class="acts"><button type="submit" class="btn pri">${t('auth.profile.save')}</button></div></form>
    <form class="card acc-form" data-submit="authPassword" aria-labelledby="pw-h" novalidate><h2 id="pw-h">${t('auth.pw.h')}</h2><p class="help">${t('auth.pw.lead')}</p>
      <input type="email" name="username" autocomplete="username" value="${esc(me.email)}" hidden />
      <div class="fields">${passwordField('acc-cur', 'current', t('auth.password.current'), 'current-password', '')}${passwordField('acc-new', 'next', t('auth.password.new'), 'new-password', t('auth.password.rule', { min: AUTH.MIN_PASSWORD }))}</div>
      ${accNotice(ACC.pwNotice)}
      <div class="acts"><button type="submit" class="btn pri">${t('auth.pw.btn')}</button></div></form>
    <section class="card" aria-labelledby="apps-h"><h2 id="apps-h">${t('auth.apps.h')}</h2><p class="help">${t(me.isAdmin ? 'auth.apps.adminLead' : 'auth.apps.lead')}</p>
      <ul class="acc-apps">${apps}${me.isAdmin ? `<li class="inset"><span class="tt"><b>${t('auth.app.master')}</b><small>/master</small></span><a class="btn sm" href="${link('/master')}">${t('auth.apps.open')}</a></li>` : ''}</ul></section>
    <section class="card acc-out" aria-labelledby="out-h"><div><h2 id="out-h">${t('auth.logout.h')}</h2><p class="help">${t('auth.logout.lead')}</p></div>
      <button type="button" class="btn" data-act="authLogout">${accIcon('logout')}${t('auth.logout')}</button></section>`;
}

/** The view of /login, /signup and /profile (the profile itself is behind authGate). */
function accountPage(kind) {
  const me = AUTH.current();
  let html;
  if (kind === 'profile')
    html = accProfileHtml(me);
  else if (me)
    html = `<section class="card acc-card" aria-labelledby="acc-h1"><h1 id="acc-h1">${t('auth.signed.h1')}</h1><p class="lead">${t('auth.signed.lead', { email: me.email })}</p>
      <div class="acts"><a class="btn pri lg" href="${link(accNext())}">${t('auth.continue')}</a><button type="button" class="btn lg" data-act="authLogout">${t('auth.logout')}</button></div></section>`;
  else
    html = accFormHtml(kind);
  return {
    title: traw('seo.' + kind + '.title'),
    html: host('sc-acc', `<div class="wrap page${kind === 'profile' ? '' : ' narrow'}">${html}</div>`),
    after() {
      if (kind !== 'profile' && !me && document.activeElement === document.body)
        document.getElementById(ACC.email ? 'acc-pw' : 'acc-email')?.focus();
    },
  };
}

/** Requests take a moment, like the real API, so the busy state can be seen. */
function accSubmit(run) {
  ACC.busy = true;
  ACC.notice = null;
  render();
  setTimeout(() => {
    ACC.busy = false;
    const r = run();
    if (!r.ok) {
      ACC.notice = { error: true, text: accResult(r) };
      render();
      document.getElementById('acc-pw')?.focus();
      return;
    }
    ACC.email = '';
    ACC.name = '';
    ACC.notice = null;
    if (r.data.language !== S.lang)
      setLang(r.data.language, false);
    go(accNext(), true);
  }, 450);
}

SUBMIT.authLogin = (form, data) => {
  ACC.email = String(data.get('email')).trim();
  accSubmit(() => AUTH.login(ACC.email, String(data.get('password'))));
};
SUBMIT.authSignup = (form, data) => {
  ACC.email = String(data.get('email')).trim();
  ACC.name = String(data.get('name'));
  accSubmit(() => AUTH.register(ACC.email, String(data.get('password')), ACC.name, S.lang));
};
SUBMIT.authProfile = (form, data) => {
  const r = AUTH.updateMe(String(data.get('name')), String(data.get('language')));
  ACC.profileNotice = { error: !r.ok, text: accResult(r) };
  ACC.pwNotice = null;
  if (r.ok && r.data.language !== S.lang)
    return setLang(r.data.language);
  render();
};
SUBMIT.authPassword = (form, data) => {
  const r = AUTH.changePassword(String(data.get('current')), String(data.get('next')));
  ACC.pwNotice = { error: !r.ok, text: accResult(r) };
  ACC.profileNotice = null;
  render();
};

/** Fills the login form with a demo account (prototype only). */
ACT.authDemo = (el) => {
  document.getElementById('acc-email').value = el.dataset.e;
  document.getElementById('acc-pw').value = el.dataset.p;
  ACC.email = el.dataset.e;
  document.querySelector('.acc-submit')?.focus();
};

/** Show / hide a password without redrawing the form, so what was typed stays. */
ACT.authEye = (el) => {
  const input = document.getElementById(el.dataset.for);
  const show = input.type === 'password';
  input.type = show ? 'text' : 'password';
  el.setAttribute('aria-pressed', String(show));
  el.setAttribute('aria-label', traw(show ? 'auth.hide' : 'auth.show'));
  el.innerHTML = accIcon(show ? 'eyeOff' : 'eye');
};

ACT.authMenu = () => {
  ACC.menuOpen = !ACC.menuOpen;
  S.themeOpen = false;
  render();
};

/** Log out: the profile goes to the login screen with the API's message; any other page redraws (a protected one then shows its "log in" panel). */
ACT.authLogout = () => {
  const r = AUTH.logout();
  ACC.menuOpen = false;
  ACC.profileNotice = null;
  ACC.pwNotice = null;
  if (/^\/(profile|login|signup)$/.test(S.route.path)) {
    ACC.notice = { error: false, text: accResult(r) };
    return go('/login', true);
  }
  render();
};
ACT.authSwitch = () => {
  AUTH.logout();
  go('/login?next=' + encodeURIComponent(accHere()), true);
};

const accThemeToggle = ACT.theme;
ACT.theme = (el, ev) => {
  ACC.menuOpen = false;
  accThemeToggle(el, ev);
};

document.addEventListener('click', (ev) => {
  if (ev.target.closest('.acc-pop a')) {
    ACC.menuOpen = false;
  } else if (ACC.menuOpen && !ev.target.closest('.acc-menu')) {
    ACC.menuOpen = false;
    render();
  }
});
document.addEventListener('keydown', (ev) => {
  if (ev.key === 'Escape' && ACC.menuOpen) {
    ACC.menuOpen = false;
    render();
    document.querySelector('.acc-btn')?.focus();
  }
});
window.addEventListener('hashchange', () => {
  ACC.menuOpen = false;
  ACC.profileNotice = null;
  ACC.pwNotice = null;
});

// Logged in or out on another tab: draw again, so the header and the access panel follow.
AUTH.onChange(() => render());

// #endregion
