import { Speedtest } from './speedtest';
import { Routes } from '@angular/router';

/** Speed test: the public home page. Each language has its own URL so search engines can index all three. Keep these first in FEATURE_ROUTES. */
export const SPEEDTEST_ROUTES: Routes = [
  { path: '', component: Speedtest, data: { lang: 'en' } },
  { path: 'hi', component: Speedtest, data: { lang: 'hi' } },
  { path: 'ar', component: Speedtest, data: { lang: 'ar' } },

  // Old address of the speed test page. speedtest.html itself is a static redirect file in /public.
  { path: 'speedtest', redirectTo: '' },
];
