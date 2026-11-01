/* SnapKhata: Public page. Moved from thakurg.html as it was; see App-Prototype/README.md for the page layout.
   The OTP login and PIN screens are gone: SnapKhata opens after the common login (assets/js/auth.js, /login). */
'use strict';

// #region Public page

/** Public landing page, in the SnapKhata app design (full screen, light / dark), like the SnapTracker home screen. Texts are the same keys as before. */
function landingPage() {
  const features = [['users', 'f1'], ['zap', 'f2'], ['book', 'f3'], ['lock', 'f4'], ['history', 'f5']];
  const langs = LANGS.map((l) => `<option value="${l.code}"${l.code === S.lang ? ' selected' : ''}>${l.native}</option>`).join('');
  const html = `<div class="khata k-land" data-kt="${resolvedTheme()}" dir="${langInfo().dir}">
  <header class="kl-top"><div class="kl-in">
    <a class="k-logo" href="${link('/khata')}"><span class="mark">${LOGO}</span><span>${t('khata.app.name')}</span></a>
    <div class="kl-tools"><label class="kl-lang">${ico('globe', 16)}<span class="sr-only">${t('lang.label')}</span><select id="kl-lang" data-change="siteLang">${langs}</select></label>
      ${themeButton()}${accountLink('k-btn ghost sm kl-login')}</div></div></header>
  <section class="kl-hero" aria-labelledby="khata-h1"><div class="kl-in kl-hero-in">
    <span class="blob b1" aria-hidden="true"></span><span class="blob b2" aria-hidden="true"></span>
    <div class="kl-copy">
      <h1 id="khata-h1">${t('khata.l.h1')}</h1>
      <p class="kl-lead">${t('khata.l.lead')}</p>
      <div class="kl-cta"><a class="k-btn lg kl-open" href="${link('/khata/app')}">${t('khata.l.open')}${ico('next', 18)}</a>${accountLink('k-btn lg kl-ghost')}</div>
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

/** The landing page's login link: the common login (back to the app afterwards), or the profile when someone is logged in. */
const accountLink = (cls) => (AUTH.current() ? `<a class="${cls}" href="${link('/profile')}">${t('auth.profile')}</a>` : `<a class="${cls}" href="${link('/login?next=' + encodeURIComponent('/khata/app'))}">${t('khata.l.login')}</a>`);

// #endregion
