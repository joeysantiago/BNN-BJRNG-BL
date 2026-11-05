import { filter, map } from 'rxjs';
import { UserAvatar } from './user-avatar';
import { Lang, langInfo } from '../core/site';
import { FEATURE_APPS, featureBuilt } from '../core/features';
import { Skin, ThemeMode } from '../core/models/theme.model';
import { AuthService } from '../core/auth.service';
import { I18nService } from '../core/i18n.service';
import { ThemeService } from '../core/theme.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { InstallService } from '../core/install.service';
import { SettingsService } from '../core/settings.service';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { Component, ElementRef, HostListener, computed, inject, signal, viewChild } from '@angular/core';

const SPEED_PATHS = new Set(['/', '/hi', '/ar']);

@Component({
  selector: 'app-site-header',
  imports: [RouterLink, UserAvatar],
  templateUrl: './site-header.html',
  styleUrl: './site-header.scss',
})

export class SiteHeader {
  protected readonly i18n = inject(I18nService);
  protected readonly theme = inject(ThemeService);
  protected readonly install = inject(InstallService);
  protected readonly cfg = inject(SettingsService);
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly settings = this.cfg.settings;
  // The navigation holds only speed test links, so a branch without the speed test has none.
  protected readonly hasNav = featureBuilt('site.nav', FEATURE_APPS);
  protected readonly themeOpen = signal(false);
  protected readonly langOpen = signal(false);
  protected readonly userOpen = signal(false);
  private readonly ios = viewChild.required<ElementRef<HTMLDialogElement>>('ios');

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

  protected iosOpen(): void {
    this.ios().nativeElement.showModal();
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    this.themeOpen.set(false);
    this.langOpen.set(false);
    this.userOpen.set(false);
  }

  protected pick(skin: Skin): void {
    this.theme.set(skin);
    this.themeOpen.set(false);
  }

  /** Dark, Light or System; the menu stays open so a skin can be picked next. */
  protected pickMode(mode: ThemeMode): void {
    this.theme.setMode(mode);
  }

  private path(url: string): string {
    const p = url.split(/[?#]/)[0].replace(/\/+$/, '');
    return p === '' ? '/' : p;
  }

  protected pickLang(code: Lang): void {
    this.langOpen.set(false);
    this.i18n.set(code);
    // On the speed test the language is part of the URL, so each language has its own page.
    if (this.onSpeedRoute())
      void this.router.navigateByUrl(langInfo(code).home);
  }

  @HostListener('document:click', ['$event'])
  protected onDocClick(ev: Event): void {
    if (this.themeOpen() && !this.inside('.menu.skin', ev))
      this.themeOpen.set(false);
    if (this.langOpen() && !this.inside('.menu.lang', ev))
      this.langOpen.set(false);
    if (this.userOpen() && !this.inside('.menu.user', ev))
      this.userOpen.set(false);
  }

  protected toggleUser(ev: Event): void {
    ev.stopPropagation();
    this.themeOpen.set(false);
    this.langOpen.set(false);
    this.userOpen.update((v) => !v);
  }

  protected toggleLang(ev: Event): void {
    ev.stopPropagation();
    this.themeOpen.set(false);
    this.userOpen.set(false);
    this.langOpen.update((v) => !v);
  }

  protected toggleTheme(ev: Event): void {
    ev.stopPropagation();
    this.userOpen.set(false);
    this.langOpen.set(false);
    this.themeOpen.update((v) => !v);
  }

  protected async logout(): Promise<void> {
    this.userOpen.set(false);
    await this.auth.logout();
  }

  /** Clicking the dark backdrop of the dialog closes it. */
  protected onDialogClick(ev: MouseEvent): void {
    if (ev.target === this.ios().nativeElement)
      this.ios().nativeElement.close();
  }

  private inside(selector: string, ev: Event): boolean {
    return !!this.host.nativeElement.querySelector(selector)?.contains(ev.target as Node);
  }

  // #endregion
}
