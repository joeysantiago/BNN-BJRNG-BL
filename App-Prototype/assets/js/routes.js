/* The one route table of the prototype. The master dashboard builds its sidebar from it, and every page uses it to know
   which addresses it owns and which file to hand the others to. Add a feature here and it appears everywhere. */
'use strict';

/** Old addresses that the real site redirects. */
const ROUTE_REDIRECTS = {
  '/hr': '/HR', '/Nexon': '/nexon', '/Creta': '/creta', '/audio': '/creta', '/config': '/master', '/speedtest': '/',
  // The SnapKhata OTP login and PIN screens are gone: SnapKhata uses the common login.
  '/khata/login': '/login', '/khata/set-pin': '/khata/app', '/khata/unlock': '/khata/app',
};

const ROUTE_GROUPS = [
  { id: 'site', label: { en: 'Website', hi: 'वेबसाइट', ar: 'الموقع' } },
  { id: 'apps', label: { en: 'Apps', hi: 'ऐप्स', ar: 'التطبيقات' } },
  { id: 'info', label: { en: 'Information', hi: 'जानकारी', ar: 'معلومات' } },
  { id: 'system', label: { en: 'System', hi: 'सिस्टम', ar: 'النظام' } },
];

/**
 * id: page id (also window.PAGE_ID of its file), file: the page in pages/, match: addresses it owns,
 * home: where the sidebar item goes (a function of the language for the speed test), links: extra sidebar links shown under the item,
 * outer/inner: for pages with their own address space (SnapTracker), how its addresses map into the dashboard's.
 */
const ROUTES = [
  {
    id: 'about', group: 'info', file: 'about.html', icon: 'info', match: /^\/about$/, home: '/about',
    label: { en: 'About', hi: 'हमारे बारे में', ar: 'حول الموقع' },
  },
  {
    id: 'privacy', group: 'info', file: 'privacy.html', icon: 'shield', match: /^\/privacy$/, home: '/privacy',
    label: { en: 'Privacy', hi: 'गोपनीयता', ar: 'الخصوصية' },
  },
  {
    id: 'terms', group: 'info', file: 'terms.html', icon: 'file', match: /^\/terms$/, home: '/terms',
    label: { en: 'Terms', hi: 'शर्तें', ar: 'الشروط' },
  },
  {
    id: 'account', group: 'system', file: 'account.html', icon: 'user', match: /^\/(login|signup|profile)$/, home: '/login',
    label: { en: 'Log in', hi: 'लॉग इन', ar: 'تسجيل الدخول' },
    links: [
      { path: '/signup', label: { en: 'Sign up', hi: 'साइन अप', ar: 'إنشاء حساب' } },
      { path: '/profile', label: { en: 'Profile', hi: 'प्रोफ़ाइल', ar: 'الملف الشخصي' } },
    ],
  },
  {
    id: 'settings', group: 'system', file: 'settings.html', icon: 'sliders', match: /^\/master$/, home: '/master',
    label: { en: 'Settings', hi: 'सेटिंग्स', ar: 'الإعدادات' },
  },
  {
    id: 'status', group: 'system', file: 'status.html', icon: 'alert', match: /^\/(404|error|offline|disabled)$/, home: '/404', fallback: true,
    label: { en: 'Status pages', hi: 'स्थिति पेज', ar: 'صفحات الحالة' },
    links: [
      { path: '/error', label: { en: 'Something went wrong', hi: 'कुछ गड़बड़ हो गई', ar: 'حدث خطأ ما' } },
      { path: '/offline', label: { en: 'You are offline', hi: 'आप ऑफ़लाइन हैं', ar: 'أنت غير متصل' } },
    ],
  },
];

const cleanPath = (path) => {
  const p = (String(path || '/').split('?')[0].replace(/\/+$/, '')) || '/';
  return ROUTE_REDIRECTS[p] || p;
};

/** The route that owns an address (dashboard address space). Unknown addresses belong to the status page (404). */
const routeFor = (path) => ROUTES.find((r) => r.match.test(cleanPath(path))) || ROUTES.find((r) => r.fallback);

const routeById = (id) => ROUTES.find((r) => r.id === id);

const routeHome = (r, lang) => (typeof r.home === 'function' ? r.home(lang) : r.home);

/** The address inside the page file for a dashboard address (only SnapTracker differs). */
const routeInner = (r, path) => (r.inner ? r.inner(path) : path);

/** The page file and hash for a dashboard address; `base` is '' from inside pages/ and 'pages/' from index.html. */
const routeUrl = (path, base) => {
  const r = routeFor(path);
  return `${base}${r.file}#${routeInner(r, path)}`;
};
