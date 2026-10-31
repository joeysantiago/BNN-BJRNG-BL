/* Shared by the master dashboard (index.html) and every page in pages/.
   PREFS: the one place that stores the language, the site skin and the light / dark mode (localStorage), and tells the other side when they change.
   BRIDGE: messages between the dashboard and the page in its content frame (navigation, current address, preferences).
   A page opened on its own (not inside the dashboard) still works: it reads the same preferences and links to the other page files directly. */
'use strict';

const PROTO_NS = 'thakurg-proto';

const PREFS = (() => {
  const KEYS = { lang: 'thakurg-proto-lang', skin: 'thakurg-proto-skin', mode: 'thakurg-proto-mode' };
  const ALLOWED = { lang: ['en', 'hi', 'ar'], skin: ['glass', 'clay', 'skeu', 'neu'], mode: ['light', 'dark', 'system'] };
  const DEFAULTS = { lang: 'en', skin: 'glass', mode: 'system' };
  const listeners = [];
  const darkQuery = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  const read = (k) => {
    try {
      const v = localStorage.getItem(KEYS[k]);
      return ALLOWED[k].includes(v) ? v : DEFAULTS[k];
    } catch {
      return DEFAULTS[k];
    }
  };
  const write = (k, v) => {
    try {
      localStorage.setItem(KEYS[k], v);
    } catch {
      /* private mode: the choice holds until the page closes */
    }
  };
  return {
    LANGS: [
      { code: 'en', native: 'English', dir: 'ltr' },
      { code: 'hi', native: 'हिन्दी', dir: 'ltr' },
      { code: 'ar', native: 'العربية', dir: 'rtl' },
    ],
    get: () => ({ lang: read('lang'), skin: read('skin'), mode: read('mode') }),
    /** light or dark, with "system" resolved from the device setting. */
    resolved: (mode = read('mode')) => (mode === 'system' ? (darkQuery && darkQuery.matches ? 'dark' : 'light') : mode),
    /** Saves the change and tells the other side (dashboard or page). Unknown values are ignored. */
    set(patch) {
      Object.entries(patch).forEach(([k, v]) => ALLOWED[k] && ALLOWED[k].includes(v) && write(k, v));
      this.announce();
    },
    /** Tells the other side the current preferences, for changes saved by existing page code. */
    announce() {
      BRIDGE.post({ type: 'prefs', prefs: this.get() });
    },
    /** Called when the other side changed a preference, or when the device switches light / dark while "system" is chosen. */
    onChange(fn) {
      listeners.push(fn);
    },
    emit() {
      const p = this.get();
      listeners.forEach((fn) => fn(p));
    },
    watchSystem() {
      if (darkQuery && darkQuery.addEventListener)
        darkQuery.addEventListener('change', () => read('mode') === 'system' && this.emit());
    },
  };
})();

const BRIDGE = (() => {
  const embedded = window.parent !== window;
  const handlers = {};
  let frame = null;
  const peer = () => (embedded ? window.parent : frame && frame.contentWindow);
  window.addEventListener('message', (e) => {
    const d = e.data;
    if (!d || d.ns !== PROTO_NS || !peer() || e.source !== peer())
      return;
    if (d.type === 'prefs')
      PREFS.emit();
    if (handlers[d.type])
      handlers[d.type](d);
  });
  // Another tab of the prototype changed a preference.
  window.addEventListener('storage', (e) => {
    if (e.key && e.key.startsWith('thakurg-proto-') && /-(lang|skin|mode)$/.test(e.key))
      PREFS.emit();
  });
  return {
    embedded,
    /** Dashboard side: the content frame. */
    attach(iframe) {
      frame = iframe;
    },
    on(type, fn) {
      handlers[type] = fn;
    },
    post(msg) {
      const w = peer();
      if (w)
        w.postMessage({ ns: PROTO_NS, ...msg }, '*');
    },
    /** Page side: does this page own the address (dashboard address space)? */
    owns(path) {
      return routeFor(path).id === window.PAGE_ID;
    },
    /** Page side: tells the dashboard where the page is now, so it can mark the sidebar and keep its own address. */
    report(innerPath, title) {
      if (!embedded)
        return;
      const r = routeById(window.PAGE_ID);
      this.post({ type: 'location', path: r && r.outer ? r.outer(innerPath) : innerPath, title: title || document.title });
    },
    /** Page side: an address that another page owns. Inside the dashboard the dashboard opens it; on its own the browser goes to that file. */
    leave(path) {
      if (embedded)
        this.post({ type: 'navigate', path });
      else
        location.href = routeUrl(path, window.PAGE_BASE || ''); // PAGE_BASE: 'pages/' for a page that sits next to index.html
    },
  };
})();

if (BRIDGE.embedded)
  document.documentElement.classList.add('in-dashboard');
PREFS.watchSystem();
