/** A link a toast offers next to its text (for example "Create an account"). */
export interface ToastLink {
  path: string;
  label: string;
  query?: Record<string, string>;
}

/** One short message at the bottom of the screen: the server's answer or a page's notice; an error reads as an alert. */
export interface Toast {
  id: number;
  text: string;
  error: boolean;
  link?: ToastLink;
}
