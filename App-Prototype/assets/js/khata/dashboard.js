/* SnapKhata: Dashboard. Moved from thakurg.html as it was; see App-Prototype/README.md for the page layout. */
'use strict';

// #region Dashboard

const monthKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
const monthName = (key, long) => new Intl.DateTimeFormat(langInfo().locale, long ? { month: 'long', year: 'numeric' } : { month: 'short' }).format(new Date(+key.slice(0, 4), +key.slice(5, 7) - 1, 1));

/** Gave and got per month for the last n months, oldest first. */
function monthly(entries, n) {
  const now = new Date();
  const months = Array.from({ length: n }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (n - 1 - i), 1);
    return { key: monthKey(d), gave: 0, got: 0 };
  });
  entries.filter(live).forEach((e) => {
    const m = months.find((x) => x.key === e.entryDate.slice(0, 7));
    if (m)
      m[e.entryType === GAVE ? 'gave' : 'got'] += e.amountMinor;
  });
  return months;
}

function barPath(x, y, w, h) {
  const r = Math.min(4, h, w / 2);
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}

/** Grouped bars, gave and got side by side per month, one shared y axis, a tooltip per month. */
function flowChart(months, cur) {
  const W = 640;
  const H = 240;
  const pl = 46;
  const pr = 6;
  const pt = 14;
  const pb = 30;
  const max = Math.max(1, ...months.flatMap((m) => [m.gave, m.got]));
  const ch = H - pt - pb;
  const gw = (W - pl - pr) / months.length;
  const bw = Math.min(26, gw * 0.3);
  const y = (v) => pt + ch - (v / max) * ch;
  const grid = [0, 0.5, 1].map((f) => `<line class="gl" x1="${pl}" x2="${W - pr}" y1="${y(max * f)}" y2="${y(max * f)}"/><text class="ax" x="${pl - 8}" y="${y(max * f) + 4}" text-anchor="end">${esc(compact(max * f, cur))}</text>`).join('');
  const groups = months.map((m, i) => {
    const cx = pl + gw * i + gw / 2;
    const bar = (v, x, cls) => (v ? `<path class="${cls}" d="${barPath(x, y(v), bw, pt + ch - y(v))}"/>` : '');
    const tip = { t: monthName(m.key, true), rows: [['give', traw('khata.e.gave'), money(m.gave, cur)], ['get', traw('khata.e.got'), money(m.got, cur)]] };
    return `<g class="bars">${bar(m.gave, cx - bw - 1, 'b-give')}${bar(m.got, cx + 1, 'b-get')}</g>
      <text class="ax" x="${cx}" y="${H - 8}" text-anchor="middle">${esc(monthName(m.key))}</text>
      <rect class="hit" x="${cx - gw / 2 + 2}" y="${pt}" width="${gw - 4}" height="${ch}" rx="10" tabindex="0" data-x="${cx}" data-y="${y(Math.max(m.gave, m.got))}" data-tip="${esc(JSON.stringify(tip))}" aria-label="${esc(`${tip.t}: ${tip.rows.map((r) => `${r[1]} ${r[2]}`).join(', ')}`)}"/>`;
  }).join('');
  return `<div class="k-chart"><svg viewBox="0 0 ${W} ${H}" data-w="${W}" direction="ltr" role="group" aria-label="${t('khata.d.flowTitle')}">${grid}${groups}</svg><div class="k-tip" hidden></div></div>`;
}

