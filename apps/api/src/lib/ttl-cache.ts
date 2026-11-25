/**
 * A tiny in-process cache for hot public reads. Two things make it fast under load:
 * entries live a couple of seconds, and identical requests that arrive while one is loading share
 * that single load (so 100 spectators refreshing a live match cost one database read, not 100).
 */
export function ttlCache<T>(ttlMs: number, maxEntries = 500) {
  const store = new Map<string, { expires: number; value: T }>();
  const loading = new Map<string, Promise<T>>();

  return {
    async get(key: string, load: () => Promise<T>): Promise<T> {
      const hit = store.get(key);
      if (hit && hit.expires > Date.now()) return hit.value;
      const running = loading.get(key);
      if (running) return running;
      const p = load()
        .then((value) => {
          this.set(key, value);
          return value;
        })
        .finally(() => loading.delete(key));
      loading.set(key, p);
      return p;
    },
    set(key: string, value: T) {
      if (store.size >= maxEntries) store.delete(store.keys().next().value as string); // oldest first
      store.set(key, { expires: Date.now() + ttlMs, value });
    },
    delete(key: string) {
      store.delete(key);
    },
  };
}
