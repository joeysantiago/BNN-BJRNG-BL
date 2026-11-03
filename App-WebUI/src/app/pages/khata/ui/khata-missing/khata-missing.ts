import { RouterLink } from '@angular/router';
import { KhataIcon } from '../khata-icon/khata-icon';
import { Component, inject, input } from '@angular/core';
import { I18nService } from '../../../../core/i18n.service';
import { KhataEmptyArt } from '../khata-empty-art/khata-empty-art';

/** "Page not found" inside SnapKhata: an unknown address, or a book, party or entry that does not exist (the API's message is shown). */
@Component({
  selector: 'app-khata-missing',
  templateUrl: './khata-missing.html',
  imports: [RouterLink, KhataIcon, KhataEmptyArt],
})

export class KhataMissing {
  readonly message = input('');
  protected readonly i18n = inject(I18nService);
}