function dashboardPage(bookId) {
  const book = K.books.find((b) => b.id === bookId);
  if (!book)
    return notFound('KHATA_BOOK_NOT_FOUND');
  if (K.ui.loading)
    return { title: book.name, html: skeleton('dash') };
  const cur = curOf(book);
  const sums = bookSums(book);
  const entries = bookEntries(bookId);
  const months = monthly(entries, 6);
  const thisM = months[5];
  const lastM = months[4];
  const net = sums.get - sums.give;
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'khata.d.morning' : hour < 17 ? 'khata.d.afternoon' : 'khata.d.evening';
  const delta = (now, before, goodUp) => {
    if (!before && !now)
      return `<span class="k-delta flat">${t('khata.d.noChange')}</span>`;
    if (!before)
      return `<span class="k-delta ${goodUp ? 'up' : 'down'}">${ico('trend', 14)}${t('khata.d.new')}</span>`;
    const pct = Math.round(((now - before) / before) * 100);
    const up = pct >= 0;
    return `<span class="k-delta ${pct === 0 ? 'flat' : up === goodUp ? 'up' : 'down'}">${ico(up ? 'gave' : 'got', 14, 2.6)}${t('khata.d.vsLast', { pct: `${up ? '+' : ''}${pct}%` })}</span>`;
  };
  const stat = (icon, tone, label, minor, extra) => `<div class="k-card k-stat lift"><div class="top"><span class="lbl">${label}</span><span class="k-ib ${tone}">${ico(icon, 18)}</span></div><b class="val k-num" data-count="${minor}" data-cur="${cur.id}">${money(minor, cur)}</b>${extra}</div>`;
  const contacts = bookContacts(bookId);
  const top = contacts.map((c) => ({ c, bal: contactBalance(c.id) })).filter((x) => x.bal).sort((a, b) => Math.abs(b.bal) - Math.abs(a.bal)).slice(0, 5);
  const topMax = top.length ? Math.abs(top[0].bal) : 1;
  const recent = entries.filter(live).sort(byNewest).slice(0, 6);
  const hasFlow = months.some((m) => m.gave || m.got);
  const empty = !contacts.length;
  const html = `<div class="k-dash k-stagger">
    <div class="k-head"><div><h1 id="dash-h1">${t(greet)}</h1><p>${t('khata.d.lead', { book: book.name })}</p></div><span class="k-badge">${ico('calendar', 13)}${formatDate(todayIso())}</span></div>
    <div class="k-dash-top">
      <section class="k-hero" aria-labelledby="net-h"><span class="eyebrow" id="net-h">${ico('wallet', 16)}${t('khata.d.net')}</span>
        <b class="big k-num ${balTone(net)}" data-count="${Math.abs(net)}" data-cur="${cur.id}">${money(net, cur)}</b>
        <span class="k-muted">${t(net > 0 ? 'khata.d.netGet' : net < 0 ? 'khata.d.netGive' : 'khata.d.netZero')}</span>
        <div class="split"><div class="pill"><span class="k-ib get">${ico('got', 18, 2.4)}</span><span style="min-width:0"><small>${t('khata.c.willGet')}</small><b class="k-num k-get">${money(sums.get, cur)}</b><small>${t('khata.d.parties', { n: sums.toGet })}</small></span></div>
          <div class="pill"><span class="k-ib give">${ico('gave', 18, 2.4)}</span><span style="min-width:0"><small>${t('khata.c.willGive')}</small><b class="k-num k-give">${money(sums.give, cur)}</b><small>${t('khata.d.parties', { n: sums.toGive })}</small></span></div></div></section>
      <nav class="k-quick" aria-label="${t('khata.d.quick')}">
        <a class="k-qa" href="${link(`/khata/app/b/${bookId}/new?type=${GAVE}`)}"><span class="k-ib give">${ico('gave', 20, 2.4)}</span>${t('khata.e.gave')}</a>
        <a class="k-qa" href="${link(`/khata/app/b/${bookId}/new?type=${GOT}`)}"><span class="k-ib get">${ico('got', 20, 2.4)}</span>${t('khata.e.got')}</a>
        <a class="k-qa" href="${link(`/khata/app/b/${bookId}/parties?add=1`)}"><span class="k-ib brand">${ico('users', 20)}</span>${t('khata.c.add')}</a>
        <a class="k-qa" href="${link(`/khata/app/b/${bookId}/entries`)}"><span class="k-ib warn">${ico('list', 20)}</span>${t('khata.d.allEntries')}</a></nav>
    </div>
    <div class="k-stats">
      ${stat('got', 'get', t('khata.d.collectedM'), thisM.got, delta(thisM.got, lastM.got, true))}
      ${stat('gave', 'give', t('khata.d.givenM'), thisM.gave, delta(thisM.gave, lastM.gave, false))}
      <div class="k-card k-stat lift"><div class="top"><span class="lbl">${t('khata.d.partiesT')}</span><span class="k-ib brand">${ico('users', 18)}</span></div><b class="val k-num">${contacts.length}</b><span class="k-delta flat">${t('khata.d.pending', { n: sums.toGet + sums.toGive })}</span></div>
      <div class="k-card k-stat lift"><div class="top"><span class="lbl">${t('khata.d.entriesM')}</span><span class="k-ib warn">${ico('note', 18)}</span></div><b class="val k-num">${entries.filter((e) => live(e) && e.entryDate.startsWith(thisM.key)).length}</b><span class="k-delta flat">${t('khata.d.total', { n: entries.filter(live).length })}</span></div>
    </div>
    ${empty ? `<div class="k-card k-empty">${emptyArt('users')}<h2>${t('khata.d.emptyTitle')}</h2><p>${t('khata.d.emptyLead')}</p><a class="k-btn pri" href="${link(`/khata/app/b/${bookId}/parties?add=1`)}">${ico('plus', 18)}${t('khata.c.add')}</a></div>` : `
    <div class="k-grid2">
      <section class="k-card" aria-labelledby="flow-h"><div class="k-card-h"><div><h2 id="flow-h">${t('khata.d.flowTitle')}</h2><p>${t('khata.d.flowLead')}</p></div></div>
        ${hasFlow ? `<ul class="k-legend"><li><i style="background:var(--k-chart-give)"></i>${t('khata.e.gave')} <b class="k-num">${money(months.reduce((s, m) => s + m.gave, 0), cur)}</b></li><li><i style="background:var(--k-chart-get)"></i>${t('khata.e.got')} <b class="k-num">${money(months.reduce((s, m) => s + m.got, 0), cur)}</b></li></ul>
        ${flowChart(months, cur)}
        <details class="k-table"><summary>${t('khata.d.asTable')}</summary><table><thead><tr><th scope="col">${t('khata.d.month')}</th><th scope="col">${t('khata.e.gave')}</th><th scope="col">${t('khata.e.got')}</th></tr></thead><tbody>${months.map((m) => `<tr><th scope="row">${esc(monthName(m.key, true))}</th><td class="k-num">${money(m.gave, cur)}</td><td class="k-num">${money(m.got, cur)}</td></tr>`).join('')}</tbody></table></details>`
        : `<div class="k-empty">${emptyArt('list')}<p>${t('khata.d.noFlow')}</p></div>`}</section>
      <section class="k-card" aria-labelledby="top-h"><div class="k-card-h"><div><h2 id="top-h">${t('khata.d.topTitle')}</h2><p>${t('khata.d.topLead')}</p></div><a class="k-btn ghost sm" href="${link(`/khata/app/b/${bookId}/parties`)}">${t('khata.d.seeAll')}</a></div>
        ${top.length ? `<ol class="k-hbars">${top.map(({ c, bal }) => `<li><a href="${link(`/khata/app/b/${bookId}/contact/${c.id}`)}"><span class="row"><span>${esc(c.name)}</span><span class="k-num ${balTone(bal)}">${money(bal, cur)}</span></span>
          <span class="track"><span class="fill ${bal > 0 ? 'get' : 'give'}" style="display:block;width:${Math.max(4, (Math.abs(bal) / topMax) * 100).toFixed(1)}%"></span></span><small class="k-muted">${t(bal > 0 ? 'khata.c.youGet' : 'khata.c.youGive')}</small></a></li>`).join('')}</ol>`
        : `<div class="k-empty">${emptyArt('users')}<p>${t('khata.d.allSettled')}</p></div>`}</section>
    </div>
    <section class="k-card" aria-labelledby="recent-h"><div class="k-card-h"><div><h2 id="recent-h">${t('khata.d.recent')}</h2><p>${t('khata.d.recentLead')}</p></div><a class="k-btn ghost sm" href="${link(`/khata/app/b/${bookId}/entries`)}">${t('khata.d.seeAll')}</a></div>
      ${recent.length ? `<ul class="k-list">${recent.map((e) => txRow(e, cur, bookId, { party: true })).join('')}</ul>` : `<div class="k-empty">${emptyArt('list')}<p>${t('khata.e.none')}</p></div>`}</section>`}
  </div>`;
  return { title: book.name, html };
}

