import { SiteTools } from '../../../../shared/site-tools';
import { Component, ViewEncapsulation } from '@angular/core';

/**
 * The Install, Theme and Language buttons of the My Tasks top bar: the site's own SiteTools, so they look and work the same as on the speed test page.
 * Its styles also carry the four style token sets of the app (Glass, Clay, Skeu, Neu) and the dropdown look, global under .mt.
 */
@Component({
  selector: 'app-tasks-menus',
  imports: [SiteTools],
  templateUrl: './tasks-menus.html',
  styleUrl: './tasks-menus.scss',
  encapsulation: ViewEncapsulation.None,
  host: { class: 'menus' },
})

export class TasksMenus {}
