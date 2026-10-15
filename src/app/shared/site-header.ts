import { filter, map } from 'rxjs';
import { Lang, langInfo } from '../core/site';
import { Skin } from '../core/models/theme.model';
import { I18nService } from '../core/i18n.service';
import { ThemeService } from '../core/theme.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { InstallService } from '../core/install.service';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { Component, ElementRef, HostListener, computed, inject, signal, viewChild } from '@angular/core';

const SPEED_PATHS = new Set(['/', '/hi', '/ar']);

@Component({
  selector: 'app-site-header',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './site-header.html',
  styleUrl: './site-header.scss',
})
export class SiteHeader {
  protected readonly i18n = inject(I18nService);
  protected readonly theme = inject(ThemeService);
  protected readonly install = inject(InstallService);
  private readonly router = inject(Router);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly themeOpen = signal(false);
  private readonly ios = viewChild.required<ElementRef<HTMLDialogElement>>('ios');

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  protected readonly onSpeedRoute = computed(() => SPEED_PATHS.has(this.path(this.url())));

  // #region Private Methods

  protected iosOpen(): void {
    this.ios().nativeElement.showModal();
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    this.themeOpen.set(false);
  }

  protected pick(skin: Skin): void {
    this.theme.set(skin);
    this.themeOpen.set(false);
  }

  private path(url: string): string {
    const p = url.split(/[?#]/)[0].replace(/\/+$/, '');
    return p === '' ? '/' : p;
  }

  protected onLang(ev: Event): void {
    const code = (ev.target as HTMLSelectElement).value as Lang;
    this.i18n.set(code);
    // On the speed test the language is part of the URL, so each language has its own page.
    if (this.onSpeedRoute()) void this.router.navigateByUrl(langInfo(code).home);
  }

  @HostListener('document:click', ['$event'])
  protected onDocClick(ev: Event): void {
    if (this.themeOpen() && !this.host.nativeElement.querySelector('.menu')?.contains(ev.target as Node))
      this.themeOpen.set(false);
  }

  protected toggleTheme(ev: Event): void {
    ev.stopPropagation();
    this.themeOpen.update((v) => !v);
  }

  /** Clicking the dark backdrop of the dialog closes it. */
  protected onDialogClick(ev: MouseEvent): void {
    if (ev.target === this.ios().nativeElement) this.ios().nativeElement.close();
  }

  // #endregion
}
