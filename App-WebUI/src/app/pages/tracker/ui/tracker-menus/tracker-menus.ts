import { SiteTools } from '../../../../shared/site-tools';
import { Component, ViewEncapsulation } from '@angular/core';

/**
 * The Install, Theme and Language buttons of the SnapTracker top bar: the site's own SiteTools, so they look and work the same as in SnapKhata, My Tasks
 * and on the speed test page. Its styles also carry the five skins of the app and the dropdown look, global under .st.
 */
@Component({
  selector: 'app-tracker-menus',
  imports: [SiteTools],
  templateUrl: './tracker-menus.html',
  styleUrl: './tracker-menus.scss',
  encapsulation: ViewEncapsulation.None,
  host: { class: 'menus' },
})

export class TrackerMenus {}
