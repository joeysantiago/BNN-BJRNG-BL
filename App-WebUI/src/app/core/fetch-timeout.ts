/** fetch that gives up after `ms` milliseconds. Rejects on timeout and network errors. */
export async function fetchTimeout(url: string, ms: number, init: RequestInit = {}): Promise<Response> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), ms);
  try {
    return await fetch(url, { cache: 'no-store', ...init, signal: ctl.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchJson<T>(url: string, ms: number): Promise<T> {
  const res = await fetchTimeout(url, ms);
  if (!res.ok)
    throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as T;
}
