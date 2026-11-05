import { Lang } from '../../../../core/site';
import { TaskIcon } from '../task-icon/task-icon';
import { I18nService } from '../../../../core/i18n.service';
import { ThemeService } from '../../../../core/theme.service';
import { InstallService } from '../../../../core/install.service';
import { Skin, ThemeMode } from '../../../../core/models/theme.model';
import { TasksStateService } from '../../../../core/tasks-state.service';
import { Component, ElementRef, ViewEncapsulation, inject, signal } from '@angular/core';

const MODE_ICONS: Record<ThemeMode, string> = { light: 'sun', dark: 'moon', system: 'monitor' };

/**
 * The language and theme menus of the My Tasks top bar, as in SnapKhata: the language menu lists English, Hindi and Arabic; the theme menu has
 * Light / Dark / System and the four styles (Glassmorphism, Claymorphism, Skeuomorphism, Neumorphism). The choices are the site's own (ThemeService,
 * I18nService), so every app keeps the same look. Before the theme menu sits the Install button, shown while the app is not installed. Its styles also carry the four style token sets and the dropdown look of the app.
 */
@Component({
  selector: 'app-tasks-menus',
  imports: [TaskIcon],
  templateUrl: './tasks-menus.html',
  styleUrl: './tasks-menus.scss',
  encapsulation: ViewEncapsulation.None,
  host: { class: 'menus', '(document:click)': 'outside($event)', '(document:keydown.escape)': 'menu.set(null)' },
})

export class TasksMenus {
  protected readonly modeIcons = MODE_ICONS;
  private readonly host = inject(ElementRef);
  protected readonly i18n = inject(I18nService);
  protected readonly theme = inject(ThemeService);
  private readonly state = inject(TasksStateService);
  protected readonly install = inject(InstallService);
  protected readonly menu = signal<'lang' | 'theme' | null>(null);
  protected readonly modes: ThemeMode[] = ['light', 'dark', 'system'];

  // #region Public Methods

  setSkin(skin: Skin): void {
    this.theme.set(skin);
  }

  setLang(lang: Lang): void {
    this.i18n.set(lang);
    this.menu.set(null);
  }

  outside(event: Event): void {
    if (this.menu() && !(this.host.nativeElement as HTMLElement).contains(event.target as Node))
      this.menu.set(null);
  }

  setMode(mode: ThemeMode): void {
    this.theme.setMode(mode);
  }

  /** Opens the native install prompt; on iPhone and iPad, where install is manual, shows how to add the app to the home screen. */
  async installApp(): Promise<void> {
    if (this.install.canPrompt())
      await this.install.prompt();
    else
      this.state.toast(this.i18n.t('tasks.set.installHint'));
  }

  toggle(menu: 'lang' | 'theme'): void {
    this.menu.set(this.menu() === menu ? null : menu);
  }

  // #endregion
}
