// Tiny in-memory cache keyed by string, storing the in-flight/resolved
// promise so concurrent callers within the TTL window share one upstream
// request instead of each firing their own. This keeps us comfortably under
// CoinGecko's free-tier rate limit even if several browser tabs poll at once.
const store = new Map();

export function withCache(key, ttlMs, fetcher) {
  const now = Date.now();
  const hit = store.get(key);
  if (hit && now - hit.time < ttlMs) {
    return hit.promise;
  }

  const promise = Promise.resolve()
    .then(fetcher)
    .catch((err) => {
      store.delete(key); // don't cache failures - let the next call retry
      throw err;
    });

  store.set(key, { time: now, promise });
  return promise;
}
