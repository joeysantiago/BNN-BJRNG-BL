/* SnapKhata: Public page, login, OTP and PIN. Moved from thakurg.html as it was; see App-Prototype/README.md for the page layout. */
'use strict';

// #region Public page, login, OTP and PIN

/** Public landing page, in the SnapKhata app design (full screen, light / dark), like the SnapTracker home screen. Texts are the same keys as before. */
function landingPage() {
  const features = [['users', 'f1'], ['zap', 'f2'], ['book', 'f3'], ['lock', 'f4'], ['history', 'f5']];
  const langs = LANGS.map((l) => `<option value="${l.code}"${l.code === S.lang ? ' selected' : ''}>${l.native}</option>`).join('');
  const html = `<div class="khata k-land" data-kt="${resolvedTheme()}" dir="${langInfo().dir}">
  <header class="kl-top"><div class="kl-in">
    <a class="k-logo" href="${link('/khata')}"><span class="mark">${LOGO}</span><span>${t('khata.app.name')}</span></a>
    <div class="kl-tools"><label class="kl-lang">${ico('globe', 16)}<span class="sr-only">${t('lang.label')}</span><select id="kl-lang" data-change="siteLang">${langs}</select></label>
      ${themeButton()}<a class="k-btn ghost sm kl-login" href="${link('/khata/login')}">${t('khata.l.login')}</a></div></div></header>
  <section class="kl-hero" aria-labelledby="khata-h1"><div class="kl-in kl-hero-in">
    <span class="blob b1" aria-hidden="true"></span><span class="blob b2" aria-hidden="true"></span>
    <div class="kl-copy">
      <h1 id="khata-h1">${t('khata.l.h1')}</h1>
      <p class="kl-lead">${t('khata.l.lead')}</p>
      <div class="kl-cta"><a class="k-btn lg kl-open" href="${link('/khata/app')}">${t('khata.l.open')}${ico('next', 18)}</a><a class="k-btn lg kl-ghost" href="${link('/khata/login')}">${t('khata.l.login')}</a></div>
      <p class="kl-trust"><span>${ico('lock', 15)}${t('khata.auth.t1')}</span><span>${ico('shield', 15)}${t('khata.auth.t2')}</span></p>
    </div>
    <div class="kl-visual" aria-hidden="true">
      <div class="kl-mock"><small>${t('khata.c.willGet')}</small><b>₹ 4,58,050</b>
        <div class="rows"><div><span>Ramesh Kumar</span><span>₹ 1,58,000</span></div><div><span>Priya Sharma</span><span>₹ 32,050</span></div><div><span>Anil Traders</span><span>₹ 2,68,000</span></div></div></div>
      <div class="kl-float gave"><span class="ic">${ico('gave', 16)}</span><span><small>${t('khata.e.gave')}</small><b>₹ 500 · Ramesh</b></span></div>
      <div class="kl-float got"><span class="ic">${ico('got', 16)}</span><span><small>${t('khata.e.got')}</small><b>₹ 2,000 · Priya</b></span></div>
    </div>
  </div></section>
  <section class="kl-sec" aria-labelledby="khata-features"><div class="kl-in">
    <h2 id="khata-features">${t('khata.l.featuresH')}</h2>
    <ul class="kl-feats">${features.map(([icon, f]) => `<li class="kl-card"><span class="kl-ic">${ico(icon, 20)}</span><p>${t('khata.l.' + f)}</p></li>`).join('')}
      <li class="kl-card kl-why"><span class="kl-ic">${ico('camera', 20)}</span><p><b>${t('khata.auth.b2')}</b> · ${t('khata.auth.b3')}</p></li></ul>
  </div></section>
  <section class="kl-sec" aria-labelledby="khata-faq"><div class="kl-in">
    <h2 id="khata-faq">${t('khata.l.faqH')}</h2>
    <div class="kl-faq">${['q1', 'q2', 'q3', 'q4'].map((q, i) => `<details class="kl-card"${i === 0 ? ' open' : ''}><summary>${t('khata.l.' + q)}${ico('chevD', 18)}</summary><p>${t('khata.l.' + q + 'a')}</p></details>`).join('')}</div>
  </div></section>
  <section class="kl-sec" aria-labelledby="khata-cta"><div class="kl-in"><div class="kl-band"><span class="blob b1" aria-hidden="true"></span>
    <div><h2 id="khata-cta">${t('khata.auth.artTitle')}</h2><p>${t('khata.auth.artLead')}</p></div>
    <a class="k-btn lg kl-open" href="${link('/khata/app')}">${t('khata.l.open')}${ico('next', 18)}</a></div></div></section>
  <footer class="kl-foot"><div class="kl-in"><nav aria-label="${t('nav.pages')}"><a href="${link('/about')}">${pageName('about')}</a><a href="${link('/privacy')}">${pageName('privacy')}</a><a href="${link('/terms')}">${pageName('terms')}</a></nav>
    <p>&copy; ${new Date().getFullYear()} thakurg.com. ${t('ft.rights')}</p></div></footer>
</div>`;
  return { title: traw('seo.khata.title'), html: host('sc-kland', html), after: () => applyTheme(false) };
}

