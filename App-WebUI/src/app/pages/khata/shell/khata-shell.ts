import { filter, map } from 'rxjs';
import { Lang } from '../../../core/site';
import { toSignal } from '@angular/core/rxjs-interop';
import { KhataIcon } from '../ui/khata-icon/khata-icon';
import { AuthService } from '../../../core/auth.service';
import { I18nService } from '../../../core/i18n.service';
import { UserAvatar } from '../../../shared/user-avatar';
import { ThemeService } from '../../../core/theme.service';
import { DOCUMENT, NgTemplateOutlet } from '@angular/common';
import { KhataUiService } from '../../../core/khata-ui.service';
import { KhataPwaService } from '../../../core/khata-pwa.service';
import { Skin, ThemeMode } from '../../../core/models/theme.model';
import { KhataStateService } from '../../../core/khata-state.service';
import { KhataStyleService } from '../../../core/khata-style.service';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { KhataIconName, KhataMenu, KhataNavItem } from '../../../core/models/khata.model';
import { Component, ElementRef, OnDestroy, afterNextRender, computed, effect, inject, signal, viewChild } from '@angular/core';

const SWIPE_PX = 50;
const THEME_FADE_MS = 450;
const CHROME = { dark: '#0e0b19', light: '#eef1f7' };
const MODES: ThemeMode[] = ['light', 'dark', 'system'];
const MODE_ICONS: Record<ThemeMode, KhataIconName> = { light: 'sun', dark: 'moon', system: 'monitor' };

/**
 * SnapKhata app frame (/khata/app/...), mobile first: a top bar and a bottom tab bar with a big "new entry" button on phones,
 * a side rail on wide screens. It also hosts the "are you sure?" sheet, the photo viewer and the toast, and carries the
 * SnapKhata design system (styles/*.scss), so its styles are not scoped to this component.
 */
@Component({
  selector: 'app-khata-shell',
  templateUrl: './khata-shell.html',
  styleUrl: './khata-shell.scss',
  host: { '(document:keydown)': 'key($event)', '(document:click)': 'outside($event)' },
  imports: [RouterOutlet, RouterLink, NgTemplateOutlet, KhataIcon, UserAvatar],
})

