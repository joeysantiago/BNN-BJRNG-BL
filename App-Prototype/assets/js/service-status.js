/* Services status (speed test page). Moved from thakurg.html as it was; see App-Prototype/README.md for the page layout. */
'use strict';

// #region Services status

const SV = { results: {}, checkedAt: 0, checking: false };

function svcCheck() {
  SV.checking = true;
  SV.results = {};
  if (onSpeedRoute())
    render();
  setTimeout(() => {
    S.settings.services.items.forEach((s) => {
      const info = SERVICES.find((x) => x.id === s.id);
      const roll = Math.random();
      SV.results[s.id] = { state: roll < 0.86 ? 'operational' : roll < 0.95 ? 'degraded' : 'outage', source: info.status ? 'official' : 'probe' };
    });
    SV.checkedAt = Date.now();
    SV.checking = false;
    if (onSpeedRoute())
      render();
  }, 1200);
}

function svcHtml() {
  const items = S.settings.services.items.filter((s) => s.enabled);
  const issues = Object.values(SV.results).filter((r) => r.state !== 'operational').length;
  const summary = SV.checkedAt && !SV.checking ? `${issues ? t('svc.issues', { n: issues }) : t('svc.all_ok')} ${t('svc.checked', { time: timeText(SV.checkedAt) })}` : t('svc.checking');
  const groups = ['apps', 'telecom'].map((g) => ({ g, list: items.filter((s) => SERVICES.find((x) => x.id === s.id).group === g) })).filter((x) => x.list.length);
  return `<section class="card svc" id="services-status" aria-labelledby="svc-h">
    <div class="head"><h2 id="svc-h">${pageName('services')}</h2><button type="button" class="btn sm" data-act="svcCheck">${t('svc.refresh')}</button></div>
    <p class="lead">${t('svc.lead')}</p><p class="summary" aria-live="polite">${summary}</p>
    ${groups.map(({ g, list }) => `<h3>${t('svc.group.' + g)}</h3><ul class="list">${list.map((s) => {
      const r = SV.results[s.id];
      const state = r ? r.state : 'checking';
      const info = SERVICES.find((x) => x.id === s.id);
      return `<li class="tile" data-state="${state}"><a class="name" href="${esc(info.url)}" target="_blank" rel="noopener noreferrer" aria-label="${t('svc.open', { name: s.name })}">${esc(s.name)}</a>
        <span class="pill"><i class="dot" aria-hidden="true"></i>${t('svc.' + state)}</span><small class="src">${t(r && r.source === 'official' ? 'svc.official' : 'svc.probe')}</small></li>`;
    }).join('')}</ul>`).join('')}
    <p class="note">${t('svc.note')}</p></section>`;
}

ACT.svcCheck = () => svcCheck();

// #endregion