const themeButton = () => `<button type="button" class="k-btn ghost icon" data-act="kThemeCycle" aria-label="${t('khata.theme.toggle', { name: traw('khata.theme.' + K.theme) })}" title="${t('khata.theme.toggle', { name: traw('khata.theme.' + K.theme) })}">${ico(themeIcon())}</button>`;

/** The login, OTP and PIN screens share one frame: a brand panel on wide screens and a glass card. */
function authFrame(card, step) {
  const art = `<aside class="k-auth-art" aria-hidden="true"><span class="blob b1"></span><span class="blob b2"></span>
      <span class="k-logo"><span class="mark">${LOGO}</span><span>${t('khata.app.name')}</span></span>
      <div><h2>${t('khata.auth.artTitle')}</h2><p>${t('khata.auth.artLead')}</p></div>
      <div class="k-mock"><small>${t('khata.c.willGet')}</small><b>₹ 4,58,050</b><div class="rows"><div><span>Ramesh Kumar</span><span>₹ 1,58,000</span></div><div><span>Priya Sharma</span><span>₹ 32,050</span></div></div></div>
      <ul><li><span>${ico('shield', 18)}</span>${t('khata.auth.b1')}</li><li><span>${ico('camera', 18)}</span>${t('khata.auth.b2')}</li><li><span>${ico('zap', 18)}</span>${t('khata.auth.b3')}</li></ul></aside>`;
  const steps = step ? `<div class="k-steps" aria-hidden="true">${[1, 2, 3].map((i) => `<i class="${i <= step ? 'on' : ''}"></i>`).join('')}</div>` : '';
  return `<div class="khata" data-kt="${resolvedTheme()}" dir="${langInfo().dir}"><div class="k-auth">${art}
    <div class="k-auth-main${K.anim ? ' k-enter' : ''}"><div class="k-auth-top"><a class="k-logo" href="${link('/khata')}"><span class="mark">${LOGO}</span><span>${t('khata.app.name')}</span></a>${themeButton()}</div>
      <div class="k-auth-card">${steps}${card}</div>
      <p class="k-trust"><span>${ico('lock', 15)}${t('khata.auth.t1')}</span><span>${ico('shield', 15)}${t('khata.auth.t2')}</span></p></div></div></div>`;
}

function authAfter() {
  K.anim = false;
  applyTheme(false);
}

