import { FeatureGroup, FeatureId, FeatureInfo } from './models/app-settings.model';

export const FEATURE_GROUPS: { id: FeatureGroup; label: string; help: string }[] = [
  { id: 'site', label: 'Site header and footer', help: 'Shown on every page.' },
  { id: 'pages', label: 'Pages', help: 'A page that is off shows "page not found" and its links disappear.' },
  { id: 'speed', label: 'Speed test page', help: 'Parts of the home page. Connection details and Services status have their own switches below.' },
  { id: 'youtube', label: 'YouTube page', help: 'Search, play and download options.' },
  { id: 'audio', label: 'Creta and Nexon audio players', help: 'Both players share these options.' },
];

export const FEATURES: FeatureInfo[] = [
  { id: 'site.install', group: 'site', label: 'Install app button', help: 'The "Install" button in the header.' },
  { id: 'site.theme', group: 'site', label: 'Skin picker', help: 'The palette menu in the header.' },
  { id: 'site.language', group: 'site', label: 'Language picker', help: 'English, Hindi and Arabic switch in the header.' },
  { id: 'site.nav', group: 'site', label: 'Header navigation', help: 'Speed test, connection and services links.' },
  { id: 'site.footer', group: 'site', label: 'Footer links', help: 'About, Privacy and Terms links.' },

  { id: 'page.speed', group: 'pages', label: 'Speed test (home)', help: 'The home page in all languages.' },
  { id: 'page.youtube', group: 'pages', label: 'YouTube', help: '/youtube' },
  { id: 'page.creta', group: 'pages', label: 'Creta audio', help: '/creta' },
  { id: 'page.nexon', group: 'pages', label: 'Nexon audio', help: '/nexon' },
  { id: 'page.hr', group: 'pages', label: 'Atrium HR', help: '/HR' },
  { id: 'page.about', group: 'pages', label: 'About', help: '/about' },
  { id: 'page.privacy', group: 'pages', label: 'Privacy', help: '/privacy' },
  { id: 'page.terms', group: 'pages', label: 'Terms', help: '/terms' },

  { id: 'speed.clock', group: 'speed', label: 'Clock and elapsed time', help: 'The two chips under the gauge.' },
  { id: 'speed.progress', group: 'speed', label: 'Progress bar', help: 'Whole-test progress.' },
  { id: 'speed.loaded', group: 'speed', label: 'Latency under load', help: 'The "loaded" hint after a test.' },
  { id: 'speed.share', group: 'speed', label: 'Share result', help: 'Share and copy buttons.' },
  { id: 'speed.save', group: 'speed', label: 'Save result', help: 'Save to history button.' },
  { id: 'speed.image', group: 'speed', label: 'Result image', help: 'Create image button.' },
  { id: 'speed.history', group: 'speed', label: 'History', help: 'List of saved results.' },
  { id: 'speed.info', group: 'speed', label: 'Explainer and FAQ', help: 'The article below the tool.' },

  { id: 'yt.search', group: 'youtube', label: 'Search by name', help: 'Search box and API key form. When off, only pasted links work.' },
  { id: 'yt.play', group: 'youtube', label: 'Play', help: 'The player, controls and play buttons. When off the page only lists results.' },
  { id: 'yt.video', group: 'youtube', label: 'Video options', help: 'Show/hide video, quality and full screen.' },
  { id: 'yt.seek', group: 'youtube', label: 'Seek bar', help: 'Position slider.' },
  { id: 'yt.shuffle', group: 'youtube', label: 'Shuffle', help: 'Shuffle button.' },
  { id: 'yt.repeat', group: 'youtube', label: 'Repeat', help: 'Repeat button.' },
  { id: 'yt.volume', group: 'youtube', label: 'Volume', help: 'Mute button and volume slider.' },
  { id: 'yt.queue', group: 'youtube', label: 'Queue', help: 'Add to queue and the queue list.' },
  { id: 'yt.playlists', group: 'youtube', label: 'Playlists', help: 'Saved playlists and "add to playlist" buttons.' },
  { id: 'yt.download', group: 'youtube', label: 'Download', help: 'The 320 kbps MP3 download buttons.' },

  { id: 'audio.doodle', group: 'audio', label: 'Dance doodle', help: 'The animated figure.' },
  { id: 'audio.seek', group: 'audio', label: 'Seek bar', help: 'Position slider.' },
  { id: 'audio.shuffle', group: 'audio', label: 'Shuffle', help: 'Shuffle button.' },
  { id: 'audio.repeat', group: 'audio', label: 'Repeat', help: 'Repeat button.' },
  { id: 'audio.volume', group: 'audio', label: 'Volume', help: 'Mute button and volume slider.' },
  { id: 'audio.playlist', group: 'audio', label: 'Playlist', help: 'The list of tracks.' },
  { id: 'audio.edit', group: 'audio', label: 'Add and delete tracks', help: 'Upload, delete and GitHub token setup.' },
];

const PAGE_FEATURES: Record<string, FeatureId> = {
  '/': 'page.speed',
  '/hi': 'page.speed',
  '/ar': 'page.speed',
  '/youtube': 'page.youtube',
  '/creta': 'page.creta',
  '/nexon': 'page.nexon',
  '/HR': 'page.hr',
  '/about': 'page.about',
  '/privacy': 'page.privacy',
  '/terms': 'page.terms',
};

/** The switch that controls the page at this address, or null for pages that cannot be switched off (config, errors). */
export function pageFeature(url: string): FeatureId | null {
  const path = url.split(/[?#]/)[0].replace(/\/+$/, '') || '/';
  return PAGE_FEATURES[path] ?? null;
}
