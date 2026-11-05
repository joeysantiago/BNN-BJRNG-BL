/** The apps whose manifest the API builds (the keys of AppManifests:Apps on the API, and page names of the PageNames table). */
export type InstallableApp = 'khata' | 'creta' | 'nexon' | 'youtube' | 'tasks';

/** Every app that installs on its own, each at its own address /apps/<code>/. The speed test uses the site's manifest (public/manifest.webmanifest). */
export type AppWindow = InstallableApp | 'speedtest';