export class KhataShell implements OnDestroy {
  protected readonly modes = MODES;
  private swipeX: number | null = null;
  private readonly doc = inject(DOCUMENT);
  private readonly router = inject(Router);
  protected readonly modeIcons = MODE_ICONS;
  protected readonly auth = inject(AuthService);
  protected readonly i18n = inject(I18nService);
  private readonly pwa = inject(KhataPwaService);
  protected readonly ui = inject(KhataUiService);
  protected readonly theme = inject(ThemeService);
  protected readonly state = inject(KhataStateService);
  protected readonly style = inject(KhataStyleService);
  /** The open top-bar menu (language or theme), if any. */
  protected readonly menu = signal<KhataMenu | null>(null);
  private readonly root = viewChild<ElementRef<HTMLElement>>('root');
  protected readonly bookId = computed(() => this.state.current()?.id ?? 0);
  private readonly sheet = viewChild<ElementRef<HTMLDialogElement>>('sheet');
  private readonly viewer = viewChild<ElementRef<HTMLDialogElement>>('viewer');
  protected readonly viewerItem = computed(() => this.ui.viewer()?.items[this.ui.viewer()!.index] ?? null);
  /** On a party's ledger the new-entry button opens the form for that party. */
  protected readonly newEntryQuery = computed(() => {
    const contact = /\/contact\/(\d+)(?:$|[/?#])/.exec(this.url())?.[1];
    return contact ? { contact } : {};
  });
  private readonly url = toSignal(this.router.events.pipe(filter((e) => e instanceof NavigationEnd), map(() => this.router.url)), { initialValue: this.router.url });
  /** Which tab / rail link is lit for the current address. */
  protected readonly section = computed(() => {
    const path = this.url().split(/[?#]/)[0];
    if (/^\/khata\/app\/books/.test(path))
      return 'books';
    if (/^\/khata\/app\/profile/.test(path))
      return 'profile';
    if (/^\/khata\/app\/settings/.test(path))
      return 'settings';
    if (/^\/khata\/app\/b\/\d+\/?$/.test(path))
      return 'home';
    if (/^\/khata\/app\/b\/\d+\/(parties|contact)/.test(path))
      return 'parties';
    if (/^\/khata\/app\/b\/\d+\/(entries|e\/)/.test(path))
      return 'entries';
    return '';
  });
  protected readonly nav = computed<KhataNavItem[]>(() => {
    const id = this.bookId();
    const items: KhataNavItem[] = [{ id: 'home', key: 'khata.nav.home', link: id ? `/khata/app/b/${id}` : '/khata/app', icon: 'home' }];
    if (id)
      items.push({ id: 'parties', key: 'khata.nav.parties', link: `/khata/app/b/${id}/parties`, icon: 'users' }, { id: 'entries', key: 'khata.nav.entries', link: `/khata/app/b/${id}/entries`, icon: 'list' });
    items.push({ id: 'books', key: 'khata.nav.books', link: '/khata/app/books', icon: 'book' }, { id: 'profile', key: 'khata.nav.profile', link: '/khata/app/profile', icon: 'user' }, { id: 'settings', key: 'khata.nav.settings', link: '/khata/app/settings', icon: 'settings' });
    return items;
  });

  constructor() {
    this.style.load();
    afterNextRender(() => {
      this.pwa.enter();
      void this.state.loadBooks().catch(() => null);
    });
    // The browser's address-bar colour follows the SnapKhata theme.
    effect(() => this.doc.querySelector('meta[name=theme-color]')?.setAttribute('content', CHROME[this.theme.brightness()]));
    // The sheet and the viewer are native modal dialogs: focus stays inside and Escape closes them.
    effect(() => this.toggle(this.sheet()?.nativeElement, !!this.ui.sheet()));
    effect(() => this.toggle(this.viewer()?.nativeElement, !!this.ui.viewer()));
  }

  // #region Public Methods

  ngOnDestroy(): void {
    this.pwa.leave();
    this.ui.answer(false);
    this.ui.closeViewer();
  }

  setLang(lang: Lang): void {
    this.i18n.set(lang);
    this.menu.set(null);
  }

  /** One of the four styles (Glass, Clay, Skeu, Neu); the same choice as the site's theme menu. */
  setSkin(skin: Skin): void {
    const root = this.root()?.nativeElement;
    root?.classList.add('k-theming');
    this.theme.set(skin);
    setTimeout(() => root?.classList.remove('k-theming'), THEME_FADE_MS);
  }

  /** Left / Right step through the photo viewer; in Arabic they swap, like the layout. */
  key(ev: KeyboardEvent): void {
    if (ev.key === 'Escape' && this.menu()) {
      this.menu.set(null);
      return;
    }
    if (!this.ui.viewer() || (ev.key !== 'ArrowRight' && ev.key !== 'ArrowLeft'))
      return;
    ev.preventDefault();
    this.ui.step((ev.key === 'ArrowRight') !== (this.i18n.dir() === 'rtl') ? 1 : -1);
  }

  /** A click outside the open top-bar menu closes it. */
  outside(ev: MouseEvent): void {
    if (this.menu() && !(ev.target as Element | null)?.closest('.k-menu'))
      this.menu.set(null);
  }

  setMode(mode: ThemeMode): void {
    const root = this.root()?.nativeElement;
    root?.classList.add('k-theming');
    this.theme.setMode(mode);
    setTimeout(() => root?.classList.remove('k-theming'), THEME_FADE_MS);
  }

  switchBook(value: string): void {
    void this.router.navigateByUrl(value === 'books' ? '/khata/app/books' : `/khata/app/b/${value}`);
  }

  swipeEnd(ev: PointerEvent): void {
    if (this.swipeX === null)
      return;
    const dx = ev.clientX - this.swipeX;
    this.swipeX = null;
    if (Math.abs(dx) > SWIPE_PX)
      this.ui.step((dx < 0) !== (this.i18n.dir() === 'rtl') ? 1 : -1);
  }

  toggleMenu(menu: KhataMenu): void {
    this.menu.set(this.menu() === menu ? null : menu);
  }

  swipeStart(ev: PointerEvent): void {
    this.swipeX = ev.clientX;
  }

  // #endregion

  // #region Private Methods

  private toggle(dialog: HTMLDialogElement | undefined, open: boolean): void {
    if (!dialog)
      return;
    if (open && !dialog.open)
      dialog.showModal();
    else if (!open && dialog.open)
      dialog.close();
  }

  // #endregion
}