/** Grey shapes in the layout of the screen that is loading, so nothing jumps when it arrives. */
function skeleton(kind) {
  const sk = (w, h, extra = '') => `<span class="k-sk" style="display:block;width:${w};height:${h}px;${extra}"></span>`;
  const rows = (n) => `<div class="k-list">${Array.from({ length: n }, () => `<div class="k-row-link" style="pointer-events:none">${sk('42px', 42, 'border-radius:14px')}<span class="mid">${sk('55%', 14)}${sk('35%', 11, 'margin-top:8px')}</span>${sk('70px', 16)}</div>`).join('')}</div>`;
  const head = `<div class="k-head"><div>${sk('220px', 28)}${sk('160px', 14, 'margin-top:10px')}</div></div>`;
  const body = kind === 'dash'
    ? `${head}<div class="k-hero">${sk('120px', 14)}${sk('60%', 42, 'margin-top:12px')}${sk('100%', 64, 'margin-top:20px;border-radius:18px')}</div><div class="k-stats">${Array.from({ length: 4 }, () => `<div class="k-card k-stat">${sk('60%', 12)}${sk('80%', 22)}</div>`).join('')}</div><div class="k-card">${sk('40%', 16)}${sk('100%', 180, 'margin-top:16px')}</div>`
    : `${head}<div class="k-card">${sk('100%', 48, 'border-radius:16px')}</div>${rows(6)}`;
  return `<div class="k-page" aria-busy="true"><span class="sr-only" role="status">${t('khata.loading')}</span>${body}</div>`;
}

