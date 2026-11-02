/* Common login of the prototype, simulated in this browser (localStorage), with the same rules as the real API (App-WebAPI, /api/auth and /api/admin/users):
   one e-mail + password account for the whole site, sign-up gives SnapKhata and SnapTracker, an administrator gives Creta, Nexon, YouTube and Atrium HR on /master,
   administrators open every app, 5 wrong passwords lock the account for 15 minutes. Loaded by every page (SnapTracker too), so everything lives inside AUTH
   and no loose global name can clash with a page's own code. The screens are in auth-ui.js (thakurg.com pages) and in snaptracker.js (its gate). */
'use strict';

const AUTH = (() => {
  const USERS = 'thakurg-proto-auth-users';
  const SESSION = 'thakurg-proto-auth-session';
  const MIN_PASSWORD = 8;
  const MAX_FAILED = 5;
  const LOCK_MINUTES = 15;
  const MAX_NAME = 100;
  const LANGS = ['en', 'hi', 'ar'];
  /** The apps of the site; autoGrant apps are given on sign-up. home: where the app opens (dashboard address space). */
  const APPS = [
    { code: 'khata', autoGrant: true, home: '/khata/app' },
    { code: 'tracker', autoGrant: true, home: '/tracker/app' },
    { code: 'creta', autoGrant: false, home: '/creta' },
    { code: 'nexon', autoGrant: false, home: '/nexon' },
    { code: 'youtube', autoGrant: false, home: '/youtube' },
    { code: 'hr', autoGrant: false, home: '/HR' },
  ];
  /** Addresses that need a login: [address, app code ('' = login only), name key]. Everything else (speed test, About, Privacy, Terms, status pages, /khata) is public. */
  const NEEDS = [
    [/^\/youtube$/, 'youtube', 'youtube'],
    [/^\/creta(-add)?$/, 'creta', 'creta'],
    [/^\/nexon(-add)?$/, 'nexon', 'nexon'],
    [/^\/HR$/, 'hr', 'hr'],
    [/^\/khata\/./, 'khata', 'khata'],
    [/^\/tracker(\/|$)/, 'tracker', 'tracker'],
    [/^\/master$/, '', 'master'],
    [/^\/profile$/, '', 'profile'],
  ];
  /** Prototype demo accounts, created the first time the prototype runs. */
  const DEMO = [
    { email: 'admin@demo.local', password: 'admin12345', displayName: 'Demo admin', isAdmin: true, apps: [] },
    { email: 'user@demo.local', password: 'user12345', displayName: 'Demo user', isAdmin: false, apps: ['khata', 'tracker'] },
  ];

  // The API's messages (Messages seed rows, INSERT/Common/001_Messages.sql), so the prototype shows the same texts.
  const MESSAGE_ROWS = {
    AUTH_SIGNED_UP: { en: 'Your account was created.', hi: 'आपका खाता बन गया।', ar: 'تم إنشاء حسابك.' },
    AUTH_LOGIN_INVALID: { en: 'The e-mail or password is not correct.', hi: 'ई-मेल या पासवर्ड सही नहीं है।', ar: 'البريد الإلكتروني أو كلمة المرور غير صحيحة.' },
    AUTH_LOCKED: { en: 'Too many wrong tries. Try again in {0} minutes.', hi: 'बहुत सारी गलत कोशिशें। {0} मिनट बाद फिर कोशिश करें।', ar: 'محاولات خاطئة كثيرة. حاول مرة أخرى بعد {0} دقيقة.' },
    AUTH_EMAIL_INVALID: { en: 'Enter a valid e-mail address.', hi: 'मान्य ई-मेल पता दर्ज करें।', ar: 'أدخل عنوان بريد إلكتروني صالحًا.' },
    AUTH_EMAIL_TAKEN: { en: 'An account with this e-mail already exists. Log in instead.', hi: 'इस ई-मेल से पहले से एक खाता है। इसके बजाय लॉग इन करें।', ar: 'يوجد حساب بهذا البريد الإلكتروني بالفعل. سجّل الدخول بدلًا من ذلك.' },
    AUTH_PASSWORD_WEAK: { en: 'The password must be at least {0} characters long.', hi: 'पासवर्ड कम से कम {0} अक्षरों का होना चाहिए।', ar: 'يجب ألا تقل كلمة المرور عن {0} أحرف.' },
    AUTH_PASSWORD_WRONG: { en: 'The current password is not correct.', hi: 'मौजूदा पासवर्ड सही नहीं है।', ar: 'كلمة المرور الحالية غير صحيحة.' },
    AUTH_PASSWORD_CHANGED: { en: 'Your password was changed. Other devices have been logged out.', hi: 'आपका पासवर्ड बदल दिया गया। दूसरे डिवाइस से लॉग आउट कर दिया गया है।', ar: 'تم تغيير كلمة المرور. تم تسجيل الخروج من الأجهزة الأخرى.' },
    AUTH_PROFILE_SAVED: { en: 'Your profile was saved.', hi: 'आपकी प्रोफ़ाइल सहेज ली गई।', ar: 'تم حفظ ملفك الشخصي.' },
    AUTH_PROFILE_INVALID: { en: 'Enter a name of up to {0} characters and choose a language.', hi: '{0} अक्षरों तक का नाम दर्ज करें और भाषा चुनें।', ar: 'أدخل اسمًا لا يزيد عن {0} حرفًا واختر لغة.' },
    AUTH_SESSION_INVALID: { en: 'Your session has ended. Please log in again.', hi: 'आपका सत्र समाप्त हो गया। कृपया फिर से लॉग इन करें।', ar: 'انتهت جلستك. يرجى تسجيل الدخول مرة أخرى.' },
    AUTH_LOGGED_OUT: { en: 'You have been logged out.', hi: 'आप लॉग आउट हो गए हैं।', ar: 'تم تسجيل خروجك.' },
    AUTH_FORBIDDEN: { en: 'You do not have access to this. Ask an administrator to give you access.', hi: 'आपके पास इसकी पहुँच नहीं है। किसी एडमिन से पहुँच देने के लिए कहें।', ar: 'ليس لديك صلاحية الوصول إلى هذا. اطلب من المسؤول منحك الصلاحية.' },
    AUTH_USER_NOT_FOUND: { en: 'This user was not found.', hi: 'यह उपयोगकर्ता नहीं मिला।', ar: 'لم يتم العثور على هذا المستخدم.' },
    AUTH_APP_UNKNOWN: { en: 'The app "{0}" does not exist.', hi: 'ऐप "{0}" मौजूद नहीं है।', ar: 'التطبيق "{0}" غير موجود.' },
    AUTH_LAST_ADMIN: { en: 'At least one administrator must remain.', hi: 'कम से कम एक एडमिन रहना चाहिए।', ar: 'يجب أن يبقى مسؤول واحد على الأقل.' },
    AUTH_ACCESS_SAVED: { en: 'Access was saved.', hi: 'पहुँच सहेज ली गई।', ar: 'تم حفظ الصلاحيات.' },
  };

  // UI texts (Translations rows) of the login screens, the header menu, the access panel and the Users & access panel.
  const TEXT = {
    en: {
      'auth.login': 'Log in',
      'auth.signup': 'Sign up',
      'auth.logout': 'Log out',
      'auth.profile': 'Profile',
      'auth.master': 'Settings',
      'auth.menu': 'Account menu for {name}',
      'auth.email': 'E-mail',
      'auth.password': 'Password',
      'auth.password.current': 'Current password',
      'auth.password.new': 'New password',
      'auth.password.rule': 'At least {min} characters.',
      'auth.show': 'Show password',
      'auth.hide': 'Hide password',
      'auth.name': 'Display name',
      'auth.name.hint': 'Shown in the menu. You can leave it empty.',
      'auth.language': 'Language',
      'auth.busy': 'Please wait…',
      'auth.login.h1': 'Log in',
      'auth.login.lead': 'One account for every app on thakurg.com.',
      'auth.login.btn': 'Log in',
      'auth.login.toSignup': 'New here? Create an account',
      'auth.signup.h1': 'Create your account',
      'auth.signup.lead': 'SnapKhata and SnapTracker open right away. Creta, Nexon, YouTube and Atrium HR need an administrator to give you access.',
      'auth.signup.btn': 'Create account',
      'auth.signup.toLogin': 'Already have an account? Log in',
      'auth.signed.h1': 'You are logged in',
      'auth.signed.lead': 'Logged in as {email}.',
      'auth.continue': 'Continue',
      'auth.demo.h': 'Prototype: demo accounts',
      'auth.demo.lead': 'Accounts are kept in this browser only. Tap an account to fill the form.',
      'auth.demo.admin': 'Administrator',
      'auth.demo.user': 'User (SnapKhata and SnapTracker)',
      'auth.demo.use': 'Use {email}',
      'auth.profile.h1': 'Your profile',
      'auth.profile.lead': 'Logged in as {email}.',
      'auth.profile.admin': 'Administrator',
      'auth.profile.details': 'Your details',
      'auth.profile.save': 'Save profile',
      'auth.pw.h': 'Change password',
      'auth.pw.lead': 'Other devices are logged out when you change it.',
      'auth.pw.btn': 'Change password',
      'auth.apps.h': 'Your apps',
      'auth.apps.lead': 'Apps you can open. Ask an administrator for the others.',
      'auth.apps.adminLead': 'You are an administrator, so every app is open to you.',
      'auth.apps.open': 'Open',
      'auth.apps.none': 'No access',
      'auth.logout.h': 'Log out',
      'auth.logout.lead': 'Log out of thakurg.com on this device.',
      'auth.gate.login.h1': 'Log in to open {name}',
      'auth.gate.login.lead': '{name} is for logged-in users. Log in, or create a free account.',
      'auth.gate.denied.h1': 'No access to {name}',
      'auth.gate.signedAs': 'You are logged in as {email}.',
      'auth.gate.apps': 'See your apps',
      'auth.gate.switch': 'Log in as someone else',
      'auth.app.khata': 'SnapKhata',
      'auth.app.tracker': 'SnapTracker',
      'auth.app.creta': 'Creta audio',
      'auth.app.nexon': 'Nexon audio',
      'auth.app.youtube': 'YouTube',
      'auth.app.hr': 'Atrium HR',
      'auth.app.master': 'Settings',
      'auth.app.profile': 'your profile',
      'auth.users.h': 'Users & access',
      'auth.users.lead': 'Tick the apps each person may open, then save that person. SnapKhata and SnapTracker are given on sign-up. Administrators open every app and can change these settings.',
      'auth.users.admin': 'Administrator',
      'auth.users.adminHelp': 'Opens every app and this page.',
      'auth.users.apps': 'Apps for {email}',
      'auth.users.auto': 'given on sign-up',
      'auth.users.you': 'you',
      'auth.users.save': 'Save',
      'auth.users.saving': 'Saving…',
      'auth.adminOnly': 'Only an administrator can save settings. You can look around.',
      'auth.adminOnly.yt': 'Only an administrator can set the YouTube API key.',
      'seo.login.title': 'Log in · thakurg.com',
      'seo.signup.title': 'Create your account · thakurg.com',
      'seo.profile.title': 'Your profile · thakurg.com',
    },
    hi: {
      'auth.login': 'लॉग इन',
      'auth.signup': 'साइन अप',
      'auth.logout': 'लॉग आउट',
      'auth.profile': 'प्रोफ़ाइल',
      'auth.master': 'सेटिंग्स',
      'auth.menu': '{name} का खाता मेनू',
      'auth.email': 'ई-मेल',
      'auth.password': 'पासवर्ड',
      'auth.password.current': 'मौजूदा पासवर्ड',
      'auth.password.new': 'नया पासवर्ड',
      'auth.password.rule': 'कम से कम {min} अक्षर।',
      'auth.show': 'पासवर्ड दिखाएँ',
      'auth.hide': 'पासवर्ड छिपाएँ',
      'auth.name': 'दिखने वाला नाम',
      'auth.name.hint': 'मेनू में दिखता है। आप इसे खाली छोड़ सकते हैं।',
      'auth.language': 'भाषा',
      'auth.busy': 'कृपया रुकें…',
      'auth.login.h1': 'लॉग इन',
      'auth.login.lead': 'thakurg.com के हर ऐप के लिए एक खाता।',
      'auth.login.btn': 'लॉग इन',
      'auth.login.toSignup': 'नए हैं? खाता बनाएँ',
      'auth.signup.h1': 'अपना खाता बनाएँ',
      'auth.signup.lead': 'स्नैपखाता और स्नैपट्रैकर तुरंत खुलते हैं। क्रेटा, नेक्सॉन, यूट्यूब और एट्रियम एचआर के लिए किसी एडमिन से पहुँच लेनी होगी।',
      'auth.signup.btn': 'खाता बनाएँ',
      'auth.signup.toLogin': 'पहले से खाता है? लॉग इन करें',
      'auth.signed.h1': 'आप लॉग इन हैं',
      'auth.signed.lead': '{email} के रूप में लॉग इन।',
      'auth.continue': 'आगे बढ़ें',
      'auth.demo.h': 'प्रोटोटाइप: डेमो खाते',
      'auth.demo.lead': 'खाते सिर्फ़ इसी ब्राउज़र में रहते हैं। फ़ॉर्म भरने के लिए किसी खाते पर टैप करें।',
      'auth.demo.admin': 'एडमिन',
      'auth.demo.user': 'उपयोगकर्ता (स्नैपखाता और स्नैपट्रैकर)',
      'auth.demo.use': '{email} इस्तेमाल करें',
      'auth.profile.h1': 'आपकी प्रोफ़ाइल',
      'auth.profile.lead': '{email} के रूप में लॉग इन।',
      'auth.profile.admin': 'एडमिन',
      'auth.profile.details': 'आपकी जानकारी',
      'auth.profile.save': 'प्रोफ़ाइल सहेजें',
      'auth.pw.h': 'पासवर्ड बदलें',
      'auth.pw.lead': 'बदलने पर दूसरे डिवाइस से लॉग आउट हो जाएगा।',
      'auth.pw.btn': 'पासवर्ड बदलें',
      'auth.apps.h': 'आपके ऐप',
      'auth.apps.lead': 'जो ऐप आप खोल सकते हैं। बाकी के लिए किसी एडमिन से कहें।',
      'auth.apps.adminLead': 'आप एडमिन हैं, इसलिए हर ऐप आपके लिए खुला है।',
      'auth.apps.open': 'खोलें',
      'auth.apps.none': 'पहुँच नहीं',
      'auth.logout.h': 'लॉग आउट',
      'auth.logout.lead': 'इस डिवाइस पर thakurg.com से लॉग आउट करें।',
      'auth.gate.login.h1': '{name} खोलने के लिए लॉग इन करें',
      'auth.gate.login.lead': '{name} लॉग इन किए हुए उपयोगकर्ताओं के लिए है। लॉग इन करें या मुफ़्त खाता बनाएँ।',
      'auth.gate.denied.h1': '{name} की पहुँच नहीं',
      'auth.gate.signedAs': 'आप {email} के रूप में लॉग इन हैं।',
      'auth.gate.apps': 'अपने ऐप देखें',
      'auth.gate.switch': 'किसी और खाते से लॉग इन करें',
      'auth.app.khata': 'स्नैपखाता',
      'auth.app.tracker': 'स्नैपट्रैकर',
      'auth.app.creta': 'क्रेटा ऑडियो',
      'auth.app.nexon': 'नेक्सॉन ऑडियो',
      'auth.app.youtube': 'यूट्यूब',
      'auth.app.hr': 'एट्रियम एचआर',
      'auth.app.master': 'सेटिंग्स',
      'auth.app.profile': 'आपकी प्रोफ़ाइल',
      'auth.users.h': 'उपयोगकर्ता और पहुँच',
      'auth.users.lead': 'हर व्यक्ति जो ऐप खोल सकता है उन पर टिक करें, फिर उस व्यक्ति को सहेजें। स्नैपखाता और स्नैपट्रैकर साइन अप पर मिलते हैं। एडमिन हर ऐप खोल सकते हैं और ये सेटिंग्स बदल सकते हैं।',
      'auth.users.admin': 'एडमिन',
      'auth.users.adminHelp': 'हर ऐप और यह पेज खोल सकता है।',
      'auth.users.apps': '{email} के ऐप',
      'auth.users.auto': 'साइन अप पर मिलता है',
      'auth.users.you': 'आप',
      'auth.users.save': 'सहेजें',
      'auth.users.saving': 'सहेजा जा रहा है…',
      'auth.adminOnly': 'सिर्फ़ एडमिन सेटिंग्स सहेज सकते हैं। आप देख सकते हैं।',
      'auth.adminOnly.yt': 'सिर्फ़ एडमिन यूट्यूब API कुंजी सेट कर सकते हैं।',
      'seo.login.title': 'लॉग इन · thakurg.com',
      'seo.signup.title': 'अपना खाता बनाएँ · thakurg.com',
      'seo.profile.title': 'आपकी प्रोफ़ाइल · thakurg.com',
    },
    ar: {
      'auth.login': 'تسجيل الدخول',
      'auth.signup': 'إنشاء حساب',
      'auth.logout': 'تسجيل الخروج',
      'auth.profile': 'الملف الشخصي',
      'auth.master': 'الإعدادات',
      'auth.menu': 'قائمة حساب {name}',
      'auth.email': 'البريد الإلكتروني',
      'auth.password': 'كلمة المرور',
      'auth.password.current': 'كلمة المرور الحالية',
      'auth.password.new': 'كلمة المرور الجديدة',
      'auth.password.rule': '{min} أحرف على الأقل.',
      'auth.show': 'إظهار كلمة المرور',
      'auth.hide': 'إخفاء كلمة المرور',
      'auth.name': 'الاسم الظاهر',
      'auth.name.hint': 'يظهر في القائمة. يمكنك تركه فارغًا.',
      'auth.language': 'اللغة',
      'auth.busy': 'يرجى الانتظار…',
      'auth.login.h1': 'تسجيل الدخول',
      'auth.login.lead': 'حساب واحد لكل تطبيقات thakurg.com.',
      'auth.login.btn': 'تسجيل الدخول',
      'auth.login.toSignup': 'جديد هنا؟ أنشئ حسابًا',
      'auth.signup.h1': 'أنشئ حسابك',
      'auth.signup.lead': 'يفتح سناب خاتا وسناب تراكر مباشرة. يحتاج كريتا ونيكسون ويوتيوب وأتريوم إلى أن يمنحك المسؤول الصلاحية.',
      'auth.signup.btn': 'إنشاء الحساب',
      'auth.signup.toLogin': 'لديك حساب بالفعل؟ سجّل الدخول',
      'auth.signed.h1': 'أنت مسجّل الدخول',
      'auth.signed.lead': 'تم تسجيل الدخول باسم {email}.',
      'auth.continue': 'متابعة',
      'auth.demo.h': 'نموذج أولي: حسابات تجريبية',
      'auth.demo.lead': 'تُحفظ الحسابات في هذا المتصفح فقط. اضغط على حساب لتعبئة النموذج.',
      'auth.demo.admin': 'مسؤول',
      'auth.demo.user': 'مستخدم (سناب خاتا وسناب تراكر)',
      'auth.demo.use': 'استخدام {email}',
      'auth.profile.h1': 'ملفك الشخصي',
      'auth.profile.lead': 'تم تسجيل الدخول باسم {email}.',
      'auth.profile.admin': 'مسؤول',
      'auth.profile.details': 'بياناتك',
      'auth.profile.save': 'حفظ الملف الشخصي',
      'auth.pw.h': 'تغيير كلمة المرور',
      'auth.pw.lead': 'يتم تسجيل الخروج من الأجهزة الأخرى عند تغييرها.',
      'auth.pw.btn': 'تغيير كلمة المرور',
      'auth.apps.h': 'تطبيقاتك',
      'auth.apps.lead': 'التطبيقات التي يمكنك فتحها. اطلب الباقي من المسؤول.',
      'auth.apps.adminLead': 'أنت مسؤول، لذلك كل التطبيقات مفتوحة لك.',
      'auth.apps.open': 'فتح',
      'auth.apps.none': 'لا صلاحية',
      'auth.logout.h': 'تسجيل الخروج',
      'auth.logout.lead': 'سجّل الخروج من thakurg.com على هذا الجهاز.',
      'auth.gate.login.h1': 'سجّل الدخول لفتح {name}',
      'auth.gate.login.lead': '{name} للمستخدمين المسجّلين. سجّل الدخول أو أنشئ حسابًا مجانيًا.',
      'auth.gate.denied.h1': 'لا صلاحية للوصول إلى {name}',
      'auth.gate.signedAs': 'أنت مسجّل الدخول باسم {email}.',
      'auth.gate.apps': 'عرض تطبيقاتك',
      'auth.gate.switch': 'تسجيل الدخول بحساب آخر',
      'auth.app.khata': 'سناب خاتا',
      'auth.app.tracker': 'سناب تراكر',
      'auth.app.creta': 'مشغل كريتا',
      'auth.app.nexon': 'مشغل نيكسون',
      'auth.app.youtube': 'يوتيوب',
      'auth.app.hr': 'أتريوم للموارد البشرية',
      'auth.app.master': 'الإعدادات',
      'auth.app.profile': 'ملفك الشخصي',
      'auth.users.h': 'المستخدمون والصلاحيات',
      'auth.users.lead': 'حدّد التطبيقات التي يمكن لكل شخص فتحها، ثم احفظ ذلك الشخص. يُمنح سناب خاتا وسناب تراكر عند التسجيل. يفتح المسؤولون كل التطبيقات ويمكنهم تغيير هذه الإعدادات.',
      'auth.users.admin': 'مسؤول',
      'auth.users.adminHelp': 'يفتح كل التطبيقات وهذه الصفحة.',
      'auth.users.apps': 'تطبيقات {email}',
      'auth.users.auto': 'يُمنح عند التسجيل',
      'auth.users.you': 'أنت',
      'auth.users.save': 'حفظ',
      'auth.users.saving': 'جارٍ الحفظ…',
      'auth.adminOnly': 'يمكن للمسؤول فقط حفظ الإعدادات. يمكنك التصفح.',
      'auth.adminOnly.yt': 'يمكن للمسؤول فقط تعيين مفتاح YouTube API.',
      'seo.login.title': 'تسجيل الدخول · thakurg.com',
      'seo.signup.title': 'أنشئ حسابك · thakurg.com',
      'seo.profile.title': 'ملفك الشخصي · thakurg.com',
    },
  };

  // The thakurg.com pages read texts and messages from DICT and MESSAGES; SnapTracker has neither and reads them through AUTH.text().
  if (typeof DICT !== 'undefined')
    Object.keys(TEXT).forEach((lang) => Object.assign(DICT[lang], TEXT[lang]));
  if (typeof MESSAGES !== 'undefined')
    Object.assign(MESSAGES, MESSAGE_ROWS);

  const read = (key, fallback) => {
    try {
      const v = JSON.parse(localStorage.getItem(key));
      return v ?? fallback;
    } catch {
      return fallback;
    }
  };
  const write = (key, value) => {
    try {
      if (value === null)
        localStorage.removeItem(key);
      else
        localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* private mode: the login holds until the page closes */
    }
  };

  /** Prototype only: a quick hash so the plain password is not kept. The real API hashes on the server. */
  const hash = (salt, password) => {
    let h = 2166136261;
    for (const c of salt + ':' + password)
      h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
    return h.toString(16);
  };
  const salt = () => Math.random().toString(36).slice(2, 10);
  const normal = (email) => String(email || '').trim().toLowerCase();
  const validEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 256;
  const autoApps = () => APPS.filter((a) => a.autoGrant).map((a) => a.code);
  const ok = (code, data) => ({ ok: true, code, data });
  const fail = (code, status, args = []) => ({ ok: false, code, status, args });
  const pub = (u) => ({ id: u.id, email: u.email, displayName: u.displayName, language: u.language, isAdmin: u.isAdmin, apps: u.apps.slice() });

  function makeUser(id, email, password, displayName, isAdmin, apps) {
    const s = salt();
    return { id, email, displayName, language: 'en', isAdmin, apps, salt: s, hash: hash(s, password), failed: 0, lockedUntil: 0, ver: 1 };
  }

  function users() {
    let list = read(USERS, null);
    if (!Array.isArray(list) || !list.length) {
      list = DEMO.map((d, i) => makeUser(i + 1, d.email, d.password, d.displayName, d.isAdmin, d.apps.slice()));
      write(USERS, list);
    }
    return list;
  }

  const saveUsers = (list) => write(USERS, list);

  /** The logged-in account record, or null. Changing the password on another tab ends this session (the version no longer matches). */
  function me(list = users()) {
    const s = read(SESSION, null);
    if (!s)
      return null;
    const u = list.find((x) => x.id === s.userId);
    return u && u.ver === s.ver ? u : null;
  }

  const startSession = (u) => write(SESSION, { userId: u.id, ver: u.ver, at: Date.now() });

  function login(email, password) {
    const list = users();
    const u = list.find((x) => x.email === normal(email));
    const now = Date.now();
    if (!u)
      return fail('AUTH_LOGIN_INVALID', 401);
    if (u.lockedUntil > now)
      return fail('AUTH_LOCKED', 423, [Math.ceil((u.lockedUntil - now) / 60000)]);
    if (hash(u.salt, String(password || '')) !== u.hash) {
      u.failed = (u.failed || 0) + 1;
      if (u.failed >= MAX_FAILED) {
        u.failed = 0;
        u.lockedUntil = now + LOCK_MINUTES * 60000;
        saveUsers(list);
        return fail('AUTH_LOCKED', 423, [LOCK_MINUTES]);
      }
      saveUsers(list);
      return fail('AUTH_LOGIN_INVALID', 401);
    }
    u.failed = 0;
    u.lockedUntil = 0;
    saveUsers(list);
    startSession(u);
    return ok(null, pub(u));
  }

  function register(email, password, displayName, language) {
    const list = users();
    const mail = normal(email);
    const name = String(displayName || '').trim();
    if (!validEmail(mail))
      return fail('AUTH_EMAIL_INVALID', 400);
    if (String(password || '').length < MIN_PASSWORD)
      return fail('AUTH_PASSWORD_WEAK', 400, [MIN_PASSWORD]);
    if (name.length > MAX_NAME)
      return fail('AUTH_PROFILE_INVALID', 400, [MAX_NAME]);
    if (list.some((x) => x.email === mail))
      return fail('AUTH_EMAIL_TAKEN', 409);
    const u = makeUser(Math.max(0, ...list.map((x) => x.id)) + 1, mail, password, name || mail.split('@')[0], false, autoApps());
    u.language = LANGS.includes(language) ? language : 'en';
    list.push(u);
    saveUsers(list);
    startSession(u);
    return ok('AUTH_SIGNED_UP', pub(u));
  }

  function logout() {
    write(SESSION, null);
    return ok('AUTH_LOGGED_OUT', null);
  }

  function updateMe(displayName, language) {
    const list = users();
    const u = me(list);
    const name = String(displayName || '').trim();
    if (!u)
      return fail('AUTH_SESSION_INVALID', 401);
    if (!name.length || name.length > MAX_NAME || !LANGS.includes(language))
      return fail('AUTH_PROFILE_INVALID', 400, [MAX_NAME]);
    u.displayName = name;
    u.language = language;
    saveUsers(list);
    return ok('AUTH_PROFILE_SAVED', pub(u));
  }

  function changePassword(current, next) {
    const list = users();
    const u = me(list);
    if (!u)
      return fail('AUTH_SESSION_INVALID', 401);
    if (hash(u.salt, String(current || '')) !== u.hash)
      return fail('AUTH_PASSWORD_WRONG', 400);
    if (String(next || '').length < MIN_PASSWORD)
      return fail('AUTH_PASSWORD_WEAK', 400, [MIN_PASSWORD]);
    u.salt = salt();
    u.hash = hash(u.salt, next);
    u.ver++;
    saveUsers(list);
    startSession(u);
    return ok('AUTH_PASSWORD_CHANGED', null);
  }

  /** GET /admin/users. */
  function access() {
    const u = me();
    if (!u)
      return fail('AUTH_SESSION_INVALID', 401);
    if (!u.isAdmin)
      return fail('AUTH_FORBIDDEN', 403);
    return ok(null, { apps: APPS.map((a) => ({ code: a.code, autoGrant: a.autoGrant })), users: users().map(pub) });
  }

  /** PUT /admin/users/{id}: administrator flag and apps. At least one administrator must remain. */
  function setAccess(userId, isAdmin, apps) {
    const list = users();
    const admin = me(list);
    const u = list.find((x) => x.id === userId);
    const unknown = (apps || []).find((code) => !APPS.some((a) => a.code === code));
    if (!admin)
      return fail('AUTH_SESSION_INVALID', 401);
    if (!admin.isAdmin)
      return fail('AUTH_FORBIDDEN', 403);
    if (!u)
      return fail('AUTH_USER_NOT_FOUND', 404);
    if (unknown)
      return fail('AUTH_APP_UNKNOWN', 400, [unknown]);
    if (u.isAdmin && !isAdmin && list.filter((x) => x.isAdmin).length <= 1)
      return fail('AUTH_LAST_ADMIN', 409);
    u.isAdmin = !!isAdmin;
    u.apps = APPS.map((a) => a.code).filter((code) => apps.includes(code));
    saveUsers(list);
    return ok('AUTH_ACCESS_SAVED', pub(u));
  }

  /** What an address needs: undefined when it is public, otherwise { app, name } (app '' = any logged-in user). */
  function need(path) {
    const p = String(path || '/').split('?')[0];
    const hit = NEEDS.find(([re]) => re.test(p));
    return hit ? { app: hit[1], name: hit[2] } : undefined;
  }

  function can(app) {
    const u = me();
    return !!u && (u.isAdmin || !app || u.apps.includes(app));
  }

  /** null when the address may be shown, 'login' when nobody is logged in, 'access' when the account has no access. */
  function blocked(path) {
    const n = need(path);
    if (!n)
      return null;
    if (!me())
      return 'login';
    return can(n.app) ? null : 'access';
  }

  /** A message row in the given language, with {0}, {1} filled in. */
  function message(code, args = [], lang = 'en') {
    const row = MESSAGE_ROWS[code];
    const text = row ? row[lang] ?? row.en : code;
    return text.replace(/\{(\d+)\}/g, (m, i) => (args[i] !== undefined ? args[i] : m));
  }

  /** A UI text in the given language, with {name} placeholders filled in (not escaped). */
  function text(key, params, lang = 'en') {
    const value = (TEXT[lang] && TEXT[lang][key]) ?? TEXT.en[key] ?? key;
    return params ? value.replace(/\{(\w+)\}/g, (m, k) => (k in params ? params[k] : m)) : value;
  }

  // Another tab logged in or out: pages listen through onChange().
  const listeners = [];
  window.addEventListener('storage', (e) => {
    if (e.key === SESSION || e.key === USERS)
      listeners.forEach((fn) => fn());
  });

  return {
    APPS,
    DEMO,
    MIN_PASSWORD,
    current: () => {
      const u = me();
      return u ? pub(u) : null;
    },
    onChange: (fn) => listeners.push(fn),
    login,
    register,
    logout,
    updateMe,
    changePassword,
    access,
    setAccess,
    need,
    can,
    blocked,
    message,
    text,
  };
})();
