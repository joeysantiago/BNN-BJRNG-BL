import { FeatureInfo } from '../../../core/models/app-settings.model';

/** The form of the For me tab that is being saved. */
export type AccountForm = 'language' | 'password' | 'features';

/** The server's answer shown under a form of the For me tab. */
export interface AccountNotice {
  text: string;
  error: boolean;
  form: AccountForm;
}

/** A group of options the user may switch off for themselves (header, speed test, YouTube, audio players). */
export interface OwnGroup {
  id: string;
  label: string;
  items: FeatureInfo[];
}
