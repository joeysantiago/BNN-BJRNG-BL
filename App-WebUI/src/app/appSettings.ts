import { AppSettings } from './core/models/app-settings.model';

// Public app settings. Never put secrets here: this file ships in the browser bundle.
export const APP_SETTINGS: AppSettings = {
  githubRepo: 'joeysantiago/BNN-BJRNG-BL',

  // YouTube page. Pasting a video link always works. To also search by song name and open playlists, create a YouTube Data API v3
  // key in Google Cloud, restrict it to your site address (HTTP referrers), and paste it here. A restricted key is safe in the browser.
  // `server` is the https address of the helper that makes the 320 kbps MP3 downloads (npm run youtube); `token` is its YT_TOKEN, if any.
  // Leave it empty to use the same host as the page on port 8787 when testing locally, or let visitors enter it on the page.
  youtube: { apiKey: '', server: '', token: '' },

  // Features. Set one to false to hide it everywhere it appears. Everything here can also be changed live on the /config page
  // (saved in the visitor's browser, on top of the values in this file). A page set to false shows "page not found".
  features: {
    'site.install': true, // "Install app" button in the header
    'site.theme': true, // skin picker in the header
    'site.language': true, // language picker in the header
    'site.nav': true, // speed test / connection / services links in the header
    'site.footer': true, // About, Privacy, Terms and Settings links in the footer
    'page.speed': true,
    'page.youtube': true,
    'page.creta': true,
    'page.nexon': true,
    'page.hr': true,
    'page.kunal': true,
    'page.preetik': true,
    'page.about': true,
    'page.privacy': true,
    'page.terms': true,
    'speed.clock': true,
    'speed.progress': true,
    'speed.loaded': true,
    'speed.share': true,
    'speed.save': true,
    'speed.image': true,
    'speed.history': true,
    'speed.info': true,
    'yt.search': true,
    'yt.play': true,
    'yt.video': true,
    'yt.seek': true,
    'yt.shuffle': true,
    'yt.repeat': true,
    'yt.volume': true,
    'yt.queue': true,
    'yt.playlists': true,
    'yt.download': false,
    'audio.doodle': true,
    'audio.seek': true,
    'audio.shuffle': true,
    'audio.repeat': true,
    'audio.volume': true,
    'audio.playlist': true,
    'audio.edit': true,
  },

  // Page names per language. Change the text here and the menu, footer and section headings follow.
  pageNames: {
    speed: { en: 'Speed test', hi: 'स्पीड टेस्ट', ar: 'اختبار السرعة' },
    connection: { en: 'Your connection details', hi: 'आपके कनेक्शन का विवरण', ar: 'تفاصيل اتصالك' },
    services: { en: 'Services status', hi: 'सेवाओं की स्थिति', ar: 'حالة الخدمات' },
    about: { en: 'About', hi: 'हमारे बारे में', ar: 'حول الموقع' },
    privacy: { en: 'Privacy', hi: 'गोपनीयता', ar: 'الخصوصية' },
    terms: { en: 'Terms', hi: 'शर्तें', ar: 'الشروط' },
    creta: { en: 'Creta audio', hi: 'क्रेटा ऑडियो', ar: 'مشغل كريتا' },
    nexon: { en: 'Nexon audio', hi: 'नेक्सॉन ऑडियो', ar: 'مشغل نيكسون' },
    hr: { en: 'Atrium HR', hi: 'एट्रियम एचआर', ar: 'أتريوم للموارد البشرية' },
  },

  // "Your connection details". Set a row to false to hide it, or enabled to false to hide the whole section.
  connection: {
    enabled: true,
    fields: {
      isp: true,
      ip: true,
      ipv4: true,
      ipv6: false,
      mac: false, // browsers cannot read a MAC address; the row explains that
      location: true,
      testServer: true,
      networkType: false,
    },
  },

  // "Services status". Set enabled to false on a service to hide it, or on the section to hide everything.
  // Services with a statusPage use their official status. The others get a reachability check from the visitor's browser.
  services: {
    enabled: true,
    refreshSeconds: 120,
    items: [
      { id: 'teams', name: 'Microsoft Teams', group: 'apps', enabled: true, url: 'https://teams.microsoft.com' },
      { id: 'github', name: 'GitHub', group: 'apps', enabled: true, url: 'https://github.com', statusPage: 'https://www.githubstatus.com' },
      { id: 'cloudflare', name: 'Cloudflare', group: 'apps', enabled: true, url: 'https://www.cloudflare.com', statusPage: 'https://www.cloudflarestatus.com' },
      { id: 'discord', name: 'Discord', group: 'apps', enabled: true, url: 'https://discord.com', statusPage: 'https://discordstatus.com' },
      { id: 'facebook', name: 'Facebook', group: 'apps', enabled: true, url: 'https://www.facebook.com' },
      { id: 'whatsapp', name: 'WhatsApp', group: 'apps', enabled: true, url: 'https://web.whatsapp.com' },
      { id: 'x', name: 'X', group: 'apps', enabled: true, url: 'https://x.com', probeUrl: 'https://x.com/favicon.ico' },
      { id: 'reddit', name: 'Reddit', group: 'apps', enabled: true, url: 'https://www.reddit.com', statusPage: 'https://www.redditstatus.com' },
      { id: 'zoom', name: 'Zoom', group: 'apps', enabled: true, url: 'https://zoom.us', statusPage: 'https://www.zoomstatus.com' },
      { id: 'npm', name: 'npm', group: 'apps', enabled: true, url: 'https://www.npmjs.com', statusPage: 'https://status.npmjs.org' },
      { id: 'instagram', name: 'Instagram', group: 'apps', enabled: true, url: 'https://www.instagram.com' },
      { id: 'youtube', name: 'YouTube', group: 'apps', enabled: true, url: 'https://www.youtube.com' },
      { id: 'google', name: 'Google', group: 'apps', enabled: true, url: 'https://www.google.com' },
      { id: 'slack', name: 'Slack', group: 'apps', enabled: true, url: 'https://slack.com' },
      { id: 'telegram', name: 'Telegram', group: 'apps', enabled: true, url: 'https://web.telegram.org' },
      { id: 'dropbox', name: 'Dropbox', group: 'apps', enabled: true, url: 'https://www.dropbox.com', statusPage: 'https://status.dropbox.com' },
      { id: 'jio', name: 'Jio', group: 'telecom', enabled: true, url: 'https://www.jio.com' },
      { id: 'airtel', name: 'Airtel', group: 'telecom', enabled: true, url: 'https://www.airtel.in' },
      { id: 'vi', name: 'Vi', group: 'telecom', enabled: true, url: 'https://www.myvi.in', probeUrl: 'https://www.vodafoneidea.com' },
      { id: 'bsnl', name: 'BSNL', group: 'telecom', enabled: true, url: 'https://www.bsnl.co.in' },
    ],
  },
};