function loginPage() {
  let card;
  if (K.verified) {
    card = `<div class="k-success" role="status"><span class="ok"><svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg></span>
      <h1 id="login-h1">${t('khata.otp.ok')}</h1><p class="k-muted">${t('khata.otp.okLead')}</p></div>`;
  } else if (!K.codeSent) {
    card = `<div><h1 id="login-h1">${t('khata.login.title')}</h1><p class="lead">${t('khata.login.lead')}</p></div>
      <form class="k-form" data-submit="kSend" novalidate>
        <label class="k-float${K.idBad ? ' bad' : ''}">${ico('user')}<input id="k-id" name="id" type="text" inputmode="email" autocomplete="username" placeholder=" " value="${esc(K.identifier)}" aria-invalid="${K.idBad}" aria-describedby="id-hint" data-input="kIdTyped"${K.busy ? ' readonly' : ''} /><span class="fl">${t('khata.login.id')}</span></label>
        <p id="id-hint" class="k-hint">${t('khata.login.idHint')}</p>
        ${errBox(K.error)}
        <button type="submit" class="k-btn pri lg wide${K.busy ? ' is-busy' : ''}"${K.wait > 0 && !K.busy ? ' disabled' : ''}>${K.busy ? `<span class="k-spin" aria-hidden="true"></span>${t('khata.login.sending')}` : `${t('khata.login.send')}${ico('next', 18)}`}</button>
      </form>`;
  } else {
    const boxes = [0, 1, 2, 3, 4, 5].map((i) => `<input id="k-otp-${i}" data-i="${i}" data-input="kOtp" type="text" inputmode="numeric" pattern="[0-9]*" autocomplete="${i ? 'off' : 'one-time-code'}" class="${K.otp[i] ? 'filled' : ''}" value="${esc(K.otp[i] ?? '')}" aria-label="${t('khata.otp.digit', { n: i + 1 })}"${K.busy ? ' readonly' : ''} />`).join('');
    card = `<div><h1 id="login-h1">${t('khata.otp.title')}</h1><p class="lead">${esc(K.info)} <b>${esc(K.identifier)}</b></p></div>
      <form class="k-form" data-submit="kVerify" novalidate>
        <div class="k-otp${K.otpBad ? ' bad' : ''}${K.busy ? ' ok' : ''}" role="group" aria-label="${t('khata.login.code')}">${boxes}</div>
        ${K.devCode ? `<p class="k-dev" role="note">${ico('zap', 16)}<span>${t('khata.login.devCode')}</span></p>` : ''}
        <div class="k-otp-meta"><span id="k-resend">${resendHtml()}</span><button type="button" class="k-btn ghost sm" data-act="kChange">${t('khata.login.change')}</button></div>
        ${errBox(K.error)}
        <button type="submit" class="k-btn pri lg wide${K.busy ? ' is-busy' : ''}">${K.busy ? `<span class="k-spin" aria-hidden="true"></span>${t('khata.otp.verifying')}` : `${t('khata.otp.verify')}${ico('next', 18)}`}</button>
      </form>`;
  }
  return {
    title: traw('khata.login.title'),
    html: host('sc-klogin', authFrame(card, K.verified ? 3 : K.codeSent ? 2 : 1)),
    after() {
      authAfter();
      document.querySelectorAll('.k-otp input').forEach((b) => b.addEventListener('focus', () => b.select()));
      if (K.codeSent && !K.verified && !K.busy && document.activeElement === document.body)
        document.getElementById(`k-otp-${Math.min(K.otp.length, 5)}`)?.focus();
      else if (!K.codeSent && !K.busy && document.activeElement === document.body)
        document.getElementById('k-id')?.focus();
    },
  };
}

function resendHtml() {
  if (K.wait <= 0)
    return `<button type="button" class="k-btn ghost sm" data-act="kResend">${ico('swap', 16)}${t('khata.login.resend')}</button>`;
  const c = 2 * Math.PI * 9;
  return `<span class="k-ring" role="timer" aria-live="off"><svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><circle class="bg" cx="12" cy="12" r="9" fill="none" stroke-width="3"/><circle class="fg" cx="12" cy="12" r="9" fill="none" stroke-width="3" stroke-linecap="round" stroke-dasharray="${c.toFixed(2)}" stroke-dashoffset="${(c * (1 - K.wait / 45)).toFixed(2)}" transform="rotate(-90 12 12)"/></svg>${t('khata.login.resendIn', { s: K.wait })}</span>`;
}

const validIdentifier = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || /^\+?\d{10,15}$/.test(v.replace(/[\s-]/g, ''));

/** The countdown changes only its own corner, so the digits being typed are never redrawn. */
function startWait() {
  K.wait = 45;
  clearInterval(K.waitTimer);
  K.waitTimer = setInterval(() => {
    K.wait--;
    if (K.wait <= 0)
      clearInterval(K.waitTimer);
    const box = document.getElementById('k-resend');
    if (box)
      box.innerHTML = resendHtml();
    else if (S.route.path === '/khata/login' && !K.codeSent && K.wait <= 0)
      render();
  }, 1000);
}

function sendCode(identifier) {
  K.error = '';
  K.idBad = false;
  if (!validIdentifier(identifier)) {
    K.identifier = identifier;
    K.error = msg('KHATA_IDENTIFIER_INVALID');
    K.idBad = true;
    return render();
  }
  K.identifier = identifier;
  K.busy = true;
  render();
  setTimeout(() => {
    K.busy = false;
    K.codeSent = true;
    K.devCode = String(Math.floor(100000 + Math.random() * 900000));
    K.otp = K.devCode;
    K.otpBad = false;
    K.info = msg('KHATA_OTP_SENT', 5);
    startWait();
    render();
  }, 850);
}

SUBMIT.kSend = (form, data) => sendCode(String(data.get('id')).trim());
INPUT.kIdTyped = (el) => {
  if (!K.idBad)
    return;
  K.idBad = false;
  el.setAttribute('aria-invalid', 'false');
  el.closest('.k-float').classList.remove('bad');
};
ACT.kResend = () => {
  K.codeSent = false;
  sendCode(K.identifier);
};
ACT.kChange = () => {
  K.codeSent = false;
  K.devCode = null;
  K.otp = '';
  K.error = '';
  K.otpBad = false;
  render();
  document.getElementById('k-id')?.focus();
};

