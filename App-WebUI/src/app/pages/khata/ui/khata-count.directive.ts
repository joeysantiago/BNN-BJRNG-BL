import { Lang } from '../../../core/site';
import { formatMoney } from '../../../core/khata-format';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { KhataCurrency } from '../../../core/models/khata.model';
import { Directive, ElementRef, PLATFORM_ID, effect, inject, input } from '@angular/core';

const COUNT_MS = 900;

/** Writes an amount into its element and, the first time, counts it up from zero (not when the reader prefers less motion). `<b [kCount]="minor" [currency]="cur" [lang]="i18n.lang()"></b>` */
@Directive({ selector: '[kCount]' })

export class KhataCountDirective {
  private started = false;
  readonly lang = input.required<Lang>();
  private readonly doc = inject(DOCUMENT);
  readonly kCount = input.required<number>();
  private readonly el = inject(ElementRef<HTMLElement>);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  readonly currency = input.required<KhataCurrency | null | undefined>();

  constructor() {
    effect(() => {
      const currency = this.currency();
      const target = this.kCount();
      const lang = this.lang();
      if (!currency)
        return;
      const reduce = this.doc.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? true;
      if (this.started || !this.browser || reduce || !target) {
        this.started = true;
        this.write(formatMoney(target, currency, lang));
        return;
      }
      this.started = true;
      this.run(target, currency, lang);
    });
  }

  // #region Private Methods

  private write(text: string): void {
    (this.el.nativeElement as HTMLElement).textContent = text;
  }

  private run(target: number, currency: KhataCurrency, lang: Lang): void {
    const start = performance.now();
    const step = (now: number): void => {
      const p = Math.min(1, (now - start) / COUNT_MS);
      this.write(formatMoney(Math.round(target * (1 - Math.pow(1 - p, 3))), currency, lang));
      if (p < 1 && (this.el.nativeElement as HTMLElement).isConnected && this.kCount() === target && this.lang() === lang)
        requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  // #endregion
}
