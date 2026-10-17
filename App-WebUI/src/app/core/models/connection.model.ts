export interface ConnectionInfo {
  ip: string | null;
  isp: string | null;
  ipv4: string | null;
  ipv6: string | null;
  location: string | null;
  testServer: string | null;
}

/** The part of the browser's Network Information API that this site reads. Not available in Safari or Firefox. */
export interface NetworkInformation extends EventTarget {
  type?: string;
  effectiveType?: string;
}

export interface NetworkType {
  type: string | null;
  effective: string | null;
}

/** Shape of https://ipwho.is/. Every field is optional because the service may add or drop fields. */
export interface IpLookup {
  ip?: string;
  city?: string;
  region?: string;
  country?: string;
  success?: boolean;
  connection?: { isp?: string; org?: string };
}
