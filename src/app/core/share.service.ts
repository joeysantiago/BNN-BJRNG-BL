import { SITE_URL } from './site';
import { I18nService } from './i18n.service';
import { Injectable, inject } from '@angular/core';
import { ShareableResult } from './models/share.model';

export const fmtMbps = (n: number): string => (n >= 100 ? n.toFixed(0) : n.toFixed(1));

@Injectable({ providedIn: 'root' })
export class ShareService {
  private readonly i18n = inject(I18nService);

  get canNativeShare(): boolean {
    return typeof navigator !== 'undefined' && typeof navigator.share === 'function';
  }

  // #region Public Methods

  /** The page that gets shared. Its Open Graph image is the 1200 x 630 speed test card. */
  url(): string {
    return SITE_URL + this.i18n.info().home;
  }

  text(r: ShareableResult): string {
    return this.i18n.t('share.text', { down: fmtMbps(r.down), up: fmtMbps(r.up), ping: Math.round(r.ping) });
  }

  /** Draw the result as a 1200 x 630 PNG, the same size as the social preview image. */
  image(r: ShareableResult): Promise<Blob | null> {
    const rtl = this.i18n.dir() === 'rtl';
    const t = (k: Parameters<I18nService['t']>[0]) => this.i18n.t(k);
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 630;
    const ctx = canvas.getContext('2d');
    if (!ctx) return Promise.resolve(null);

    const sans = '"Manrope","Segoe UI","Noto Sans Arabic","Noto Sans Devanagari",system-ui,sans-serif';
    const bg = ctx.createLinearGradient(0, 0, 1200, 630);
    bg.addColorStop(0, '#170a1c');
    bg.addColorStop(0.55, '#2a0f28');
    bg.addColorStop(1, '#3a1631');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 1200, 630);
    const glow = ctx.createRadialGradient(950, 90, 20, 950, 90, 520);
    glow.addColorStop(0, 'rgba(217,178,92,0.30)');
    glow.addColorStop(1, 'rgba(217,178,92,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, 1200, 630);

    ctx.direction = rtl ? 'rtl' : 'ltr';
    ctx.textAlign = rtl ? 'right' : 'left';
    const x0 = rtl ? 1120 : 80;
    ctx.fillStyle = '#f0d68c';
    ctx.font = `700 34px ${sans}`;
    ctx.fillText(t('res.label'), x0, 100);

    const cells: [string, string, string][] = [
      [t('res.download'), fmtMbps(r.down), t('unit.mbps')],
      [t('res.upload'), fmtMbps(r.up), t('unit.mbps')],
      [t('res.ping'), String(Math.round(r.ping)), t('unit.ms')],
      [t('res.jitter'), r.jitter.toFixed(1), t('unit.ms')],
    ];
    cells.forEach(([label, value, unit], i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const w = 480;
      const x = rtl ? 1120 - col * (w + 40) - w : 80 + col * (w + 40);
      const y = 160 + row * 200;
      ctx.fillStyle = 'rgba(255,255,255,0.07)';
      ctx.strokeStyle = 'rgba(255,255,255,0.16)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(x, y, w, 168, 28);
      ctx.fill();
      ctx.stroke();
      const tx = rtl ? x + w - 32 : x + 32;
      ctx.fillStyle = '#cdbfd4';
      ctx.font = `600 28px ${sans}`;
      ctx.fillText(label, tx, y + 52);
      ctx.fillStyle = '#f5ecf7';
      ctx.font = `800 80px ${sans}`;
      ctx.fillText(value, tx, y + 130);
      const vw = ctx.measureText(value).width;
      ctx.fillStyle = '#e3bd68';
      ctx.font = `700 30px ${sans}`;
      ctx.fillText(unit, rtl ? tx - vw - 14 : tx + vw + 14, y + 130);
    });

    ctx.fillStyle = '#cdbfd4';
    ctx.font = `600 26px ${sans}`;
    // The domain and the date go at opposite ends, so mixed text direction cannot scramble them.
    const date = new Date(r.at).toLocaleString(this.i18n.lang(), { dateStyle: 'medium', timeStyle: 'short' });
    ctx.direction = 'ltr';
    ctx.textAlign = rtl ? 'right' : 'left';
    ctx.fillText('thakurg.com', x0, 590);
    ctx.direction = rtl ? 'rtl' : 'ltr';
    ctx.textAlign = rtl ? 'left' : 'right';
    ctx.fillText(date, rtl ? 80 : 1120, 590);

    return new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'));
  }

  async copy(r: ShareableResult): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(`${this.text(r)} ${this.url()}`);
      return true;
    } catch {
      return false;
    }
  }

  async download(r: ShareableResult): Promise<void> {
    const blob = await this.image(r);
    if (!blob) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'speed-test.png';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  /** Open the device share sheet, with the result image attached when the device allows files. */
  async nativeShare(r: ShareableResult): Promise<boolean> {
    const data: ShareData = { title: this.i18n.t('share.title'), text: this.text(r), url: this.url() };
    try {
      const blob = await this.image(r);
      if (blob) {
        const file = new File([blob], 'speed-test.png', { type: 'image/png' });
        if (navigator.canShare?.({ files: [file] })) data.files = [file];
      }
      await navigator.share(data);
      return true;
    } catch (e) {
      return (e as Error).name === 'AbortError'; // the person closed the share sheet
    }
  }

  /** Links for the channels that do not have a native share sheet. */
  links(r: ShareableResult): { id: string; labelKey: 'share.whatsapp' | 'share.facebook' | 'share.x' | 'share.telegram'; href: string }[] {
    const url = encodeURIComponent(this.url());
    const text = encodeURIComponent(this.text(r));
    return [
      { id: 'whatsapp', labelKey: 'share.whatsapp', href: `https://wa.me/?text=${text}%20${url}` },
      { id: 'facebook', labelKey: 'share.facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${url}&quote=${text}` },
      { id: 'x', labelKey: 'share.x', href: `https://twitter.com/intent/tweet?text=${text}&url=${url}` },
      { id: 'telegram', labelKey: 'share.telegram', href: `https://t.me/share/url?url=${url}&text=${text}` },
    ];
  }

  // #endregion
}
