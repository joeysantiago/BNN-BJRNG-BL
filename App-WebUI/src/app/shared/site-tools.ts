import { Router } from '@angular/router';
import { Lang, langInfo } from '../core/site';
import { I18nService } from '../core/i18n.service';
import { ThemeService } from '../core/theme.service';
import { InstallService } from '../core/install.service';
import { SettingsService } from '../core/settings.service';
import { Skin, ThemeMode } from '../core/models/theme.model';
import { Component, ElementRef, inject, signal, viewChild } from '@angular/core';

const SPEED_PATHS = new Set(['/', '/hi', '/ar']);

/**
 * The Install, Theme and Language buttons of a top bar, with their menus, as on the speed test page. The site header, the My Tasks top bar and both
 * SnapKhata top bars use this one component, so the three buttons look and work the same on every page of every branch. Its own class names keep
 * the apps' .btn and .card styles off it.
 */
@Component({
  selector: 'app-site-tools',
  templateUrl: './site-tools.html',
  styleUrl: './site-tools.scss',
  host: { '(document:click)': 'outside($event)', '(document:keydown.escape)': 'menu.set(null)' },
})

export class SiteTools {
  private readonly router = inject(Router);
  protected readonly i18n = inject(I18nService);
  protected readonly theme = inject(ThemeService);
  protected readonly cfg = inject(SettingsService);
  protected readonly install = inject(InstallService);
  protected readonly menu = signal<'lang' | 'theme' | null>(null);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly ios = viewChild.required<ElementRef<HTMLDialogElement>>('ios');

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

  toggle(menu: 'lang' | 'theme'): void {
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
