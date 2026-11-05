import { SITE_NAME } from '../core/site';
import { RouterLink } from '@angular/router';
import { I18nService } from '../core/i18n.service';
import { SettingsService } from '../core/settings.service';
import { Component, DestroyRef, ElementRef, afterNextRender, inject } from '@angular/core';

@Component({
  selector: 'app-site-footer',
  imports: [RouterLink],
  templateUrl: './site-footer.html',
  styleUrl: './site-footer.scss',
})

export class SiteFooter {
  protected readonly site = SITE_NAME;
  protected readonly i18n = inject(I18nService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly cfg = inject(SettingsService);
  protected readonly year = new Date().getFullYear();
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /**
   * Puts the footer's real height in --foot-space on <html>, kept up to date: a bigger system font or the phone's gesture bar makes it taller than --foot-h,
   * and every page leaves that room under its end (app shell), so nothing hides behind the footer. Hidden (an app with its own tab bar), it is 0.
   */
  constructor() {
    afterNextRender(() => {
      const root = document.documentElement;
      const foot = this.host.nativeElement.querySelector('footer')!;
      const observer = new ResizeObserver(() => root.style.setProperty('--foot-space', `${foot.offsetHeight}px`));
      observer.observe(foot);
      this.destroyRef.onDestroy(() => {
        observer.disconnect();
        root.style.removeProperty('--foot-space');
      });
    });
  }
}