const otpBoxes = () => [...document.querySelectorAll('.k-otp input')];

function syncOtp() {
  const boxes = otpBoxes();
  K.otp = boxes.map((b) => b.value).join('');
  boxes.forEach((b) => b.classList.toggle('filled', !!b.value));
  if (K.otpBad) {
    K.otpBad = false;
    document.querySelector('.k-otp')?.classList.remove('bad');
  }
  if (/^\d{6}$/.test(K.otp))
    verifyOtp();
}

/** Spreads typed, pasted or auto-filled digits over the boxes from the given box on. */
function fillOtp(from, digits) {
  const boxes = otpBoxes();
  let i = from;
  for (const d of digits) {
    if (i > 5)
      break;
    boxes[i++].value = d;
  }
  boxes[Math.min(i, 5)].focus();
  syncOtp();
}

INPUT.kOtp = (el) => {
  const digits = el.value.replace(/\D/g, '');
  if (digits.length > 1)
    return fillOtp(+el.dataset.i, digits);
  el.value = digits;
  if (digits && +el.dataset.i < 5)
    otpBoxes()[+el.dataset.i + 1].focus();
  syncOtp();
};

document.addEventListener('paste', (ev) => {
  if (!ev.target.matches || !ev.target.matches('.k-otp input'))
    return;
  const digits = (ev.clipboardData ? ev.clipboardData.getData('text') : '').replace(/\D/g, '');
  if (!digits)
    return;
  ev.preventDefault();
  fillOtp(digits.length >= 6 ? 0 : +ev.target.dataset.i, digits.slice(0, 6));
});

function verifyOtp() {
  if (K.busy)
    return;
  const code = K.otp;
  if (!/^\d{6}$/.test(code)) {
    K.error = traw('khata.login.codeInvalid');
    K.otpBad = true;
    render();
    document.getElementById(`k-otp-${Math.min(code.length, 5)}`)?.focus();
    return;
  }
  K.busy = true;
  K.error = '';
  render();
  setTimeout(() => {
    K.busy = false;
    if (code !== K.devCode) {
      K.error = msg('KHATA_OTP_INVALID');
      K.otpBad = true;
      K.otp = '';
      render();
      document.getElementById('k-otp-0')?.focus();
      return;
    }
    K.verified = true;
    render();
    setTimeout(() => {
      K.verified = false;
      K.loggedIn = true;
      K.codeSent = false;
      K.devCode = null;
      K.otp = '';
      K.error = '';
      K.pinTries = 5;
      clearInterval(K.waitTimer);
      K.wait = 0;
      seed();
      kSave();
      go(K.hasPin ? '/khata/unlock' : '/khata/set-pin', true);
    }, 900);
  }, 750);
}

SUBMIT.kVerify = () => verifyOtp();

function keypadHtml(value, act, bad) {
  const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
  return `<div class="k-dots${bad ? ' bad' : ''}" role="status" aria-label="${t('khata.pin.entered', { n: value.length })}">${[0, 1, 2, 3, 4, 5].map((i) => `<span class="${i < value.length ? 'on' : ''}"></span>`).join('')}</div>
    <div class="k-pad" role="group" aria-label="${t('khata.pin.keypad')}">${digits.map((d) => `<button type="button" class="k-key" data-act="${act}" data-d="${d}">${d}</button>`).join('')}
      <span aria-hidden="true"></span><button type="button" class="k-key" data-act="${act}" data-d="0">0</button><button type="button" class="k-key back" aria-label="${t('khata.pin.backspace')}" data-act="${act}" data-d="back">${ico('back', 22)}</button></div>`;
}

function pinPage(mode) {
  const title = mode === 'unlock' ? 'khata.pin.unlockTitle' : K.first ? 'khata.pin.confirmTitle' : 'khata.pin.setTitle';
  const card = `<div style="display:grid;justify-items:center;text-align:center;gap:12px"><span class="ill">${ico(mode === 'unlock' ? 'lock' : 'key', 28)}</span>
      <div><h1 id="pin-h1">${t(title)}</h1><p class="lead">${t(mode === 'unlock' ? 'khata.pin.unlockLead' : 'khata.pin.setLead', { min: MIN_PIN })}</p></div></div>
    ${keypadHtml(K.entry, 'kKey', K.pinBad)}
    ${errBox(K.error)}
    <button type="button" class="k-btn pri lg wide"${K.entry.length < MIN_PIN ? ' disabled' : ''} data-act="kPinOk" data-m="${mode}">${t(mode === 'set' && !K.first ? 'khata.pin.next' : 'khata.pin.ok')}</button>
    ${mode === 'unlock' ? `<div style="display:flex;justify-content:center;flex-wrap:wrap;gap:4px"><button type="button" class="k-btn ghost sm" data-act="kLogout">${t('khata.pin.forgot')}</button><button type="button" class="k-btn ghost sm" data-act="kLogout">${ico('logout', 16)}${t('khata.pin.logout')}</button></div>
      <p class="k-hint" style="text-align:center">${t('khata.pin.protoHint')}</p>` : ''}`;
  return { title: traw(title), html: host('sc-kpin', authFrame(card, mode === 'set' ? 3 : 0)), after: authAfter };
}

