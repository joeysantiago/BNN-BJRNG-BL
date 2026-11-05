import { ProfileDetails, ProfileLimits } from '../../core/models/auth.model';

/** The server's answer shown under a form of the profile page. */
export interface ProfileNotice {
  text: string;
  error: boolean;
}

/** The form of the profile page that is being saved. */
export type ProfileForm = 'details' | 'password' | 'photo' | 'address' | 'delete';

/** One field of the contact and company form: the ProfileDetails property it edits, its label and the limit of the API that caps its length. */
export interface DetailField {
  type: string;
  label: string;
  autocomplete: string;
  name: keyof ProfileDetails;
  limit: keyof ProfileLimits;
}