/** One transaction row, used on the dashboard, the party ledger and the all-entries list. */
function txRow(e, cur, bookId, opts = {}) {
  const party = opts.party ? K.contacts.find((c) => c.id === e.contactId) : null;
  const gave = e.entryType === GAVE;
  const badges = [
    e.isDeleted ? `<span class="k-badge give">${t('khata.e.deleted')}</span>` : e.version > 1 ? `<span class="k-badge warn">${t('khata.e.edited')}</span>` : '',
    e.addedByMe ? '' : `<span class="k-badge brand">${t('khata.e.byContact')}</span>`,
    e.photos.length ? `<span class="k-badge">${ico('clip', 12)}${e.photos.length}</span>` : '',
  ].join('');
  const title = party ? esc(party.name) : e.note ? esc(e.note) : t(gave ? 'khata.e.gave' : 'khata.e.got');
  const sub = [party && e.note ? esc(e.note) : '', formatDate(e.entryDate)].filter(Boolean).join(' · ');
  const after = opts.running !== undefined ? `<small class="k-faint k-num">${t('khata.e.balAfter', { amount: money(opts.running, cur) })}</small>` : `<small class="k-faint">${t(gave ? 'khata.e.gave' : 'khata.e.got')}</small>`;
  return `<li><a class="k-row-link${e.isDeleted ? ' gone' : ''}" href="${link(`/khata/app/b/${bookId}/e/${e.id}`)}"><span class="k-tx-ico ${gave ? 'give' : 'get'}">${ico(gave ? 'gave' : 'got', 20, 2.4)}</span>
    <span class="mid"><b>${title}</b><small>${sub}${badges}</small></span><span class="end"><span class="amt k-num ${gave ? 'k-give' : 'k-get'}">${money(e.amountMinor, cur)}</span>${after}</span>${ico('chev', 18)}</a></li>`;
}

/** Puts rows under a heading per month, newest month first. */
function byMonth(list, row) {
  let last = '';
  return list.map((e) => {
    const key = e.entryDate.slice(0, 7);
    const head = key !== last ? `<li class="k-group" aria-hidden="false"><span>${esc(monthName(key, true))}</span></li>` : '';
    last = key;
    return head + row(e);
  }).join('');
}

// #endregion

