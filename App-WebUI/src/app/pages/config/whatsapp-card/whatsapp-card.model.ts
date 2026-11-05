/** The site's WhatsApp Business account (GET /admin/whatsapp). The access token is never sent back: hasAccessToken says one is saved. */
export interface WhatsAppAccount {
  enabled: boolean;
  apiVersion: string;
  templateName: string;
  phoneNumberId: string;
  hasAccessToken: boolean;
  templateLanguage: string;
  businessAccountId: string | null;
}

/** The server's answer shown under the form. */
export interface WhatsAppNotice {
  text: string;
  error: boolean;
}
