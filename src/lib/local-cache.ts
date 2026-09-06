/** Chhota localStorage cache — mobile par list/thumbnails turant dikhein. */
const PREFIX = "amanx_cache_";

export function readCache<T>(key: string, maxAgeMs: number): T | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as { t: number; v: T };
    if (!parsed || Date.now() - parsed.t > maxAgeMs) return undefined;
    return parsed.v;
  } catch {
    return undefined;
  }
}

export function writeCache<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify({ t: Date.now(), v: value }));
  } catch {
    /* storage full ya blocked — ignore */
  }
}
