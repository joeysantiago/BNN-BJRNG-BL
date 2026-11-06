import { filter, map, startWith } from 'rxjs';
import { Title } from '@angular/platform-browser';
import { toSignal } from '@angular/core/rxjs-interop';
import { AuthService } from '../../../core/auth.service';
import { I18nService } from '../../../core/i18n.service';
import { UserAvatar } from '../../../shared/user-avatar';
import { ThemeService } from '../../../core/theme.service';
import { TrackerAdd } from '../ui/tracker-add/tracker-add';
import { TrackerIcon } from '../ui/tracker-icon/tracker-icon';
import { TrackerMenus } from '../ui/tracker-menus/tracker-menus';
import { TrackerNavItem } from '../../../core/models/tracker.model';
import { TrackerDrawer } from '../ui/tracker-drawer/tracker-drawer';
import { TrackerStateService } from '../../../core/tracker-state.service';
import { TrackerOverlays } from '../ui/tracker-overlays/tracker-overlays';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { Component, ViewEncapsulation, afterNextRender, computed, effect, inject } from '@angular/core';

/**
 * The frame of the SnapTracker app, the same as My Tasks and SnapKhata: a rail on wide screens, a top bar (tracking status, alerts bell, and the site's own
 * Install, Theme and Language menus) and bottom tabs with the Add button on phones, plus the transaction drawer, the Add sheet and the toasts.
 * The name of the app comes from the page names (code "tracker"), so a new name shows here and in the browser tab. The site header and footer are hidden on these screens (app.ts).
 */
@Component({
  selector: 'app-tracker-shell',
  imports: [RouterOutlet, RouterLink, TrackerIcon, TrackerDrawer, TrackerAdd, TrackerMenus, TrackerOverlays, UserAvatar],
  templateUrl: './tracker-shell.html',
  styleUrl: './tracker-shell.scss',
  encapsulation: ViewEncapsulation.None,
})

export class TrackerShell {
  private readonly title = inject(Title);
  private readonly router = inject(Router);
  protected readonly auth = inject(AuthService);
  protected readonly i18n = inject(I18nService);
  protected readonly theme = inject(ThemeService);
  protected readonly state = inject(TrackerStateService);
  protected readonly appName = computed(() => this.i18n.page('tracker'));
  protected readonly crumb = computed(() => this.i18n.t('tracker.nav.' + (this.screen() || 'home')));
  /** The screen that is open: the path after /tracker/app (empty for the dashboard). */
  protected readonly screen = computed(() => this.url().split(/[?#]/)[0].replace(/^\/tracker\/app\/?/, '').split('/')[0]);
  private readonly url = toSignal(this.router.events.pipe(filter((e) => e instanceof NavigationEnd), map(() => this.router.url), startWith(this.router.url)), { initialValue: this.router.url });
  protected readonly nav: TrackerNavItem[] = [
    { path: '/tracker/app', icon: 'home', label: 'tracker.nav.home' },
    { path: '/tracker/app/transactions', icon: 'list', label: 'tracker.nav.transactions' },
    { path: '/tracker/app/privacy', icon: 'shield', label: 'tracker.nav.privacy' },
    { path: '/tracker/app/alerts', icon: 'bell', label: 'tracker.nav.alerts' },
    { path: '/tracker/app/how', icon: 'layers', label: 'tracker.nav.how' },
    { path: '/master', icon: 'settings', label: 'tracker.nav.settings', query: { tab: 'general', app: 'tracker' } },
  ];

  constructor() {
    effect(() => this.title.setTitle(`${this.crumb()} · ${this.appName()}`));
    afterNextRender(() => void this.state.load());
  }

  // #region Public Methods

  /** The rail link or bottom tab of the screen that is open. */
  current(path: string): string | null {
    const screen = path.replace(/^\/tracker\/app\/?/, '');
    return path.startsWith('/tracker/app') && screen === this.screen() ? 'page' : null;
  }

  // #endregion
}
