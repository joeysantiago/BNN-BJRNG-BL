/** The server's answer shown under a form of the profile page. */
export interface ProfileNotice {
  text: string;
  error: boolean;
}

/** The form of the profile page that is being saved. */
export type ProfileForm = 'details' | 'password' | 'photo';
