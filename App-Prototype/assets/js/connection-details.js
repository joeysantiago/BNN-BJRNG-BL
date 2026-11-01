/* Connection details (speed test page). Moved from thakurg.html as it was; see App-Prototype/README.md for the page layout. */
'use strict';

// #region Connection details

const CONN = { loading: false, values: null };

function connValues() {
  const nav = navigator.connection;
  const type = nav && nav.type ? (['wifi', 'cellular', 'ethernet', 'bluetooth'].includes(nav.type) ? `conn.net.${nav.type}` : 'conn.net.other') : 'conn.net.unknown';
  return {
    isp: { text: 'Demo Broadband Pvt Ltd (prototype)', found: true },
    ip: { text: '203.0.113.42', found: true },
    ipv4: { text: '203.0.113.42', found: true },
    ipv6: { text: traw('conn.noipv6'), found: false },
    mac: { text: traw('conn.mac_na'), found: false },
    location: { text: 'Mumbai, Maharashtra, India', found: true },
    testServer: { text: 'Thakurg', found: true },
    networkType: { text: traw(type), found: type !== 'conn.net.unknown' },
  };
}

function connHtml() {
  const values = CONN.loading ? null : connValues();
  const rows = CONN_FIELDS.filter((f) => S.settings.connection.fields[f]).map((f) => {
    const v = values ? values[f] : { text: traw('conn.detecting'), found: false };
    return `<div class="cell inset"><dt>${t('conn.' + f)}</dt><dd class="${v.found ? '' : 'na'}">${esc(v.text)}</dd></div>`;
  });
  return `<section class="card conn" id="connection-details" aria-labelledby="conn-h">
    <div class="head"><h2 id="conn-h">${pageName('connection')}</h2><button type="button" class="btn sm"${CONN.loading ? ' disabled' : ''} data-act="connReload">${t('conn.refresh')}</button></div>
    <p class="lead">${t('conn.lead')}</p><dl class="grid" aria-live="polite">${rows.join('')}</dl><p class="note">${t('conn.note')}</p></section>`;
}

ACT.connReload = () => {
  CONN.loading = true;
  render();
  setTimeout(() => {
    CONN.loading = false;
    render();
  }, 900);
};

// #endregion

