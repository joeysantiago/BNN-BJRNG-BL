import { filter, map } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';
import { SiteTools } from '../../../shared/site-tools';
import { KhataIcon } from '../ui/khata-icon/khata-icon';
import { KhataLock } from '../ui/khata-lock/khata-lock';
import { AuthService } from '../../../core/auth.service';
import { I18nService } from '../../../core/i18n.service';
import { UserAvatar } from '../../../shared/user-avatar';
import { ThemeService } from '../../../core/theme.service';
import { DOCUMENT, NgTemplateOutlet } from '@angular/common';
import { AppPwaService } from '../../../core/app-pwa.service';
import { KhataUiService } from '../../../core/khata-ui.service';
import { KhataLockService } from '../../../core/khata-lock.service';
import { KhataStateService } from '../../../core/khata-state.service';
import { KhataStyleService } from '../../../core/khata-style.service';
import { KhataMenu, KhataNavItem } from '../../../core/models/khata.model';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { Component, ElementRef, OnDestroy, afterNextRender, computed, effect, inject, signal, untracked, viewChild } from '@angular/core';

const SWIPE_PX = 50;
const CHROME = { dark: '#0e0b19', light: '#eef1f7' };

/**
 * SnapKhata app frame (/khata/app/...), mobile first: a top bar and a bottom tab bar with a big "new entry" button on phones,
 * a side rail on wide screens. It also hosts the "are you sure?" sheet, the photo viewer and the toast, and carries the
 * SnapKhata design system (styles/*.scss), so its styles are not scoped to this component. While the installed app is locked
 * (KhataLockService) it shows the PIN screen instead of the pages.
 */
@Component({
  selector: 'app-khata-shell',
  templateUrl: './khata-shell.html',
  styleUrl: './khata-shell.scss',
  host: { '(document:keydown)': 'key($event)', '(document:click)': 'outside($event)' },
  imports: [RouterOutlet, RouterLink, NgTemplateOutlet, KhataIcon, KhataLock, SiteTools, UserAvatar],
})

export class KhataShell implements OnDestroy {
  private swipeX: number | null = null;
  private readonly doc = inject(DOCUMENT);
  private readonly router = inject(Router);
  private readonly pwa = inject(AppPwaService);
  protected readonly auth = inject(AuthService);
  protected readonly i18n = inject(I18nService);
  protected readonly ui = inject(KhataUiService);
  protected readonly theme = inject(ThemeService);
  protected readonly lock = inject(KhataLockService);
  protected readonly state = inject(KhataStateService);
  protected readonly style = inject(KhataStyleService);
  /** The open top-bar menu (the book picker), if any; Install, Theme and Language are SiteTools. */
  protected readonly menu = signal<KhataMenu | null>(null);
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
    items.push({ id: 'books', key: 'khata.nav.books', link: '/khata/app/books', icon: 'book' }, { id: 'profile', key: 'khata.nav.profile', link: '/profile', icon: 'user' }, { id: 'settings', key: 'khata.nav.settings', link: '/master', query: { tab: 'general', app: 'khata' }, icon: 'settings' });
    return items;
  });

  constructor() {
    this.style.load();
    afterNextRender(() => {
      this.pwa.enter('khata');
      void this.startLock();
    });
    // The books (and every page) load only while the installed app is unlocked; unlocking again reloads them.
    effect(() => {
      if (this.lock.open())
        untracked(() => void this.state.loadBooks().catch(() => null));
    });
    // When the lock comes up nothing may stay above the PIN screen: the sheet, the photo viewer (native top-layer dialogs) and the book menu close.
    effect(() => {
      if (!this.lock.open())
        untracked(() => this.closeAll());
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

  /** Opens a book from the picker; 0 is "Manage books…". */
  switchBook(bookId: number): void {
    this.menu.set(null);
    void this.router.navigateByUrl(bookId ? `/khata/app/b/${bookId}` : '/khata/app/books');
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

  private closeAll(): void {
    this.menu.set(null);
    this.ui.answer(false);
    this.ui.closeViewer();
  }

  /** Starts the app lock; ?pin=change (the "Change PIN" button of Settings > General) then opens the PIN change here, where the PIN screen lives. */
  private async startLock(): Promise<void> {
    await this.lock.start();
    if (this.router.parseUrl(this.router.url).queryParams['pin'] !== 'change')
      return;
    this.lock.change();
    void this.router.navigate([], { queryParams: { pin: null }, queryParamsHandling: 'merge', replaceUrl: true });
  }

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
