import { filter, map } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';
import { I18nService } from '../../../core/i18n.service';
import { KhataPinSheet } from '../pin-sheet/khata-pin-sheet';
import { KhataStateService } from '../../../core/khata-state.service';
import { KhataSessionService } from '../../../core/khata-session.service';
import { Component, afterNextRender, computed, inject } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';

/** SnapKhata app frame (/khata/app/...): its own top bar with the book switcher, lock and profile, instead of the site header. */
@Component({
  selector: 'app-khata-shell',
  imports: [RouterOutlet, RouterLink, KhataPinSheet],
  templateUrl: './khata-shell.html',
  styleUrl: './khata-shell.scss',
})

export class KhataShell {
  private readonly router = inject(Router);
  protected readonly i18n = inject(I18nService);
  protected readonly state = inject(KhataStateService);
  protected readonly session = inject(KhataSessionService);
  protected readonly bookId = computed(() => Number(/\/khata\/app\/b\/(\d+)/.exec(this.url())?.[1] ?? 0));
  private readonly url = toSignal(this.router.events.pipe(filter((e) => e instanceof NavigationEnd), map(() => this.router.url)), { initialValue: this.router.url });

  constructor() {
    afterNextRender(() => void this.state.loadBooks().catch(() => null));
  }

  // #region Public Methods

  lock(): void {
    this.session.lock();
  }

  switchBook(value: string): void {
    void this.router.navigateByUrl(value === 'books' ? '/khata/app/books' : `/khata/app/b/${value}`);
  }

  // #endregion
}