function pressKey(current, d) {
  if (d === 'back')
    return current.slice(0, -1);
  return current.length < 6 ? current + d : current;
}

ACT.kKey = (el) => {
  K.entry = pressKey(K.entry, el.dataset.d);
  K.error = '';
  K.pinBad = false;
  render();
};

/** Typing digits, Backspace and Enter work on the keypad screens too. */
function keypadKey(ev) {
  if (!document.querySelector('.k-pad') || ev.target.matches('input, select, textarea'))
    return;
  const sheet = !!K.sheet;
  if (/^\d$/.test(ev.key) || ev.key === 'Backspace') {
    ev.preventDefault();
    const d = ev.key === 'Backspace' ? 'back' : ev.key;
    if (sheet)
      K.sheetPin = pressKey(K.sheetPin, d);
    else
      K.entry = pressKey(K.entry, d);
    K.pinBad = false;
    render();
  } else if (ev.key === 'Enter') {
    ev.preventDefault();
    if (sheet)
      ACT.kSheetOk();
    else if (K.entry.length >= MIN_PIN)
      ACT.kPinOk({ dataset: { m: S.route.path === '/khata/set-pin' ? 'set' : 'unlock' } });
  }
}

/** Keys of the OTP boxes and the photo viewer. */
document.addEventListener('keydown', (ev) => {
  if (K.viewer && document.getElementById('k-viewer')?.open) {
    if (ev.key === 'ArrowRight' || ev.key === 'ArrowLeft') {
      ev.preventDefault();
      const forward = (ev.key === 'ArrowRight') !== (langInfo().dir === 'rtl');
      ACT.kViewStep({ dataset: { d: forward ? '1' : '-1' } });
    }
    return;
  }
  if (!ev.target.matches || !ev.target.matches('.k-otp input'))
    return;
  const i = +ev.target.dataset.i;
  const boxes = otpBoxes();
  if (ev.key === 'Backspace' && !ev.target.value && i > 0) {
    ev.preventDefault();
    boxes[i - 1].value = '';
    boxes[i - 1].focus();
    syncOtp();
  } else if (ev.key === 'ArrowLeft' && i > 0) {
    ev.preventDefault();
    boxes[i - 1].focus();
  } else if (ev.key === 'ArrowRight' && i < 5) {
    ev.preventDefault();
    boxes[i + 1].focus();
  }
});

const weakPin = (p) => /^(\d)\1+$/.test(p) || '0123456789'.includes(p) || '9876543210'.includes(p);

ACT.kPinOk = (el) => {
  const pin = K.entry;
  K.entry = '';
  if (el.dataset.m === 'set') {
    if (!K.first) {
      if (weakPin(pin)) {
        K.error = msg('KHATA_PIN_WEAK', MIN_PIN, 6);
        K.pinBad = true;
        return render();
      }
      K.first = pin;
      return render();
    }
    if (pin !== K.first) {
      K.first = null;
      K.error = traw('khata.pin.mismatch');
      K.pinBad = true;
      return render();
    }
    K.first = null;
    K.pin = pin;
    K.hasPin = true;
    K.unlocked = true;
    return go('/khata/app', true);
  }
  if (pin !== K.pin) {
    K.pinTries--;
    if (K.pinTries <= 0) {
      logout();
      K.error = msg('KHATA_PIN_RESET');
      return render();
    }
    K.error = msg('KHATA_PIN_INVALID', K.pinTries);
    K.pinBad = true;
    return render();
  }
  K.pinTries = 5;
  K.unlocked = true;
  go(S.route.query.next && S.route.query.next.startsWith('/khata/app') ? S.route.query.next : '/khata/app', true);
};

function logout() {
  Object.assign(K, { loggedIn: false, unlocked: false, hasPin: false, pin: '', first: null, entry: '', error: '', sheet: null, viewer: null });
  go('/khata/login', true);
}

ACT.kLogout = () => logout();
ACT.kLock = () => {
  K.unlocked = false;
  go('/khata/unlock?next=' + encodeURIComponent(S.route.path), true);
};

// #endregion

