import { Lang } from '../../../core/site';
import { Router, RouterLink } from '@angular/router';
import { KhataIcon } from '../ui/khata-icon/khata-icon';
import { AuthService } from '../../../core/auth.service';
import { I18nService } from '../../../core/i18n.service';
import { ThemeService } from '../../../core/theme.service';
import { ThemeMode } from '../../../core/models/theme.model';
import { KhataAvatar } from '../ui/khata-avatar/khata-avatar';
import { InstallService } from '../../../core/install.service';
import { KhataUiService } from '../../../core/khata-ui.service';
import { KhataIconName } from '../../../core/models/khata.model';
import { Component, effect, inject, signal } from '@angular/core';
import { KhataStateService } from '../../../core/khata-state.service';

/** /khata/app/profile: the account (name, language and password are changed on the shared /profile page), appearance, language, install on the phone, log out. */
@Component({
  selector: 'app-khata-profile',
  templateUrl: './khata-profile.html',
  styleUrl: './khata-profile.scss',
  imports: [RouterLink, KhataIcon, KhataAvatar],
})

export class KhataProfile {
  private readonly router = inject(Router);
  protected readonly iosHelp = signal(false);
  private readonly ui = inject(KhataUiService);
  protected readonly auth = inject(AuthService);
  protected readonly i18n = inject(I18nService);
  protected readonly theme = inject(ThemeService);
  private readonly state = inject(KhataStateService);
  protected readonly install = inject(InstallService);
  protected readonly modes: ThemeMode[] = ['light', 'dark', 'system'];
  protected readonly modeIcons: Record<ThemeMode, KhataIconName> = { light: 'sun', dark: 'moon', system: 'monitor' };

  constructor() {
    effect(() => this.state.screen(this.i18n.t('khata.p.title')));
  }

  // #region Public Methods

  setLang(lang: Lang): void {
    this.i18n.set(lang);
  }

  async logout(): Promise<void> {
    if (!(await this.ui.confirm(this.i18n.t('khata.p.logoutTitle'))))
      return;
    await this.auth.logout();
    void this.router.navigateByUrl('/khata', { replaceUrl: true });
  }

  // #endregion
}
