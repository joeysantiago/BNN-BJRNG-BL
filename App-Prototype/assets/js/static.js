/* About, privacy, terms and the status pages. Moved from thakurg.html as it was; see App-Prototype/README.md for the page layout. */
'use strict';

// #region About, privacy, terms and the status pages

function staticPage(kind) {
  const count = kind === 'about' ? 3 : 5;
  let html = `<h1>${t(kind + '.h1')}</h1>` + range(count).map((i) => `<p>${t(`${kind}.p${i}`)}</p>`).join('');
  if (kind === 'about')
    html += `<h2>${t('about.h2.tools')}</h2><ul><li><a href="${link(langInfo().home)}">${t('about.l.speed')}</a></li></ul>`;
  return { title: traw(`seo.${kind}.title`), html: host('sc-static', `<div class="wrap page"><article class="card prose">${html}</article></div>`) };
}

const STATUS_COPY = {
  404: { h: 'nf.h1', p: 'nf.p', cta: 'nf.home', title: 'seo.404.title', code: '404' },
  error: { h: 'err.h1', p: 'err.p', cta: 'err.home', title: 'seo.error.title', code: '!' },
  offline: { h: 'offpage.h1', p: 'offpage.p', cta: 'nf.home', title: 'seo.offline.title', code: '⚡' },
};

function statusPage(kind) {
  const c = STATUS_COPY[kind] ?? STATUS_COPY[404];
  return {
    title: traw(c.title),
    html: host('sc-status', `<div class="wrap page"><section class="card box"><p class="code inset" aria-hidden="true">${c.code}</p><h1>${t(c.h)}</h1><p class="msg">${t(c.p)}</p><a class="btn pri lg" href="${link(langInfo().home)}">${t(c.cta)}</a></section></div>`),
  };
}

// #endregion

