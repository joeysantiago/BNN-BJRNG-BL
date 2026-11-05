import { filter, map } from 'rxjs';
import { SiteTools } from './site-tools';
import { UserAvatar } from './user-avatar';
import { AuthService } from '../core/auth.service';
import { I18nService } from '../core/i18n.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { SettingsService } from '../core/settings.service';
import { FEATURE_APPS, featureBuilt } from '../core/features';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { Component, ElementRef, HostListener, computed, inject, signal } from '@angular/core';

const SPEED_PATHS = new Set(['/', '/hi', '/ar']);

@Component({
  selector: 'app-site-header',
  imports: [RouterLink, SiteTools, UserAvatar],
  templateUrl: './site-header.html',
  styleUrl: './site-header.scss',
})

export class SiteHeader {
  protected readonly i18n = inject(I18nService);
  protected readonly cfg = inject(SettingsService);
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly settings = this.cfg.settings;
  // The navigation holds only speed test links, so a branch without the speed test has none.
  protected readonly hasNav = featureBuilt('site.nav', FEATURE_APPS);
  protected readonly userOpen = signal(false);

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  protected readonly onSpeedRoute = computed(() => SPEED_PATHS.has(this.path(this.url())));

  /** The login and sign-up page shows its own form, so the header has no "Log in" link there. */
  protected readonly onAuthRoute = computed(() => /^\/(login|signup)(\/|$|[?#])/.test(this.url()));

  /** Where the login page sends the visitor back to: this page, unless it is the login or sign-up page itself. */
  protected readonly loginParams = computed(() => (this.onAuthRoute() ? {} : { next: this.url() }));

  // #region Private Methods

  protected toggleUser(): void {
    this.userOpen.update((v) => !v);
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    this.userOpen.set(false);
  }

  private path(url: string): string {
    const p = url.split(/[?#]/)[0].replace(/\/+$/, '');
    return p === '' ? '/' : p;
  }

  /** A click outside the user menu closes it; the Install, Theme and Language menus (SiteTools) close themselves the same way. */
  @HostListener('document:click', ['$event'])
  protected onDocClick(ev: Event): void {
    if (this.userOpen() && !this.inside('.menu.user', ev))
      this.userOpen.set(false);
  }

  protected async logout(): Promise<void> {
    this.userOpen.set(false);
    await this.auth.logout();
  }

  private inside(selector: string, ev: Event): boolean {
    return !!this.host.nativeElement.querySelector(selector)?.contains(ev.target as Node);
  }

  // #endregion
}
