import { userApps } from '../core/apps';
import { Lang, langInfo } from '../core/site';
import { AuthService } from '../core/auth.service';
import { I18nService } from '../core/i18n.service';
import { ThemeService } from '../core/theme.service';
import { Router, RouterLink } from '@angular/router';
import { InstallService } from '../core/install.service';
import { SettingsService } from '../core/settings.service';
import { Skin, ThemeMode } from '../core/models/theme.model';
import { KhataLockService } from '../core/khata-lock.service';
import { TasksLockService } from '../core/tasks-lock.service';
import { Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';

const SPEED_PATHS = new Set(['/', '/hi', '/ar']);

/**
 * The Apps, Install, Theme and Language buttons of a top bar, with their menus, as on the speed test page. The site header, the My Tasks and SnapTracker
 * top bars and both SnapKhata top bars use this one component, so the buttons look and work the same on every page of every branch. Its own class names
 * keep the apps' .btn and .card styles off it. The Apps menu switches straight to another app of the account, so nobody has to go through the profile.
 */
@Component({
  selector: 'app-site-tools',
  imports: [RouterLink],
  templateUrl: './site-tools.html',
  styleUrl: './site-tools.scss',
  host: { '(document:click)': 'outside($event)', '(document:keydown.escape)': 'menu.set(null)' },
})

export class SiteTools {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  protected readonly i18n = inject(I18nService);
  protected readonly theme = inject(ThemeService);
  protected readonly cfg = inject(SettingsService);
  protected readonly install = inject(InstallService);
  private readonly khataLock = inject(KhataLockService);
  private readonly tasksLock = inject(TasksLockService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  protected readonly menu = signal<'apps' | 'lang' | 'theme' | null>(null);
  private readonly ios = viewChild.required<ElementRef<HTMLDialogElement>>('ios');
  /** The apps of the Apps menu (core/apps.ts userApps, only those routed here); none while logged out or while an app lock asks for its PIN. */
  protected readonly apps = computed(() => (!this.auth.user() || this.khataLock.blocked() || this.tasksLock.blocked() ? [] : userApps(this.auth.isAdmin(), this.auth.apps(), this.router.config).filter((a) => a.path)));

  // #region Public Methods

  iosOpen(): void {
    this.ios().nativeElement.showModal();
  }

  pickSkin(skin: Skin): void {
    this.theme.set(skin);
    this.menu.set(null);
  }

  outside(ev: Event): void {
    if (this.menu() && !this.host.nativeElement.contains(ev.target as Node))
      this.menu.set(null);
  }

  /** The app whose screen is open: its path starts with the same first part as the address (/khata/app/... is SnapKhata). */
  isCurrent(path: string | null): boolean {
    return !!path && this.path(this.router.url).split('/')[1] === path.split('/')[1];
  }

  /** Dark, Light or System; the menu stays open so a skin can be picked next. */
  pickMode(mode: ThemeMode): void {
    this.theme.setMode(mode);
  }

  pickLang(code: Lang): void {
    this.menu.set(null);
    this.i18n.set(code);
    // On the speed test the language is part of the URL, so each language has its own page.
    if (SPEED_PATHS.has(this.path(this.router.url)))
      void this.router.navigateByUrl(langInfo(code).home);
  }

  toggle(menu: 'apps' | 'lang' | 'theme'): void {
    this.menu.set(this.menu() === menu ? null : menu);
  }

  /** Clicking the dark backdrop of the dialog closes it. */
  onDialogClick(ev: MouseEvent): void {
    if (ev.target === this.ios().nativeElement)
      this.ios().nativeElement.close();
  }

  // #endregion

  // #region Private Methods

  private path(url: string): string {
    const p = url.split(/[?#]/)[0].replace(/\/+$/, '');
    return p === '' ? '/' : p;
  }

  // #endregion
}
