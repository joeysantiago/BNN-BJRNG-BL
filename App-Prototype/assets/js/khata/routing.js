/* SnapKhata: Routing and guards. Moved from thakurg.html as it was; see App-Prototype/README.md for the page layout. */
'use strict';

// #region Routing and guards

const LOADING_PAGE = /^\/khata\/app\/b\/\d+(\/(parties|entries|contact\/\d+))?$/;

function khataGuard(path) {
  if (!path.startsWith('/khata/'))
    return null;
  if (path === '/khata/login')
    return null;
  if (!K.loggedIn)
    return '/khata/login';
  if (path === '/khata/set-pin')
    return K.hasPin ? (K.unlocked ? '/khata/app' : '/khata/unlock') : null;
  if (!K.hasPin)
    return '/khata/set-pin';
  if (path === '/khata/unlock')
    return K.unlocked ? '/khata/app' : null;
  if (!K.unlocked)
    return '/khata/unlock?next=' + encodeURIComponent(path);
  if (path === '/khata/app' && K.books.length)
    return `/khata/app/b/${K.books.some((b) => b.id === K.bookId) ? K.bookId : K.books[0].id}`;
  return null;
}

function khataView(parts) {
  khataScreenChanged();
  const sub = parts.slice(1).join('/');
  if (!sub)
    return landingPage();
  if (sub === 'login')
    return loginPage();
  if (sub === 'set-pin' || sub === 'unlock')
    return pinPage(sub === 'set-pin' ? 'set' : 'unlock');
  const app = parts.slice(2);
  if (app[0] === 'b')
    K.bookId = +app[1];
  let inner;
  if (!app.length)
    inner = homePage();
  else if (app[0] === 'books' && app.length === 1)
    inner = booksPage();
  else if (app[0] === 'profile' && app.length === 1)
    inner = profilePage();
  else if (app[0] === 'b' && app.length === 2)
    inner = dashboardPage(+app[1]);
  else if (app[0] === 'b' && app[2] === 'parties' && app.length === 3)
    inner = partiesPage(+app[1]);
  else if (app[0] === 'b' && app[2] === 'entries' && app.length === 3)
    inner = entriesPage(+app[1]);
  else if (app[0] === 'b' && app[2] === 'new' && app.length === 3)
    inner = entryFormPage(+app[1], null);
  else if (app[0] === 'b' && app[2] === 'contact' && app.length === 4)
    inner = ledgerPage(+app[1], +app[3]);
  else if (app[0] === 'b' && app[2] === 'contact' && app[4] === 'settings' && app.length === 5)
    inner = contactSettingsPage(+app[1], +app[3]);
  else if (app[0] === 'b' && app[2] === 'e' && app.length === 4)
    inner = entryPage(+app[1], +app[3]);
  else if (app[0] === 'b' && app[2] === 'e' && app[4] === 'edit' && app.length === 5)
    inner = entryFormPage(+app[1], +app[3]);
  else
    inner = notFound('KHATA_PAGE_NOT_FOUND');
  return shell(inner);
}

/** Leaving a screen clears its open forms and messages, like a new component instance would; list screens show a short loading state, like an API call. */
let lastKhataPath = '';
function khataScreenChanged() {
  const path = S.route.path;
  if (path === lastKhataPath)
    return;
  lastKhataPath = path;
  K.ui = freshUi();
  K.error = '';
  K.anim = true;
  K.viewer = null;
  dropDraft();
  if (LOADING_PAGE.test(path)) {
    K.ui.loading = true;
    setTimeout(() => {
      if (S.route.path === path && K.ui.loading) {
        K.ui.loading = false;
        render();
      }
    }, 380);
  }
}

// #endregion

