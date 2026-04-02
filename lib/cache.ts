type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

const store = new Map<string, CacheEntry<unknown>>();

export function getCache<T>(key: string): T | null {
  const entry = store.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    store.delete(key);
    return null;
  }
  return entry.value as T;
}

export function setCache<T>(key: string, value: T, ttlMs: number) {
  store.set(key, {
    value,
    expiresAt: Date.now() + ttlMs,
  });
}

export async function getOrSetCache<T>(key: string, ttlMs: number, producer: () => Promise<T>) {
  const cached = getCache<T>(key);
  if (cached !== null) {
    return cached;
  }
  const value = await producer();
  setCache(key, value, ttlMs);
  return value;
}
