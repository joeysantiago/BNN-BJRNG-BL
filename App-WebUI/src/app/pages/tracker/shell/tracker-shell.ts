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
import { TrackerDetails } from '../ui/tracker-details/tracker-details';
import { TrackerStateService } from '../../../core/tracker-state.service';
import { TrackerOverlays } from '../ui/tracker-overlays/tracker-overlays';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { Component, ViewEncapsulation, afterNextRender, computed, effect, inject, signal } from '@angular/core';

/**
 * The frame of the SnapTracker app, the same as My Tasks and SnapKhata: a rail on wide screens, a top bar (tracking status, alerts bell, and the site's own
 * Install, Theme and Language menus) and bottom tabs with the Add button on phones, plus the transaction drawer, the Add sheet and the toasts.
 * The name of the app comes from the page names (code "tracker"), so a new name shows here and in the browser tab. The site header and footer are hidden on these screens (app.ts).
 * Until the user has given their names and mobiles ("My details"), it asks for them once ("Later" asks again on the next visit).
 */
@Component({
  selector: 'app-tracker-shell',
  imports: [RouterOutlet, RouterLink, TrackerIcon, TrackerDrawer, TrackerAdd, TrackerMenus, TrackerOverlays, UserAvatar, TrackerDetails],
  templateUrl: './tracker-shell.html',
  styleUrl: './tracker-shell.scss',
  encapsulation: ViewEncapsulation.None,
})

export class TrackerShell {
  private readonly title = inject(Title);
  private readonly router = inject(Router);
  private readonly skipped = signal(false);
  protected readonly auth = inject(AuthService);
  protected readonly i18n = inject(I18nService);
  protected readonly theme = inject(ThemeService);
  protected readonly state = inject(TrackerStateService);
  protected readonly appName = computed(() => this.i18n.page('tracker'));
  protected readonly crumb = computed(() => this.i18n.t('tracker.nav.' + (this.screen() || 'home')));
  /** The screen that is open: the path after /tracker/app (empty for the dashboard). */
  protected readonly screen = computed(() => this.url().split(/[?#]/)[0].replace(/^\/tracker\/app\/?/, '').split('/')[0]);
  /** "My details" is asked while the user has given neither a name nor a mobile, until they save it or choose "Later" for this visit. */
  protected readonly askDetails = computed(() => !this.skipped() && !!this.state.data()?.owner && !this.state.data()!.owner.names.length && !this.state.data()!.owner.mobiles.length);
  private readonly url = toSignal(this.router.events.pipe(filter((e) => e instanceof NavigationEnd), map(() => this.router.url), startWith(this.router.url)), { initialValue: this.router.url });
  protected readonly nav: TrackerNavItem[] = [
    { path: '/tracker/app', icon: 'home', label: 'tracker.nav.home' },
    { path: '/tracker/app/transactions', icon: 'list', label: 'tracker.nav.transactions' },
    { path: '/tracker/app/cards', icon: 'wallet', label: 'tracker.nav.cards' },
    { path: '/tracker/app/alerts', icon: 'bell', label: 'tracker.nav.alerts' },
    { path: '/tracker/app/how', icon: 'layers', label: 'tracker.nav.how' },
    { path: '/master', icon: 'settings', label: 'tracker.nav.settings', query: { tab: 'general', app: 'tracker' } },
  ];

  constructor() {
    effect(() => this.title.setTitle(`${this.crumb()} · ${this.appName()}`));
    afterNextRender(() => void this.state.load());
  }

  // #region Public Methods

  later(): void {
    this.skipped.set(true);
  }

  /** The rail link or bottom tab of the screen that is open. */
  current(path: string): string | null {
    const screen = path.replace(/^\/tracker\/app\/?/, '');
    return path.startsWith('/tracker/app') && screen === this.screen() ? 'page' : null;
  }

  // #endregion
}
